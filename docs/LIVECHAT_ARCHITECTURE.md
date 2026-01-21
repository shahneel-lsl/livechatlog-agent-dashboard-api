# LiveChat Inc-Style Backend Architecture

## Overview

This is a production-ready LiveChat Inc-style backend built with NestJS, TypeORM, MySQL, BullMQ, and Firebase. The system implements event-driven chat lifecycle management with automatic agent assignment and real-time notifications.

---

## Architecture Principles

### 1. **Separation of Concerns**
- **CRUD APIs**: Configuration and management (Agents, Groups, Tags)
- **Runtime APIs**: Chat operations (Widget Session, Events, Assignment)

### 2. **Authentication**
- JWT-based authentication for all CRUD APIs
- Public widget session endpoint (no auth required)
- Bearer token authentication for protected endpoints

### 3. **Event-Driven Design**
- Immutable event sourcing for all messages
- System events for audit trail
- Thread-based conversation management

### 4. **Soft Deletes**
- All entities support soft delete
- Prevents data loss
- Maintains referential integrity

### 5. **Scalability**
- BullMQ for background processing
- Redis-backed queue system
- Horizontal scaling ready

---

## Database Schema

### Core Entities

#### **Agents**
```
- id (UUID, PK)
- name (string)
- email (string, unique)
- password (hashed)
- role (enum: agent, supervisor, admin)
- status (enum: online, offline, away)
- acceptingChats (boolean)
- maxConcurrentChats (number)
- avatar (string, nullable)
- isDeleted (boolean)
- createdAt, updatedAt, deletedAt
```

#### **Groups (Departments)**
```
- id (UUID, PK)
- name (string, unique)
- description (text)
- routingStrategy (enum: round_robin, least_loaded, sticky)
- isDefault (boolean)
- isDeleted (boolean)
- createdAt, updatedAt, deletedAt
```

#### **Agent-Group** (Many-to-Many)
```
- agentId (UUID, FK)
- groupId (UUID, FK)
```

#### **Tags**
```
- id (UUID, PK)
- name (string, unique)
- color (string)
- isDeleted (boolean)
- createdAt, updatedAt, deletedAt
```

#### **Visitors**
```
- id (UUID, PK)
- name (string, nullable)
- email (string, nullable)
- phone (string, nullable)
- userAgent (text)
- ipAddress (string)
- referrer (string)
- metadata (JSON)
- sessionToken (string, unique)
- createdAt, updatedAt
```

#### **Conversations**
```
- id (UUID, PK)
- visitorId (UUID, FK)
- assignedAgentId (UUID, FK, nullable)
- groupId (UUID, FK, nullable)
- status (enum: pending, active, resolved, closed)
- activeThreadId (UUID, nullable)
- notes (text)
- createdAt, updatedAt
```

#### **Threads**
```
- id (UUID, PK)
- conversationId (UUID, FK)
- status (enum: active, closed)
- closedBy (string: agent|system|visitor)
- closedReason (string)
- closedAt (timestamp, nullable)
- createdAt, updatedAt
```

#### **Events**
```
- id (UUID, PK)
- threadId (UUID, FK)
- type (enum: message, system)
- authorType (enum: visitor, agent, system)
- agentId (UUID, FK, nullable)
- content (text)
- metadata (JSON)
- createdAt
```

#### **Conversation-Tags** (Many-to-Many)
```
- conversationId (UUID, FK)
- tagId (UUID, FK)
```

---

## API Endpoints

### Authentication

#### **POST /v1/auth/login**
Login and get JWT token
```json
Request:
{
  "email": "agent@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "jwt-token-here",
  "agent": {
    "id": "uuid",
    "name": "Agent Name",
    "email": "agent@example.com",
    "role": "agent",
    "status": "online"
  }
}
```

#### **GET /v1/auth/me** 🔒
Get current authenticated agent

---

### Agents CRUD 🔒

