# Chat Features Implementation Guide

## Overview

This document explains the implementation of typing indicators, pre-typing preview, and message delivery/read receipts for frontend integration.

---

## 📊 Firebase Schema

### Conversation Structure
```javascript
conversations/
  {conversationId}/
    // Agent typing indicator
    typing/
      {agentId}/
        isTyping: boolean
        timestamp: ServerValue.TIMESTAMP
    
    // Visitor typing with preview
    visitorTyping/
      isTyping: boolean
      preview: string          // Pre-typing preview text
      timestamp: ServerValue.TIMESTAMP
    
    // Messages with receipts
    messages/
      {messageId}/
        id: string
        content: string
        authorType: "visitor" | "agent" | "system"
        createdAt: ISO timestamp
        deliveredAt: ISO timestamp    // When message was delivered
        readAt: ISO timestamp          // When message was read
        deliveryTimestamp: ServerValue.TIMESTAMP
        readTimestamp: ServerValue.TIMESTAMP
```

---

## 🔔 Feature 1: Typing Indicators

### Agent Typing Indicator

**Endpoint:** `POST /v1/conversations/:conversationId/typing/agent`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "isTyping": true
}
```

**Frontend Implementation (Agent Dashboard):**
```javascript
let typingTimeout;

function handleAgentTyping(conversationId, isTyping) {
  // Send typing status to backend
  fetch(`/v1/conversations/${conversationId}/typing/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${agentToken}`
    },
    body: JSON.stringify({ isTyping })
  });

  // Auto-clear after 3 seconds
  if (isTyping) {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      handleAgentTyping(conversationId, false);
    }, 3000);
  }
}

// Usage in message input
messageInput.addEventListener('input', () => {
  handleAgentTyping(conversationId, true);
});

messageInput.addEventListener('blur', () => {
  handleAgentTyping(conversationId, false);
});
```

**Firebase Listener (Visitor Widget):**
```javascript
import { getDatabase, ref, onValue } from 'firebase/database';

const db = getDatabase();
const typingRef = ref(db, `conversations/${conversationId}/typing`);

onValue(typingRef, (snapshot) => {
  const typingAgents = snapshot.val();
  
  if (typingAgents && Object.keys(typingAgents).length > 0) {
    // Show typing indicator
    document.getElementById('typing-indicator').style.display = 'block';
  } else {
    // Hide typing indicator
    document.getElementById('typing-indicator').style.display = 'none';
  }
});
```

---

## 📝 Feature 2: Pre-Typing Preview

### Visitor Pre-Typing Preview

**Endpoint:** `POST /v1/conversations/:conversationId/typing/visitor`

**Authentication:** Not required (public endpoint)

**Request Body:**
```json
{
  "isTyping": true,
  "preview": "Hello, I need help with..."
}
```

**Frontend Implementation (Visitor Widget):**
```javascript
let typingPreviewTimeout;

function updateVisitorTyping(conversationId, inputValue) {
  const isTyping = inputValue.length > 0;
  
  // Send typing status with preview
  fetch(`/v1/conversations/${conversationId}/typing/visitor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      isTyping,
      preview: inputValue.substring(0, 100) // Limit preview length
    })
  });

  // Auto-clear after 2 seconds of inactivity
  clearTimeout(typingPreviewTimeout);
  typingPreviewTimeout = setTimeout(() => {
    fetch(`/v1/conversations/${conversationId}/typing/visitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isTyping: false })
    });
  }, 2000);
}

// Usage in visitor message input
visitorInput.addEventListener('input', (e) => {
  updateVisitorTyping(conversationId, e.target.value);
});

// Clear on blur or send
visitorInput.addEventListener('blur', () => {
  fetch(`/v1/conversations/${conversationId}/typing/visitor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isTyping: false })
  });
});
```

**Firebase Listener (Agent Dashboard):**
```javascript
import { getDatabase, ref, onValue } from 'firebase/database';

const db = getDatabase();
const visitorTypingRef = ref(db, `conversations/${conversationId}/visitorTyping`);

onValue(visitorTypingRef, (snapshot) => {
  const typingData = snapshot.val();
  
  if (typingData && typingData.isTyping) {
    // Show typing indicator with preview
    const previewText = typingData.preview || '';
    document.getElementById('typing-preview').innerHTML = `
      <div class="typing-indicator">
        <span>Visitor is typing...</span>
        ${previewText ? `<span class="preview">"${previewText}"</span>` : ''}
      </div>
    `;
  } else {
    // Hide typing indicator
    document.getElementById('typing-preview').innerHTML = '';
  }
});
```

---

## ✅ Feature 3: Delivery & Read Receipts

### Message Structure in Firebase

When messages are synced to Firebase, they include:
- `createdAt` - When message was created
- `deliveredAt` - When message was delivered (set when recipient connects)
- `readAt` - When message was read (set when recipient views)

### Update Message Status (Single Message)

**Endpoint:** `PATCH /v1/conversations/:conversationId/messages/:messageId/status`

**Authentication:** Not required

**Request Body:**
```json
{
  "status": "delivered"  // or "read"
}
```

### Bulk Update Message Status

**Endpoint:** `PATCH /v1/conversations/:conversationId/messages/bulk-status`

**Authentication:** Not required

**Request Body:**
```json
{
  "messageIds": ["msg-id-1", "msg-id-2", "msg-id-3"],
  "status": "read"
}
```

### Frontend Implementation

#### Mark Message as Delivered (When message appears on screen)

```javascript
async function markMessageAsDelivered(conversationId, messageId) {
  await fetch(`/v1/conversations/${conversationId}/messages/${messageId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'delivered'
    })
  });
}

