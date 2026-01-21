# Firebase Real-Time Chat Implementation Guide

## 🎯 Overview

This guide explains how to implement real-time chat functionality using Firebase Realtime Database, following the LiveChat Inc approach. The system automatically assigns agents to visitors after 3 seconds and enables real-time communication.

---

## 🏗️ Architecture

### Backend Components

1. **FirebaseService** - Manages Firebase Realtime Database operations
2. **AgentAssignmentService** - Handles intelligent agent assignment with validation
3. **ChatService** - Orchestrates chat workflow and syncs with Firebase
4. **Auto-Assignment** - 3-second delay after session creation

### Key Features

✅ Real-time message synchronization via Firebase  
✅ Automatic agent assignment after 3 seconds  
✅ Agent validation (online, accepting chats, in group, under limit)  
✅ Multiple routing strategies (Round Robin, Least Loaded, Sticky)  
✅ System events for assignment/status changes  
✅ Ready for BullMQ integration (assignment function prepared)

---

## 📊 Firebase Data Structure

```
firebase-database/
├── conversations/
│   └── {conversationId}/
│       ├── visitorId: string
│       ├── visitorName: string
│       ├── visitorEmail: string
│       ├── groupId: string
│       ├── status: "pending" | "active" | "resolved" | "closed"
│       ├── assignedAgentId: string (after assignment)
│       ├── assignedAgentName: string (after assignment)
│       ├── assignedAt: ISO timestamp
│       ├── activeThreadId: string
│       ├── createdAt: ISO timestamp
│       ├── updatedAt: Firebase ServerValue.TIMESTAMP
│       ├── lastMessage: {
│       │   content: string
│       │   authorType: "visitor" | "agent" | "system"
│       │   createdAt: ISO timestamp
│       │ }
│       ├── messages/
│       │   └── {messageId}/
│       │       ├── id: string
│       │       ├── threadId: string
│       │       ├── content: string
│       │       ├── authorType: "visitor" | "agent" | "system"
│       │       ├── type: "message" | "system"
│       │       ├── agentId: string (if from agent)
│       │       ├── agentName: string (if from agent)
│       │       ├── createdAt: ISO timestamp
│       │       ├── timestamp: Firebase ServerValue.TIMESTAMP
│       │       └── metadata: object
│       └── typing/
│           └── {agentId}/
│               ├── isTyping: boolean
│               └── timestamp: Firebase ServerValue.TIMESTAMP
├── agents/
│   └── {agentId}/
│       ├── status: "online" | "offline" | "away"
│       ├── lastStatusChange: Firebase ServerValue.TIMESTAMP
│       └── presence/
│           ├── online: boolean
│           └── lastSeen: Firebase ServerValue.TIMESTAMP
```

---

## 🚀 Frontend Implementation

### Step 1: Initialize Chat Session

**Endpoint:** `POST /v1/widget/session` (Public - No Auth)

```javascript
// Initialize chat session
const response = await fetch('http://localhost:3000/v1/widget/session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    groupId: 'group-uuid-optional', // Optional - defaults to default group
    initialMessage: 'Hello, I need help with my order',
    metadata: {
      page: '/products/widget',
      source: 'website',
      userAgent: navigator.userAgent,
    },
  }),
});

const session = await response.json();
console.log(session);
/*
{
  "sessionToken": "visitor-session-uuid",
  "visitorId": "visitor-uuid",
  "conversationId": "conversation-uuid",
  "threadId": "thread-uuid",
  "status": "pending",
  "firebase": {
    "databaseURL": "https://livechat-d6db2-default-rtdb.firebaseio.com",
    "conversationPath": "/conversations/{conversationId}",
    "messagesPath": "/conversations/{conversationId}/messages"
  }
}
*/
```

### Step 2: Initialize Firebase in Frontend

```bash
npm install firebase
```

```javascript
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, onDisconnect } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Get from Firebase Console
  authDomain: "livechat-d6db2.firebaseapp.com",
  databaseURL: "https://livechat-d6db2-default-rtdb.firebaseio.com",
  projectId: "livechat-d6db2",
  storageBucket: "livechat-d6db2.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
```

### Step 3: Listen for Real-Time Updates

