# Assignment Logging System Documentation

## 📊 Overview

Comprehensive MySQL-based logging system that tracks every step of the agent assignment process. Logs are stored in the database for auditing, debugging, and analytics.

---

## 🗄️ Database Table: `assignment_logs`

### Schema

```sql
CREATE TABLE assignment_logs (
  id VARCHAR(36) PRIMARY KEY,
  conversationId VARCHAR(36) NOT NULL,
  visitorId VARCHAR(36) NOT NULL,
  groupId VARCHAR(36),
  groupName VARCHAR(255),
  agentId VARCHAR(36),
  agentName VARCHAR(255),
  type ENUM(...) NOT NULL,
  level ENUM('info', 'warning', 'error', 'success'),
  message TEXT NOT NULL,
  metadata JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(conversationId),
  INDEX(visitorId),
  INDEX(groupId),
  INDEX(agentId),
  INDEX(createdAt),
  INDEX(level)
);
```

### Log Types

| Type | Description | When It's Logged |
|------|-------------|------------------|
| `ASSIGNMENT_STARTED` | Assignment process initiated | When assignment begins |
| `NO_GROUP_FOUND` | Group not found or deleted | Group doesn't exist |
| `NO_AGENTS_IN_GROUP` | No agents configured in group | Group has 0 agents |
| `NO_ONLINE_AGENTS` | No agents currently online | All agents offline |
| `NO_ACCEPTING_AGENTS` | No agents accepting new chats | All agents have `acceptingChats=false` |
| `ALL_AGENTS_AT_CAPACITY` | All agents at max capacity | All agents at `maxConcurrentChats` |
| `AGENT_SELECTED` | Eligible agents found | Before routing decision |
| `ASSIGNMENT_SUCCESS` | Agent successfully assigned | Assignment completed |
| `ASSIGNMENT_FAILED` | Assignment failed with error | Exception occurred |

### Log Levels

- **INFO**: Normal operation
- **WARNING**: Issue found but not critical (no available agents)
- **ERROR**: Critical failure (group not found, exception)
- **SUCCESS**: Successful assignment

---

## 📝 What Gets Logged

### 1. Assignment Started
```json
{
  "conversationId": "conv-123",
  "visitorId": "visitor-456",
  "groupId": "group-789",
  "type": "assignment_started",
  "level": "info",
  "message": "Starting agent assignment for visitor John Doe",
  "metadata": {
    "visitorName": "John Doe",
    "visitorEmail": "john@example.com"
  }
}
```

### 2. No Agents in Group
```json
{
  "conversationId": "conv-123",
  "visitorId": "visitor-456",
  "groupId": "group-789",
  "groupName": "Sales Team",
  "type": "no_agents_in_group",
  "level": "warning",
  "message": "No agents configured in group \"Sales Team\"",
  "metadata": {
    "groupId": "group-789",
    "agentCount": 0
  }
}
```

### 3. No Online Agents
```json
{
  "conversationId": "conv-123",
  "visitorId": "visitor-456",
  "groupId": "group-789",
  "groupName": "Sales Team",
  "type": "no_online_agents",
  "level": "warning",
  "message": "No online agents in group \"Sales Team\". Total agents: 5, Online: 0",
  "metadata": {
    "totalAgents": 5,
    "onlineAgents": 0,
    "acceptingAgents": 0,
    "eligibleAgents": 0,
    "routingStrategy": "least_loaded"
  }
}
```

### 4. No Accepting Agents
```json
{
  "conversationId": "conv-123",
  "visitorId": "visitor-456",
  "groupId": "group-789",
  "groupName": "Sales Team",
  "type": "no_accepting_agents",
  "level": "warning",
  "message": "No agents accepting chats in group \"Sales Team\". Online: 3, Accepting: 0",
  "metadata": {
    "totalAgents": 5,
    "onlineAgents": 3,
    "acceptingAgents": 0,
    "eligibleAgents": 0,
    "routingStrategy": "least_loaded"
  }
}
```

### 5. All Agents at Capacity
```json
{
  "conversationId": "conv-123",
  "visitorId": "visitor-456",
  "groupId": "group-789",
  "groupName": "Sales Team",
  "type": "all_agents_at_capacity",
  "level": "warning",
  "message": "All agents in group \"Sales Team\" are at maximum capacity. Online: 3, Accepting: 3",
  "metadata": {
    "totalAgents": 5,
    "onlineAgents": 3,
    "acceptingAgents": 3,
    "eligibleAgents": 0,
    "routingStrategy": "least_loaded"
  }
}
```