// Mark as delivered when message is received
const messagesRef = ref(db, `conversations/${conversationId}/messages`);
onValue(messagesRef, (snapshot) => {
  snapshot.forEach((childSnapshot) => {
    const message = childSnapshot.val();
    
    // If message is from other party and not yet delivered
    if (message.authorType !== currentUserType && !message.deliveredAt) {
      markMessageAsDelivered(conversationId, message.id);
    }
  });
});
```

#### Mark Message as Read (When message is viewed)

```javascript
async function markMessageAsRead(conversationId, messageId) {
  await fetch(`/v1/conversations/${conversationId}/messages/${messageId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'read'
    })
  });
}

// Using Intersection Observer to detect when message is in viewport
const observeMessage = (messageElement, messageId) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        markMessageAsRead(conversationId, messageId);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  observer.observe(messageElement);
};
```

#### Bulk Mark All as Read (When conversation is opened)

```javascript
async function markAllMessagesAsRead(conversationId, unreadMessageIds) {
  if (unreadMessageIds.length === 0) return;

  await fetch(`/v1/conversations/${conversationId}/messages/bulk-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messageIds: unreadMessageIds,
      status: 'read'
    })
  });
}

// Usage: Mark all unread messages as read when conversation is opened
function openConversation(conversationId) {
  const unreadMessages = messages.filter(msg => 
    msg.authorType !== currentUserType && !msg.readAt
  );
  
  if (unreadMessages.length > 0) {
    const unreadIds = unreadMessages.map(msg => msg.id);
    markAllMessagesAsRead(conversationId, unreadIds);
  }
}
```

### Display Message Status (Sender View)

```javascript
function getMessageStatusIcon(message) {
  if (message.authorType !== 'agent') return ''; // Only show for sent messages
  
  if (message.readAt) {
    return '✓✓ Read'; // Double check, blue/colored
  } else if (message.deliveredAt) {
    return '✓✓ Delivered'; // Double check, gray
  } else {
    return '✓ Sent'; // Single check
  }
}

// Listen for status updates in Firebase
const messageRef = ref(db, `conversations/${conversationId}/messages/${messageId}`);
onValue(messageRef, (snapshot) => {
  const message = snapshot.val();
  const statusElement = document.getElementById(`status-${messageId}`);
  statusElement.innerHTML = getMessageStatusIcon(message);
});
```

---

## 🎨 Complete Example: React Component

### Agent Dashboard Chat Component

```jsx
import { useState, useEffect, useRef } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';

function AgentChatView({ conversationId, agentToken }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [visitorTyping, setVisitorTyping] = useState(null);
  const typingTimeoutRef = useRef(null);
  const db = getDatabase();

  // Listen for messages with status
  useEffect(() => {
    const messagesRef = ref(db, `conversations/${conversationId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const msgs = [];
      snapshot.forEach((child) => {
        msgs.push({ id: child.key, ...child.val() });
      });
      msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(msgs);

      // Mark agent's unread messages as read
      const unreadVisitorMessages = msgs.filter(
        msg => msg.authorType === 'visitor' && !msg.readAt
      );
      if (unreadVisitorMessages.length > 0) {
        markMessagesAsRead(unreadVisitorMessages.map(m => m.id));
      }
    });

    return () => unsubscribe();
  }, [conversationId]);

  // Listen for visitor typing preview
  useEffect(() => {
    const typingRef = ref(db, `conversations/${conversationId}/visitorTyping`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      setVisitorTyping(snapshot.val());
    });

    return () => unsubscribe();
  }, [conversationId]);

  // Handle agent typing
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    
    // Send typing indicator
    fetch(`/v1/conversations/${conversationId}/typing/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agentToken}`
      },
      body: JSON.stringify({ isTyping: true })
    });

    // Auto-clear typing after 3 seconds
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      fetch(`/v1/conversations/${conversationId}/typing/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${agentToken}`
        },
        body: JSON.stringify({ isTyping: false })
      });
    }, 3000);
  };

  const markMessagesAsRead = async (messageIds) => {
    await fetch(`/v1/conversations/${conversationId}/messages/bulk-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds, status: 'read' })
    });
  };

  const renderMessageStatus = (msg) => {
    if (msg.authorType !== 'agent') return null;
    
    if (msg.readAt) {
      return <span className="status read">✓✓</span>;
    } else if (msg.deliveredAt) {
      return <span className="status delivered">✓✓</span>;
    } else {
      return <span className="status sent">✓</span>;
    }
  };

  return (
    <div className="chat-view">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.authorType}`}>
            <div className="content">{msg.content}</div>
            <div className="meta">
              <span className="time">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </span>
              {renderMessageStatus(msg)}
            </div>
          </div>
        ))}
        
        {visitorTyping?.isTyping && (
          <div className="typing-indicator">
            <span>Visitor is typing...</span>
            {visitorTyping.preview && (
              <span className="preview">"{visitorTyping.preview}"</span>
            )}
          </div>
        )}
      </div>

      <input
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Type a message..."
      />
    </div>
  );
}
```

