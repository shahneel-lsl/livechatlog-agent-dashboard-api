# 🚨 Conversation Assignment Issue Report

**Generated:** January 21, 2026  
**Project:** LiveChatLog Dashboard API  
**Environment:** Google Cloud Run (Production)  
**Service URL:** https://livechatlog-dashboard-api-cdhl2b4yfq-uc.a.run.app

---

## 📋 Executive Summary

**Issue:** Conversations are **NOT being assigned to agents** automatically  
**Root Cause:** **No eligible agents available** due to agents being logged out/offline  
**Impact:** All incoming conversations remain in PENDING status and never get assigned to agents

---

## 🔍 Investigation Findings

### 1. Cloud Run Logs Analysis (Last 24 Hours)

#### ❌ Critical Errors Found:

```
[2026-01-20 19:00:03] WARN [AgentAssignmentService] 
No eligible agents found. Criteria: online, accepting chats, in group Support Team, with available slots

[2026-01-20 19:00:04] WARN [AgentAssignmentService] 
No available agent found for conversation 337ab518-1d85-4a27-9119-9c3e6f081802

[2026-01-20 19:00:04] WARN [ChatService] 
Agent assignment failed for conversation 337ab518-1d85-4a27-9119-9c3e6f081802: No available agent at the moment
```

#### ⚠️ Session Timeout Issue:

```
[2026-01-20 19:00:00] LOG [AgentSchedulerService] 
Session timeout: 5 agents logged out
```

### 2. Assignment Flow Analysis

The system attempted to assign conversation `337ab518-1d85-4a27-9119-9c3e6f081802`:

1. ✅ **Step 1:** Conversation created successfully
2. ✅ **Step 2:** Auto-assignment triggered after 3 seconds
3. ✅ **Step 3:** Assignment service started
4. ❌ **Step 4:** **FAILED** - No eligible agents found in "Support Team" group
5. ❌ **Step 5:** Conversation remains in PENDING status

---

## 🎯 Root Causes Identified

### Primary Cause: No Active Agents
The assignment fails because agents must meet **ALL** these criteria:

1. ✅ Be assigned to the correct group ("Support Team")
2. ❌ Status = `ONLINE` ← **FAILING**
3. ❌ `acceptingChats` = `true` ← **FAILING**
4. ✅ Current active chats < `maxConcurrentChats`
5. ✅ Not deleted (`isDeleted` = false)

### Secondary Cause: Agent Session Timeouts
The logs show **5 agents were automatically logged out** due to session timeout:
- Session timeout check runs every minute
- Agents inactive for the configured duration are automatically logged out
- This changes their status from `ONLINE` to `OFFLINE`

---

## 🔧 Solution Strategies

### Option 1: Quick Fix - Manually Set Agents Online (Immediate)

Run these SQL commands to manually activate agents:

```sql
-- 1. Check current agent status
SELECT id, name, email, status, acceptingChats, maxConcurrentChats 
FROM agents 
WHERE isDeleted = 0;

-- 2. Set all agents to ONLINE and accepting chats
UPDATE agents 
SET status = 'online', 
    acceptingChats = 1 
WHERE isDeleted = 0;

-- 3. Verify the changes
SELECT id, name, email, status, acceptingChats, maxConcurrentChats 
FROM agents 
WHERE isDeleted = 0;
```

### Option 2: Use the API to Update Agent Status

```bash
# Get authentication token first
curl -X POST https://livechatlog-dashboard-api-cdhl2b4yfq-uc.a.run.app/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-admin-email@example.com",
    "password": "your-password"
  }'

# Update each agent status
curl -X PATCH https://livechatlog-dashboard-api-cdhl2b4yfq-uc.a.run.app/v1/agents/{AGENT_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "acceptingChats": true
  }'
```

### Option 3: Review and Adjust Session Timeout Settings

Check your current session timeout configuration:

**File:** `src/agents/agent-scheduler.service.ts`

```typescript
// Current timeout settings (likely needs adjustment)
const SESSION_TIMEOUT_MINUTES = 30; // Example - check actual value
```

**Recommendation:** 
- Increase session timeout to avoid auto-logout during normal work hours
- Or disable auto-logout entirely if agents should stay logged in

### Option 4: Implement Proper Agent Login System

Ensure agents are properly logging in through:
- Agent Dashboard Login: Agents must authenticate
- Session Keep-Alive: Implement heartbeat/ping mechanism
- Status Management: Agents should explicitly set their availability

---

## 📊 Detailed Logs Inspection Commands

### 1. Check Assignment Logs in Database

```sql
-- View recent assignment failures
SELECT * FROM assignment_logs 
WHERE level = 'ERROR' OR level = 'WARNING'
ORDER BY createdAt DESC 
LIMIT 50;

-- View assignment attempts for specific conversation
SELECT * FROM assignment_logs 
WHERE conversationId = '337ab518-1d85-4a27-9119-9c3e6f081802'
ORDER BY createdAt ASC;

-- Get statistics by failure type
SELECT type, COUNT(*) as count 
FROM assignment_logs 
WHERE level IN ('ERROR', 'WARNING') 
AND createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY type 
ORDER BY count DESC;
```