### 6. Agent Selected
```json
{
  "conversationId": "conv-123",
  "visitorId": "visitor-456",
  "groupId": "group-789",
  "groupName": "Sales Team",
  "type": "agent_selected",
  "level": "info",
  "message": "Found 2 eligible agent(s) in group \"Sales Team\"",
  "metadata": {
    "totalAgents": 5,
    "onlineAgents": 3,
    "acceptingAgents": 3,
    "eligibleAgents": 2,
    "routingStrategy": "least_loaded"
  }
}
```

### 7. Assignment Success
```json
{
  "conversationId": "conv-123",
  "visitorId": "visitor-456",
  "groupId": "group-789",
  "groupName": "Sales Team",
  "agentId": "agent-999",
  "agentName": "Alice Smith",
  "type": "assignment_success",
  "level": "success",
  "message": "Successfully assigned agent Alice Smith to visitor John Doe",
  "metadata": {
    "routingStrategy": "least_loaded",
    "agentEmail": "alice@company.com",
    "agentRole": "agent",
    "assignmentTime": "2025-12-31T10:30:00.000Z"
  }
}
```

### 8. Assignment Failed
```json
{
  "conversationId": "conv-123",
  "visitorId": "visitor-456",
  "type": "assignment_failed",
  "level": "error",
  "message": "Assignment failed with error: Database connection timeout",
  "metadata": {
    "errorDetails": "Database connection timeout",
    "errorStack": "Error: Connection timeout at..."
  }
}
```

---

## 🔌 API Endpoints

### 1. Get Assignment Logs (Filtered)
```http
GET /v1/logs/assignments?conversationId=xxx&groupId=xxx&level=error&page=1&limit=50
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `conversationId` (optional): Filter by conversation
- `visitorId` (optional): Filter by visitor
- `groupId` (optional): Filter by group
- `agentId` (optional): Filter by agent
- `level` (optional): Filter by level (info, warning, error, success)
- `type` (optional): Filter by log type
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "data": [
    {
      "id": "log-uuid",
      "conversationId": "conv-123",
      "visitorId": "visitor-456",
      "groupId": "group-789",
      "groupName": "Sales Team",
      "agentId": "agent-999",
      "agentName": "Alice Smith",
      "type": "assignment_success",
      "level": "success",
      "message": "Successfully assigned agent Alice Smith to visitor John Doe",
      "metadata": { ... },
      "createdAt": "2025-12-31T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1234,
    "totalPages": 25
  }
}
```

### 2. Get Logs Summary/Statistics
```http
GET /v1/logs/summary?groupId=xxx&startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "totalLogs": 5000,
  "successCount": 4200,
  "failureCount": 800,
  "noAgentCount": 750,
  "errorCount": 50,
  "warningCount": 800,
  "successRate": "84.00%",
  "failureReasons": [
    { "type": "all_agents_at_capacity", "count": 400 },
    { "type": "no_online_agents", "count": 200 },
    { "type": "no_accepting_agents", "count": 150 }
  ],
  "period": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }
}
```

### 3. Get Recent Issues
```http
GET /v1/logs/issues?limit=20
Authorization: Bearer <jwt-token>
```

Returns the 20 most recent ERROR and WARNING logs.

**Response:**
```json
[
  {
    "id": "log-uuid",
    "conversationId": "conv-123",
    "visitorId": "visitor-456",
    "groupId": "group-789",
    "groupName": "Sales Team",
    "type": "no_online_agents",
    "level": "warning",
    "message": "No online agents in group \"Sales Team\"",
    "metadata": { ... },
    "createdAt": "2025-12-31T10:30:00.000Z"
  }
]
```

### 4. Get Conversation Timeline
```http
GET /v1/logs/conversation/:conversationId
Authorization: Bearer <jwt-token>
```

Returns all logs for a specific conversation in chronological order.

**Response:**
```json
{
  "conversationId": "conv-123",
  "totalLogs": 3,
  "timeline": [
    {
      "type": "assignment_started",
      "message": "Starting agent assignment for visitor John Doe",
      "createdAt": "2025-12-31T10:30:00.000Z"
    },
    {
      "type": "agent_selected",
      "message": "Found 2 eligible agent(s) in group \"Sales Team\"",
      "createdAt": "2025-12-31T10:30:01.500Z"
    },
    {
      "type": "assignment_success",
      "message": "Successfully assigned agent Alice Smith to visitor John Doe",
      "createdAt": "2025-12-31T10:30:02.000Z"
    }
  ]
}
```