#### **POST /v1/agents**
Create new agent
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure123",
  "role": "agent",
  "maxConcurrentChats": 5
}
```

#### **GET /v1/agents**
List all agents

#### **GET /v1/agents/:id**
Get agent by ID

#### **GET /v1/agents/:id/stats**
Get agent statistics (active chats, availability)

#### **PATCH /v1/agents/:id**
Update agent

#### **DELETE /v1/agents/:id**
Soft delete agent

#### **POST /v1/agents/:id/restore**
Restore deleted agent

---

### Groups CRUD 🔒

#### **POST /v1/groups**
Create new group
```json
{
  "name": "Sales Team",
  "description": "Handles sales inquiries",
  "routingStrategy": "least_loaded",
  "isDefault": false
}
```

#### **GET /v1/groups**
List all groups

#### **GET /v1/groups/:id**
Get group by ID

#### **PATCH /v1/groups/:id**
Update group

#### **DELETE /v1/groups/:id**
Soft delete group

#### **POST /v1/groups/:id/agents**
Assign agents to group
```json
{
  "agentIds": ["uuid1", "uuid2", "uuid3"]
}
```

#### **DELETE /v1/groups/:id/agents/:agentId**
Remove agent from group

---

### Tags CRUD 🔒

#### **POST /v1/tags**
Create new tag
```json
{
  "name": "VIP",
  "color": "#FF5733"
}
```

#### **GET /v1/tags**
List all tags

#### **GET /v1/tags/:id**
Get tag by ID

#### **PATCH /v1/tags/:id**
Update tag

#### **DELETE /v1/tags/:id**
Soft delete tag

---

### Widget / Chat Runtime APIs

#### **POST /v1/widget/session** (Public - No Auth)
Initialize chat session
```json
Request:
{
  "name": "Visitor Name",
  "email": "visitor@example.com",
  "phone": "+1234567890",
  "groupId": "uuid", // optional
  "initialMessage": "Hello, I need help",
  "metadata": {
    "page": "/pricing",
    "source": "website"
  }
}

Response:
{
  "sessionToken": "visitor-session-token",
  "visitorId": "uuid",
  "conversationId": "uuid",
  "threadId": "uuid",
  "status": "pending",
  "firebase": {
    "databaseURL": "https://...",
    "conversationPath": "/conversations/uuid"
  }
}
```

#### **POST /v1/threads/:threadId/events** 🔒
Add event to thread
```json
{
  "authorType": "agent",
  "content": "Hello! How can I help you?",
  "type": "message",
  "metadata": {}
}
```

#### **GET /v1/threads/:threadId/events** 🔒
Get all events in a thread

#### **POST /v1/conversations/:conversationId/assign** 🔒
Assign conversation to agent
```json
{
  "agentId": "uuid",
  "reason": "Manual assignment"
}
```

#### **GET /v1/conversations/:id** 🔒
Get conversation details

---

## Assignment Flow

### Automatic Assignment (BullMQ)

1. **Trigger**: Visitor creates widget session
2. **Queue Job**: Add to `agent-assignment` queue
3. **Worker Processing**:
   - Find eligible agents in group
   - Filter by: online status, accepting chats, available slots, not deleted
   - Apply routing strategy
   - Assign agent
   - Create system events
   - Send notifications

### Routing Strategies

#### **Round Robin**
- Distributes conversations evenly
- Random selection from eligible agents
- Can be enhanced with Redis tracking

#### **Least Loaded**
- Assigns to agent with most available slots
- Calculates: `maxConcurrentChats - activeChats`
- Ensures balanced workload

#### **Sticky (Returning Visitors)**
- Checks if visitor has previous conversations
- Assigns to same agent if available
- Falls back to least loaded

---

## Threading Model

### Concept
Each conversation can have multiple threads. Threads separate different phases of a conversation.

### Thread Lifecycle

1. **Initial Thread**
   - Created when visitor starts chat
   - Status: `ACTIVE`
   - Contains all pre-assignment messages

2. **Assignment Thread**
   - Created when agent is assigned
   - Previous thread closed with reason: `agent_assigned`
   - System event added: "Agent [name] joined"
   - Status: `ACTIVE`

3. **Thread Closure**
   - Triggered by: agent assignment, resolution, timeout
   - Status changed to: `CLOSED`
   - `closedBy`, `closedReason`, `closedAt` recorded

### Benefits
- Clear conversation phases
- Easy to track handoffs
- Audit trail preserved
- Thread-specific analytics

---

## State Transitions

### Conversation Status

```
PENDING → ACTIVE → RESOLVED → CLOSED
   ↓         ↓