### Visitor Widget Component

```jsx
import { useState, useEffect, useRef } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';

function VisitorWidget({ conversationId }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [agentTyping, setAgentTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const db = getDatabase();

  // Listen for messages
  useEffect(() => {
    const messagesRef = ref(db, `conversations/${conversationId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const msgs = [];
      snapshot.forEach((child) => {
        const message = { id: child.key, ...child.val() };
        msgs.push(message);

        // Mark agent messages as delivered when received
        if (message.authorType === 'agent' && !message.deliveredAt) {
          markAsDelivered(message.id);
        }

        // Mark as read when visible
        if (message.authorType === 'agent' && !message.readAt) {
          setTimeout(() => markAsRead(message.id), 1000);
        }
      });
      msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [conversationId]);

  // Listen for agent typing
  useEffect(() => {
    const typingRef = ref(db, `conversations/${conversationId}/typing`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      const typingData = snapshot.val();
      setAgentTyping(typingData && Object.keys(typingData).length > 0);
    });

    return () => unsubscribe();
  }, [conversationId]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    
    // Send typing preview
    fetch(`/v1/conversations/${conversationId}/typing/visitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isTyping: true,
        preview: e.target.value.substring(0, 100)
      })
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      fetch(`/v1/conversations/${conversationId}/typing/visitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: false })
      });
    }, 2000);
  };

  const markAsDelivered = async (messageId) => {
    await fetch(`/v1/conversations/${conversationId}/messages/${messageId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'delivered' })
    });
  };

  const markAsRead = async (messageId) => {
    await fetch(`/v1/conversations/${conversationId}/messages/${messageId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' })
    });
  };

  return (
    <div className="visitor-widget">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.authorType}`}>
            {msg.content}
          </div>
        ))}
        
        {agentTyping && (
          <div className="typing-indicator">Agent is typing...</div>
        )}
      </div>

      <input
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Type a message..."
      />
    </div>
  );
}
```

---

## 📋 API Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/v1/conversations/:id/typing/agent` | POST | ✅ | Agent typing indicator |
| `/v1/conversations/:id/typing/visitor` | POST | ❌ | Visitor typing + preview |
| `/v1/conversations/:id/messages/:msgId/status` | PATCH | ❌ | Update single message status |
| `/v1/conversations/:id/messages/bulk-status` | PATCH | ❌ | Bulk update message status |

---

## ⚡ Best Practices

1. **Typing Indicators**: Auto-clear after 2-3 seconds of inactivity
2. **Pre-typing Preview**: Limit preview text to 100 characters
3. **Delivery Status**: Mark as delivered when message appears in UI
4. **Read Status**: Mark as read when message is in viewport for 1+ seconds
5. **Bulk Operations**: Use bulk update when marking multiple messages as read
6. **Privacy**: Consider privacy settings for pre-typing preview

---

## 🔧 Database Schema

The Event entity includes:
- `deliveredAt`: Timestamp when message was delivered
- `readAt`: Timestamp when message was read

Both fields are nullable and automatically synced between MySQL and Firebase.

---

## ✅ Testing Checklist

- [ ] Agent typing indicator shows in visitor widget
- [ ] Visitor typing indicator shows in agent dashboard
- [ ] Pre-typing preview displays visitor's text before sending
- [ ] Messages marked as delivered when received
- [ ] Messages marked as read when viewed
- [ ] Bulk read receipts work when opening conversation
- [ ] Status indicators update in real-time
- [ ] Typing indicators auto-clear after timeout

---

**Implementation Date:** January 13, 2026
