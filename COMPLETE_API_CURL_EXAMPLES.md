# LiveChatLog API - cURL Examples

## Base URL
```
https://livechatlog-dashboard-api-155761421960.us-central1.run.app
```

## Authentication
All protected endpoints require JWT Bearer token in the Authorization header.

---

## 🗨️ Canned Responses APIs

### 1. Create Canned Response (Shared)
```bash
curl --location 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/canned-responses' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
  "tag": "#greet",
  "title": "Welcome Message",
  "message": "Hello! Welcome to our support chat. How can I help you today?",
  "messages": [
    "Hello! Welcome to our support chat. How can I help you today?",
    "Hi there! Thanks for reaching out. What can I assist you with?",
    "Welcome! I'\''m here to help. What brings you here today?"
  ],
  "category": "General",
  "visibility": "shared",
  "isActive": true,
  "createdBy": "agent-uuid-here"
}'
```

### 2. Create Private Canned Response
```bash
curl --location 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/canned-responses' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
  "tag": "#mynote",
  "title": "My Personal Note",
  "message": "This is my personal quick response",
  "messages": [
    "This is my personal quick response",
    "Alternative personal message"
  ],
  "category": "Personal",
  "visibility": "private",
  "isActive": true,
  "createdBy": "agent-uuid-here"
}'
```

### 3. Get All Canned Responses (with filters)
```bash
# Get all shared and agent's private responses
curl --location 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/canned-responses?agentId=YOUR_AGENT_UUID&page=1&limit=50' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'

# Get only shared responses
curl --location 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/canned-responses?visibility=shared&page=1&limit=50' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'

# Get only private responses for specific agent
curl --location 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/canned-responses?visibility=private&agentId=YOUR_AGENT_UUID&page=1&limit=50' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'

# Search with filters
curl --location 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/canned-responses?search=hello&category=General&isActive=true&page=1&limit=50' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### 4. Get Canned Response by ID
```bash
curl --location 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/canned-responses/RESPONSE_UUID' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### 5. Get Canned Response by Tag
```bash
curl --location 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/canned-responses/by-tag/%23greet' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'

# Or with / prefix
curl --location 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/canned-responses/by-tag/%2Fhello' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### 6. Get All Categories
```bash
curl --location 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/canned-responses/categories' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### 7. Update Canned Response
```bash
curl --location --request PUT 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/canned-responses/RESPONSE_UUID' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
  "tag": "#greet",
  "title": "Updated Welcome Message",
  "message": "Hello! Updated welcome message.",
  "messages": [
    "Hello! Updated welcome message.",
    "Hi! This is updated.",
    "Welcome! Updated version."
  ],
  "category": "General",
  "visibility": "shared",
  "isActive": true
}'
```

### 8. Delete Canned Response (Soft Delete)
```bash
curl --location --request DELETE 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/canned-responses/RESPONSE_UUID' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## 💬 Conversation APIs

### 9. Get Conversation with All Threads and Events/Messages
```bash
curl --location 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/conversations/CONVERSATION_UUID' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Response Structure:**
```json
{
  "id": "conv-uuid",
  "status": "active",
  "visitor": {
    "id": "visitor-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "assignedAgent": {
    "id": "agent-uuid",
    "name": "Agent Smith",
    "email": "agent@example.com"
  },
  "group": {
    "id": "group-uuid",
    "name": "Support Team"
  },
  "threads": [
    {
      "id": "thread-1-uuid",
      "status": "closed",
      "closedBy": "system",
      "closedReason": "agent_assigned",
      "createdAt": "2026-01-20T10:00:00Z",
      "closedAt": "2026-01-20T10:05:00Z",
      "events": [
        {
          "id": "event-uuid",
          "type": "message",
          "authorType": "visitor",
          "content": "Hello, I need help",
          "createdAt": "2026-01-20T10:00:00Z",
          "deliveredAt": null,
          "readAt": null
        },
        {
          "id": "event-uuid-2",
          "type": "message",
          "authorType": "agent",
          "agentId": "agent-uuid",
          "agent": {
            "id": "agent-uuid",
            "name": "Agent Smith"
          },
          "content": "Hi! How can I help you?",
          "createdAt": "2026-01-20T10:01:00Z"
        }
      ]
    },
    {
      "id": "thread-2-uuid",
      "status": "active",
      "createdAt": "2026-01-20T10:05:00Z",
      "events": [
        {
          "id": "event-uuid-3",
          "type": "message",
          "authorType": "visitor",
          "content": "I have another question",
          "createdAt": "2026-01-20T10:06:00Z"
        }
      ]
    }
  ],
  "tags": [],
  "createdAt": "2026-01-20T10:00:00Z",
  "updatedAt": "2026-01-20T10:06:00Z"
}
```