### 5. Get Group Performance Metrics
```http
GET /v1/logs/group/:groupId/metrics?days=7
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "groupId": "group-789",
  "period": "Last 7 days",
  "totalAttempts": 500,
  "successfulAssignments": 420,
  "successRate": "84.00%",
  "issues": {
    "noOnlineAgents": 30,
    "noAcceptingAgents": 20,
    "atCapacity": 30
  }
}
```

### 6. Get Available Log Types
```http
GET /v1/logs/types
Authorization: Bearer <jwt-token>
```

Returns all available log types and levels with descriptions for UI filters.

---

## 🔍 Use Cases

### Debug Assignment Failure
```bash
# Get all ERROR logs for a specific conversation
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/v1/logs/assignments?conversationId=conv-123&level=error"
```

### Monitor Group Performance
```bash
# Get metrics for Sales Team in last 30 days
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/v1/logs/group/group-789/metrics?days=30"
```

### Check Why Visitor Wasn't Assigned
```bash
# Get full timeline for conversation
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/v1/logs/conversation/conv-123"
```

### Find Recent Issues
```bash
# Get 50 most recent errors/warnings
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/v1/logs/issues?limit=50"
```

### Get Daily Summary
```bash
# Get summary for today
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/v1/logs/summary?startDate=2025-12-31&endDate=2025-12-31"
```

---

## 📈 Analytics Queries

### Success Rate by Group
```sql
SELECT 
  groupId,
  groupName,
  COUNT(CASE WHEN type = 'assignment_success' THEN 1 END) as successful,
  COUNT(CASE WHEN type = 'assignment_started' THEN 1 END) as total,
  ROUND(
    COUNT(CASE WHEN type = 'assignment_success' THEN 1 END) * 100.0 / 
    COUNT(CASE WHEN type = 'assignment_started' THEN 1 END), 2
  ) as success_rate
FROM assignment_logs
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY groupId, groupName
ORDER BY success_rate DESC;
```

### Most Common Failure Reasons
```sql
SELECT 
  type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM assignment_logs WHERE level IN ('error', 'warning')), 2) as percentage
FROM assignment_logs
WHERE level IN ('error', 'warning')
  AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY type
ORDER BY count DESC;
```

### Peak Hours for Assignment Failures
```sql
SELECT 
  HOUR(createdAt) as hour,
  COUNT(*) as failure_count
FROM assignment_logs
WHERE level IN ('error', 'warning')
  AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY HOUR(createdAt)
ORDER BY failure_count DESC;
```

---

## 🚨 Alerting Examples

### Detect High Failure Rate
```sql
SELECT 
  groupId,
  groupName,
  COUNT(*) as failures
FROM assignment_logs
WHERE type IN ('no_online_agents', 'all_agents_at_capacity')
  AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY groupId, groupName
HAVING failures > 10;
```

### Find Agents Never Assigned
```sql
SELECT a.id, a.name
FROM agents a
LEFT JOIN assignment_logs al ON al.agentId = a.id AND al.type = 'assignment_success'
WHERE a.status = 'online'
  AND a.acceptingChats = true
  AND al.id IS NULL;
```

---

## 🎯 Benefits

✅ **Full Audit Trail** - Every assignment attempt logged  
✅ **Detailed Diagnostics** - Know exactly why assignment failed  
✅ **Group Analytics** - Measure performance by group  
✅ **Agent Analytics** - Track individual agent assignments  
✅ **Visitor History** - See all assignment attempts for a visitor  
✅ **Real-time Monitoring** - Query recent issues  
✅ **Capacity Planning** - Identify when agents are overloaded  
✅ **SLA Tracking** - Measure assignment success rate  

---

## 💡 Tips

1. **Check logs first** when debugging assignment issues
2. **Monitor success rate** to ensure adequate agent coverage
3. **Set up alerts** for high failure rates
4. **Review capacity issues** regularly
5. **Use conversation timeline** to understand visitor experience
6. **Check group metrics** to balance workload

---

## 🔧 Maintenance

### Clean Old Logs (Optional)
```sql
-- Delete logs older than 90 days
DELETE FROM assignment_logs 
WHERE createdAt < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

### Index Maintenance
All important columns are already indexed for optimal query performance.

---

## 📊 Dashboard Ideas

Build admin dashboards to visualize:
- Success rate over time (line chart)
- Failure reasons (pie chart)
- Group performance comparison (bar chart)
- Real-time issues feed (list)
- Agent workload distribution (heat map)

---

Now you have complete visibility into your agent assignment process! 🎉