### 2. Check Cloud Run Logs via gcloud

```powershell
# Get recent assignment-related logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=livechatlog-dashboard-api AND severity>=WARNING" --limit=100 --format=json --project=livechat-application-481611 --freshness=1d

# Filter for specific error patterns
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=livechatlog-dashboard-api" --limit=200 --format=table --project=livechat-application-481611 --freshness=1d | Select-String -Pattern "No eligible agents|assignment failed|No available agent"
```

### 3. Use the Logging API Endpoints

The system has built-in logging endpoints:

```bash
# Get assignment issues
curl -X GET "https://livechatlog-dashboard-api-cdhl2b4yfq-uc.a.run.app/v1/logs/issues?limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get summary statistics
curl -X GET "https://livechatlog-dashboard-api-cdhl2b4yfq-uc.a.run.app/v1/logs/summary" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get specific conversation timeline
curl -X GET "https://livechatlog-dashboard-api-cdhl2b4yfq-uc.a.run.app/v1/logs/conversation/337ab518-1d85-4a27-9119-9c3e6f081802" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎯 Recommended Actions (Priority Order)

### Immediate (Do Now):

1. **Check Current Agent Status**
   ```sql
   SELECT COUNT(*) as total_agents,
          SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online,
          SUM(CASE WHEN acceptingChats = 1 THEN 1 ELSE 0 END) as accepting
   FROM agents 
   WHERE isDeleted = 0;
   ```

2. **Activate At Least One Agent**
   ```sql
   UPDATE agents 
   SET status = 'online', acceptingChats = 1 
   WHERE email = 'primary-agent@example.com' 
   AND isDeleted = 0;
   ```

3. **Test Assignment** - Create a new conversation and verify it gets assigned

### Short-term (This Week):

1. Review and adjust session timeout settings
2. Implement agent dashboard notifications for session expiry
3. Add agent login/logout tracking
4. Set up monitoring alerts for "no available agents" warnings

### Long-term (This Month):

1. Implement automatic agent reactivation schedules
2. Add load balancing improvements
3. Create agent availability dashboard
4. Set up automated health checks and alerts

---

## 📱 Monitoring Setup

### Create Alert for Assignment Failures

```powershell
# Google Cloud Monitoring Alert (run this to create an alert)
gcloud alpha monitoring policies create `
  --notification-channels=YOUR_NOTIFICATION_CHANNEL `
  --display-name="LiveChatLog - Assignment Failures" `
  --condition-display-name="No agents available" `
  --condition-filter='resource.type="cloud_run_revision"
    AND resource.labels.service_name="livechatlog-dashboard-api"
    AND textPayload=~"No eligible agents"' `
  --condition-threshold-value=1 `
  --condition-threshold-duration=300s `
  --project=livechat-application-481611
```

---

## 📚 Related Files & Documentation

### Assignment Logic Files:
- [`src/chat/services/agent-assignment.service.ts`](src/chat/services/agent-assignment.service.ts) - Main assignment logic
- [`src/queue/assignment-queue.service.ts`](src/queue/assignment-queue.service.ts) - Queue-based assignment (currently disabled due to no Redis)
- [`src/agents/agent-scheduler.service.ts`](src/agents/agent-scheduler.service.ts) - Session timeout management

### Database Entities:
- [`src/database/mysql/agent.entity.ts`](src/database/mysql/agent.entity.ts) - Agent model
- [`src/database/mysql/conversation.entity.ts`](src/database/mysql/conversation.entity.ts) - Conversation model
- [`src/database/mysql/assignment-log.entity.ts`](src/database/mysql/assignment-log.entity.ts) - Assignment logs

### Documentation:
- [`LOGGING_IMPLEMENTATION.md`](LOGGING_IMPLEMENTATION.md) - Logging system details
- [`AGENT_STATUS_MANAGEMENT.md`](AGENT_STATUS_MANAGEMENT.md) - Agent status guide
- [`README.md`](README.md) - General project documentation

---

## 🔗 Quick Links

- **Cloud Run Console:** https://console.cloud.google.com/run/detail/us-central1/livechatlog-dashboard-api
- **Logs Viewer:** https://console.cloud.google.com/logs/query
- **Cloud SQL Instance:** livechatlog-mysql
- **Project ID:** livechat-application-481611

---

## ✅ Next Steps Checklist

- [ ] Run agent status query to check current state
- [ ] Activate at least one agent manually
- [ ] Test conversation assignment
- [ ] Review session timeout settings
- [ ] Set up monitoring alerts
- [ ] Document agent onboarding process
- [ ] Create agent status dashboard
- [ ] Schedule regular agent status reviews

---

**Report Generated:** January 21, 2026  
**Analyzed By:** GitHub Copilot  
**Status:** Investigation Complete - Action Required