```javascript
class ChatWidget {
  constructor(session) {
    this.session = session;
    this.database = getDatabase();
    this.conversationRef = ref(this.database, `conversations/${session.conversationId}`);
    this.messagesRef = ref(this.database, `conversations/${session.conversationId}/messages`);
    
    this.setupListeners();
  }

  setupListeners() {
    // Listen for conversation status changes (agent assignment)
    onValue(this.conversationRef, (snapshot) => {
      const conversation = snapshot.val();
      
      if (conversation.status === 'active' && conversation.assignedAgentId) {
        this.onAgentAssigned(conversation);
      }
      
      this.updateUI(conversation);
    });

    // Listen for new messages in real-time
    onValue(this.messagesRef, (snapshot) => {
      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      
      // Sort by createdAt
      messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      this.displayMessages(messages);
    });

    // Listen for agent typing indicator
    const typingRef = ref(this.database, `conversations/${this.session.conversationId}/typing`);
    onValue(typingRef, (snapshot) => {
      const typingAgents = snapshot.val();
      this.showTypingIndicator(typingAgents);
    });
  }

  onAgentAssigned(conversation) {
    console.log(`Agent ${conversation.assignedAgentName} assigned!`);
    // Show "Agent joined" notification
    this.showNotification(`${conversation.assignedAgentName} has joined the chat`);
  }

  displayMessages(messages) {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = '';
    
    messages.forEach(msg => {
      const messageEl = document.createElement('div');
      messageEl.className = `message message-${msg.authorType}`;
      
      if (msg.authorType === 'system') {
        messageEl.innerHTML = `<div class="system-message">${msg.content}</div>`;
      } else {
        const senderName = msg.authorType === 'agent' ? msg.agentName : 'You';
        messageEl.innerHTML = `
          <div class="message-header">${senderName}</div>
          <div class="message-content">${msg.content}</div>
          <div class="message-time">${new Date(msg.createdAt).toLocaleTimeString()}</div>
        `;
      }
      
      chatContainer.appendChild(messageEl);
    });
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  showTypingIndicator(typingAgents) {
    const typingEl = document.getElementById('typing-indicator');
    
    if (typingAgents && Object.keys(typingAgents).length > 0) {
      typingEl.textContent = 'Agent is typing...';
      typingEl.style.display = 'block';
    } else {
      typingEl.style.display = 'none';
    }
  }
}

// Initialize widget
const session = await initializeSession();
const chatWidget = new ChatWidget(session);
```

### Step 4: Send Messages from Visitor

```javascript
async function sendMessage(content) {
  // Send to backend API
  const response = await fetch(`http://localhost:3000/v1/threads/${session.threadId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // No Authorization header needed for visitor messages
    },
    body: JSON.stringify({
      authorType: 'visitor',
      type: 'message',
      content: content,
      metadata: {
        platform: 'web',
        timestamp: new Date().toISOString()
      }
    })
  });

  const event = await response.json();
  console.log('Message sent:', event);
  
  // Message will automatically appear via Firebase listener
}

