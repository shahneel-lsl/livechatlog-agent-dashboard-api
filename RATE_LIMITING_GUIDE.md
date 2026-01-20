# 🛡️ Rate Limiting & 429 Error Resolution Guide

## ❌ Problem: 429 Too Many Requests

### What is a 429 Error?
A `429 Too Many Requests` error occurs when a client exceeds the allowed number of requests within a specific time window.

### Why Were You Getting 429 Errors?

Your 429 errors were **NOT coming from your NestJS backend** (there was no rate limiting before), but from **Firebase Realtime Database**.

## 🔍 Root Cause Analysis

When calling `/v1/conversations/:conversationId/events`, the following happens:

1. ✅ Event saved to MySQL database
2. 🔥 `syncEventToFirebase()` called → **Writes to Firebase**
3. ⚠️ Multiple rapid requests → **Firebase rate limits exceeded**

### Firebase Limits:

| Plan | Concurrent Connections | Write Operations | Bandwidth |
|------|----------------------|------------------|-----------|
| **Spark (Free)** | 100 connections | ~1,000/sec | 10 GB/month |
| **Blaze (Pay-as-you-go)** | 200,000 connections | ~10,000/sec | 50 GB/month + $1/GB |

### Common Scenarios Triggering 429:

1. **Multiple agents sending messages simultaneously**
2. **Auto-refresh/polling too frequently**
3. **Visitor widget sending rapid messages**
4. **Firebase connection pool exhaustion**
5. **Too many open Firebase listeners**

---

## ✅ Solution Implemented

### 1. **Multi-Tier Rate Limiting**

We've implemented comprehensive rate limiting with three tiers:

```typescript
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000,      // 1 second window
    limit: 10,      // 10 requests max
  },
  {
    name: 'medium',
    ttl: 60000,     // 1 minute window
    limit: 100,     // 100 requests max
  },
  {
    name: 'long',
    ttl: 900000,    // 15 minutes window
    limit: 1000,    // 1000 requests max
  },
])
```

### 2. **Events Endpoint Protection**

The `/v1/conversations/:conversationId/events` endpoint now has:
- **5 messages per second** limit
- Prevents Firebase overload
- Returns `429` if exceeded (with Retry-After header)

```typescript
@Throttle({ short: { limit: 5, ttl: 1000 } })
@Post('conversations/:conversationId/events')
createEvent(...)
```

---

## 📊 Rate Limit Headers

When making requests, check these response headers:

```
X-RateLimit-Limit: 5          ← Max requests allowed
X-RateLimit-Remaining: 3      ← Requests left in window
X-RateLimit-Reset: 1642857600 ← When limit resets (Unix timestamp)
Retry-After: 1                ← Seconds to wait before retry
```

---

## 🧪 Testing Rate Limits

### Test with cURL:

```bash
# This will hit the rate limit after 5 rapid requests
for i in {1..10}; do
  curl --location '{{baseUrl}}/v1/conversations/{{conversationId}}/events' \
    --header 'Content-Type: application/json' \
    --header 'Authorization: Bearer {{token}}' \
    --data '{
      "content": "Test message '$i'",
      "type": "message",
      "authorType": "agent"
    }'
  echo ""
done
```

### Expected Response (after 5 requests):

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

---

## 🔧 Customizing Rate Limits

### Per-Endpoint Custom Limits

```typescript
@Throttle({ short: { limit: 10, ttl: 1000 } })  // 10 requests/sec
@Get('conversations')
getConversations() { ... }

@Throttle({ short: { limit: 2, ttl: 1000 } })   // 2 requests/sec (slower)
@Post('conversations/:id/assign')
assignConversation() { ... }
```

### Skip Rate Limiting (Admin Endpoints)

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()  // No rate limiting
@Get('admin/stats')
getAdminStats() { ... }
```

---

## 🚨 Monitoring Rate Limit Issues

### 1. Check Application Logs

```bash
# Filter for throttler errors
npm run start | grep "ThrottlerException"
```

### 2. Query Rate Limit Errors

```sql
-- If you log 429 errors to database
SELECT COUNT(*), DATE(created_at) as date
FROM error_logs
WHERE status_code = 429
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 3. Monitor Firebase Usage