### 10. Get Thread Events
```bash
curl --location 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/threads/THREAD_UUID/events' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### 11. Get Agent's Conversations
```bash
curl --location 'https://livechatlog-dashboard-api-155761421960.us-central1.run.app/v1/agents/AGENT_UUID/conversations' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## 📝 Response Examples

### Canned Response Object
```json
{
  "id": "uuid",
  "tag": "#greet",
  "title": "Welcome Message",
  "message": "Hello! Welcome to our support chat.",
  "messages": [
    "Hello! Welcome to our support chat.",
    "Hi there! Thanks for reaching out.",
    "Welcome! I'm here to help."
  ],
  "category": "General",
  "visibility": "shared",
  "isActive": true,
  "createdBy": "agent-uuid",
  "creator": {
    "id": "agent-uuid",
    "name": "Agent Name",
    "email": "agent@example.com"
  },
  "createdAt": "2026-01-20T10:00:00Z",
  "updatedAt": "2026-01-20T10:00:00Z"
}
```

### Paginated Canned Responses
```json
{
  "data": [
    {
      "id": "uuid",
      "tag": "#greet",
      "title": "Welcome Message",
      "message": "Hello!",
      "messages": ["Hello!", "Hi!"],
      "category": "General",
      "visibility": "shared",
      "isActive": true,
      "creator": {
        "id": "agent-uuid",
        "name": "Agent Name"
      }
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 50
}
```

---

## 🔑 Key Features

### Canned Responses
- **Visibility Control**: `shared` (all agents) or `private` (creator only)
- **Multiple Messages**: Each shortcut can have multiple message variations
- **Shortcuts**: Tags starting with `#` or `/` (e.g., `#greet`, `/hello`)
- **Categories**: Organize responses by category
- **Search**: Search by tag or title
- **Filtering**: Filter by visibility, category, active status, agent

### Conversations
- **Full History**: `/full` endpoint returns ALL threads with ALL messages
- **Nested Data**: Complete conversation structure with visitor, agent, threads, and events
- **Thread Management**: Support for multiple threads per conversation
- **Event Tracking**: All messages with timestamps, delivery, and read status

---

## 🗄️ Database Migration

Run this SQL migration to add the new fields:

```sql
-- Add visibility and messages columns
ALTER TABLE canned_responses 
ADD COLUMN visibility ENUM('shared', 'private') NOT NULL DEFAULT 'shared' 
AFTER category;

ALTER TABLE canned_responses 
ADD COLUMN messages JSON NULL 
AFTER message;

-- Create indexes for performance
CREATE INDEX idx_canned_responses_visibility ON canned_responses(visibility);
CREATE INDEX idx_canned_responses_created_by ON canned_responses(created_by);
```

---

## 📌 Notes

1. Replace `YOUR_JWT_TOKEN` with actual JWT token from login
2. Replace `YOUR_AGENT_UUID`, `CONVERSATION_UUID`, etc. with actual UUIDs
3. URL-encode special characters in query parameters (# = %23, / = %2F)
4. All timestamps are in ISO 8601 format (UTC)
5. When using `agentId` parameter, it automatically shows shared + agent's private responses
6. The `messages` array is optional - if not provided, only the single `message` field is used