// Usage
document.getElementById('send-button').addEventListener('click', () => {
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  
  if (content) {
    sendMessage(content);
    input.value = '';
  }
});
```

### Step 5: Agent Sends Messages

```javascript
// Agent side (with authentication)
async function sendAgentMessage(content, threadId, token) {
  const response = await fetch(`http://localhost:3000/v1/threads/${threadId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // JWT token from agent login
    },
    body: JSON.stringify({
      authorType: 'agent',
      type: 'message',
      content: content
    })
  });

  return await response.json();
}
```

### Step 6: Agent Typing Indicator (Optional)

```javascript
// Agent side - update typing status
let typingTimeout;

function onAgentTyping(conversationId, agentId, isTyping) {
  const typingRef = ref(database, `conversations/${conversationId}/typing/${agentId}`);
  
  if (isTyping) {
    set(typingRef, {
      isTyping: true,
      timestamp: Date.now()
    });
    
    // Auto-clear after 3 seconds
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      remove(typingRef);
    }, 3000);
  } else {
    remove(typingRef);
  }
}

// Usage in message input
messageInput.addEventListener('input', () => {
  onAgentTyping(conversationId, agentId, true);
});
```

---

## ⏱️ Auto-Assignment Flow

### Timeline

1. **T = 0s**: Visitor creates session via `/v1/widget/session`
   - Conversation status: `PENDING`
   - Firebase conversation created
   - Initial message saved

2. **T = 3s**: Auto-assignment triggered
   - System finds available agent
   - Agent validation checks:
     - ✅ Agent is in the group
     - ✅ Agent status is ONLINE
     - ✅ Agent is accepting chats
     - ✅ Agent's active chats < maxConcurrentChats
   - Conversation status: `ACTIVE`
   - Firebase updated with agent info
   - System event added

3. **T > 3s**: Real-time chat enabled
   - Visitor and agent exchange messages
   - All messages synced via Firebase
   - Real-time delivery to both parties

### What Happens If No Agent Available?

- Assignment returns `{ success: false, message: 'No available agent' }`
- Conversation remains in `PENDING` status
- Can retry assignment later or notify visitor
- Consider implementing retry logic or queuing

---

## 🔧 Agent Assignment Validation

The `AgentAssignmentService.assignAgentToConversation()` function validates:

1. **Agent is in the group** - Ensures agent belongs to conversation's group
2. **Agent is ONLINE** - Only online agents receive assignments
3. **Agent is accepting chats** - Respects agent's `acceptingChats` flag
4. **Agent limit not exceeded** - Checks `activeChats < maxConcurrentChats`
5. **Agent not deleted** - Excludes soft-deleted agents

### Routing Strategies

- **Round Robin**: Random selection from eligible agents
- **Least Loaded**: Assigns to agent with most available slots
- **Sticky**: Returns visitor to previous agent (if available)

---

## 🔄 Integrating with BullMQ (Future)

The assignment function is ready for BullMQ integration:

```typescript
// In queue/assignment-queue.service.ts (when Redis is available)
import { AgentAssignmentService } from '../chat/services/agent-assignment.service';

@Injectable()
export class AssignmentQueueService {
  constructor(
    private agentAssignmentService: AgentAssignmentService,
  ) {}

  async processAssignment(conversationId: string, groupId?: string) {
    // Just call the assignment service
    const result = await this.agentAssignmentService.assignAgentToConversation(
      conversationId,
      groupId,
    );
    
    if (!result.success) {
      throw new Error(result.message); // Will retry via BullMQ
    }
  }
}
```

To enable BullMQ:
1. Start Redis: `redis-server`
2. Uncomment `QueueModule` in `app.module.ts`
3. Replace setTimeout in ChatService with queue job

---

## 📋 API Reference

### Create Widget Session
```
POST /v1/widget/session
Content-Type: application/json

{
  "name": "Visitor Name",
  "email": "visitor@example.com",
  "phone": "+1234567890",
  "groupId": "uuid", // optional
  "initialMessage": "Hello",
  "metadata": {}
}
```

### Send Message (Visitor)
```
POST /v1/threads/:threadId/events
Content-Type: application/json

{
  "authorType": "visitor",
  "type": "message",
  "content": "My message",
  "metadata": {}
}
```

### Send Message (Agent)
```
POST /v1/threads/:threadId/events
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "authorType": "agent",
  "type": "message",
  "content": "Agent response"
}
```

### Get Conversation
```
GET /v1/conversations/:id
Authorization: Bearer <jwt-token>
```

### Get Thread Events
```
GET /v1/threads/:threadId/events
Authorization: Bearer <jwt-token>
```

---

## 🎨 Frontend Example (React)

```jsx
import { useState, useEffect } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';

function ChatWidget() {
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Initialize session
    initSession();
  }, []);

  useEffect(() => {
    if (!session) return;

    const db = getDatabase();
    
    // Listen for messages
    const messagesRef = ref(db, `conversations/${session.conversationId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const msgs = [];
      snapshot.forEach((child) => {
        msgs.push({ id: child.key, ...child.val() });
      });
      msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [session]);

  async function initSession() {
    const response = await fetch('/v1/widget/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        initialMessage: 'Hello!'
      })
    });
    const data = await response.json();
    setSession(data);
  }

  async function sendMessage(content) {
    await fetch(`/v1/threads/${session.threadId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorType: 'visitor',
        type: 'message',
        content
      })
    });
  }

  return (
    <div className="chat-widget">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message message-${msg.authorType}`}>
            <div className="content">{msg.content}</div>
            <div className="time">{new Date(msg.createdAt).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### Firebase Connection Issues
- Verify Firebase credentials in `.env`
- Check Firebase Realtime Database rules
- Ensure database URL is correct

### Agent Not Assigned
- Check that at least one agent is:
  - Status: ONLINE
  - acceptingChats: true
  - In the conversation's group
  - activeChats < maxConcurrentChats

### Messages Not Appearing
- Verify Firebase listeners are set up
- Check browser console for errors
- Ensure threadId is correct
- Check API responses

---

## 🔐 Firebase Security Rules (Recommended)

```json
{
  "rules": {
    "conversations": {
      "$conversationId": {
        ".read": true,
        ".write": "auth != null"
      }
    },
    "agents": {
      "$agentId": {
        ".read": true,
        ".write": "auth != null && auth.uid == $agentId"
      }
    }
  }
}
```

---

## ✅ Testing Checklist

- [ ] Widget session created successfully
- [ ] Initial message appears in Firebase
- [ ] Agent assigned after 3 seconds
- [ ] Agent assignment system event appears
- [ ] Visitor can send messages
- [ ] Agent can send messages
- [ ] Messages appear in real-time for both parties
- [ ] System events display correctly
- [ ] Multiple simultaneous chats work
- [ ] Agent limit enforcement works

---

## 📞 Support

For issues or questions:
- Check Firebase Console for data structure
- Review backend logs for assignment errors
- Test API endpoints with Postman
- Verify agent availability criteria

---

## 🎉 Summary

You now have a complete real-time chat system:

✅ Firebase Realtime Database for instant messaging  
✅ 3-second auto-assignment with intelligent agent selection  
✅ Full validation (group membership, online status, chat limits)  
✅ System events for audit trail  
✅ Ready for BullMQ integration  
✅ LiveChat Inc-style architecture

Frontend developers can now:
1. Call `/v1/widget/session` to start chat
2. Listen to Firebase for real-time updates
3. Send messages via API (synced to Firebase automatically)
4. Display agent assignment after 3 seconds
5. Build rich chat UI with typing indicators and presence