[Auto Assign] [Manual Close]
```

**PENDING**
- Initial state after widget session
- Waiting for agent assignment
- Queue job processing

**ACTIVE**
- Agent assigned
- Active communication
- Thread events being added

**RESOLVED**
- Issue resolved
- Awaiting confirmation
- Can reopen if needed

**CLOSED**
- Conversation ended
- Archived
- Read-only events

### Thread Status

```
ACTIVE → CLOSED
```

---

## Real-time Notifications (Firebase)

### Implementation Points

1. **Visitor Notifications**
   - Agent joined conversation
   - New messages from agent
   - Conversation status changes

2. **Agent Notifications**
   - New conversation assigned
   - Visitor messages
   - System events

3. **Firebase Paths**
```
/conversations/{conversationId}/
  - status
  - assignedAgent
  - lastMessage
  - unreadCount

/threads/{threadId}/
  - events[]
  - status

/agents/{agentId}/
  - activeConversations[]
  - notifications[]
```

---

## Environment Variables

```env
# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=livechat_db

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Firebase
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Email
EMAIL_ID=your@email.com
EMAIL_PASS=password
EMAIL_FROM="LiveChat" <noreply@livechat.com>

# App
API_ENV=development
PORT=3000
```

---

## Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

### Docker
```bash
docker build -t livechat-api .
docker run -p 3000:3000 livechat-api
```

---

## Testing

### Create First Agent (for testing)
```bash
# Use MySQL directly or create a seed script
INSERT INTO agents (id, name, email, password, role, status, acceptingChats, maxConcurrentChats, isDeleted)
VALUES (
  UUID(),
  'Test Agent',
  'agent@test.com',
  '$2b$10$hashedpassword',
  'agent',
  'online',
  true,
  5,
  false
);
```

### Test Flow
1. Login as agent → Get JWT token
2. Create group → Note group ID
3. Assign agent to group
4. Create widget session → Note conversation ID
5. Check conversation status
6. Assign agent manually or wait for auto-assignment
7. Send messages through thread events

---

## Production Considerations

1. **Redis**: Required for BullMQ queues
2. **MySQL**: Configure connection pooling
3. **Indexes**: Add indexes on frequently queried fields
4. **Rate Limiting**: Implement on public endpoints
5. **CORS**: Configure allowed origins
6. **Logging**: Implement proper logging (Winston/Pino)
7. **Monitoring**: Add health checks and metrics
8. **Security**: 
   - Helmet for HTTP headers
   - Input sanitization
   - SQL injection prevention (TypeORM handles this)
   - XSS prevention

---

## Future Enhancements

1. **Canned Responses**: Pre-defined message templates
2. **File Uploads**: Support for images/documents in chat
3. **Typing Indicators**: Real-time typing status
4. **Read Receipts**: Message read confirmation
5. **Chat Transfer**: Transfer conversation to another agent
6. **Supervisor Dashboard**: Real-time monitoring
7. **Analytics**: Conversation metrics and reports
8. **Webhooks**: External system integrations
9. **Chatbots**: AI-powered initial responses
10. **Multi-language**: i18n support

---

## Support

For questions or issues, contact the development team.

**Built with ❤️ using NestJS**