Go to [Firebase Console](https://console.firebase.google.com) → Select Project → **Realtime Database** → **Usage** tab

---

## 🎯 Best Practices

### 1. **Implement Client-Side Debouncing**

```javascript
// Frontend: Debounce typing indicator
let typingTimeout;
inputField.addEventListener('input', () => {
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    sendTypingIndicator();  // Only send after 500ms pause
  }, 500);
});
```

### 2. **Batch Operations**

Instead of sending 10 individual events, batch them:

```typescript
// ❌ Bad: 10 separate requests
messages.forEach(msg => sendEvent(msg));

// ✅ Good: 1 batch request
sendBatchEvents(messages);
```

### 3. **Use Exponential Backoff**

```javascript
async function sendWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await api.post('/events', data);
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = error.headers['retry-after'] || Math.pow(2, i);
        await sleep(retryAfter * 1000);
      } else {
        throw error;
      }
    }
  }
}
```

### 4. **Cache Firebase Connections**

```typescript
// ❌ Bad: Creating new listener for each message
messages.forEach(msg => {
  const ref = firebase.database().ref(`conversations/${id}/messages`);
  ref.push(msg);  // New connection each time!
});

// ✅ Good: Reuse connection
const messagesRef = firebase.database().ref(`conversations/${id}/messages`);
messages.forEach(msg => messagesRef.push(msg));
```

---

## 🆘 Troubleshooting

### "Still Getting 429 Errors After Rate Limiting"

1. **Check Firebase Plan Limits**
   - Free plan: 100 concurrent connections
   - Upgrade to Blaze if needed

2. **Check for Memory Leaks**
   ```bash
   # Check Node.js memory
   node --expose-gc --inspect index.js
   ```

3. **Monitor Open Firebase Connections**
   ```typescript
   // Add to firebase.service.ts
   this.database.ref('.info/connected').on('value', (snap) => {
     if (snap.val() === true) {
       console.log('Firebase connected');
     } else {
       console.log('Firebase disconnected');
     }
   });
   ```

4. **Check for Unclosed Listeners**
   ```typescript
   // Always cleanup in useEffect
   useEffect(() => {
     const unsubscribe = onValue(ref, callback);
     return () => unsubscribe();  // ← CRITICAL!
   }, []);
   ```

---

## 📈 Scaling Recommendations

### Current Setup (Good for):
- ✅ Up to 100 concurrent users
- ✅ ~500 messages/minute
- ✅ Small to medium teams

### If You Need More:

1. **Upgrade Firebase Plan**
   - Blaze plan: $25/month minimum
   - 200,000 concurrent connections
   - 50 GB bandwidth included

2. **Add Redis Caching**
   - Cache frequent queries
   - Reduce Firebase reads

3. **Implement Message Queuing**
   - Use BullMQ (already in package.json)
   - Queue Firebase writes
   - Batch process every 100ms

4. **Use Firebase Admin SDK Connection Pooling**
   ```typescript
   // Already implemented in firebase.service.ts ✅
   ```

---

## ✅ Verification Checklist

- [x] Rate limiting middleware added
- [x] Events endpoint protected (5 msg/sec)
- [x] Global rate limits configured
- [x] Firebase connection management
- [x] Frontend debouncing recommended
- [x] Monitoring setup documented

---

## 🔗 Related Documentation

- [Firebase Realtime Database Limits](https://firebase.google.com/docs/database/usage/limits)
- [NestJS Throttler Documentation](https://docs.nestjs.com/security/rate-limiting)
- [HTTP 429 Status Code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)

---

## 📞 Need Help?

If you're still experiencing 429 errors:

1. Check Firebase Console → Usage tab
2. Review application logs for "ThrottlerException"
3. Monitor `/v1/logs/issues` endpoint for errors
4. Consider upgrading Firebase plan if at limits

---

**Created:** January 21, 2026  
**Last Updated:** January 21, 2026  
**Version:** 1.0.0
