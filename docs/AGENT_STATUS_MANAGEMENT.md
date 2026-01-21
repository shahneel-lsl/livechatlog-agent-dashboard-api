# Agent Status Management API Documentation

## Overview

This document describes the Agent Status Management API implementation for the LiveChatLog Dashboard. The API provides comprehensive functionality for managing agent status, sessions, schedules, and automatic availability triggers.

## Table of Contents

1. [Features Implemented](#features-implemented)
2. [Database Entities](#database-entities)
3. [API Endpoints](#api-endpoints)
4. [Automatic Schedulers](#automatic-schedulers)
5. [Security](#security)
6. [Usage Examples](#usage-examples)

---

## Features Implemented

### 1. Agent Status Management (1.3.1, 1.3.2)

- **Online/Offline Toggles**: Agents can manually set their availability
- **Status Indicators**: Display current state with five possible statuses:
  - `online` - Agent is online and ready
  - `offline` - Agent is offline
  - `away` - Agent is away (manual or auto-triggered)
  - `busy` - Agent is at max capacity (auto-triggered)
  - `available` - Agent is available and accepting chats

### 2. Auto-Away Triggers (1.3.3)

- Automatic switch to "away" status after configurable inactivity period
- Heartbeat endpoint to maintain activity
- Overload-based busy status when agent reaches max concurrent chats
- Configurable `autoAwayMinutes` setting (default: 15 minutes)

### 3. Schedule-Based Availability Override (1.3.4)

- Weekly schedule management for each agent
- Automatic online/offline based on business hours
- Per-day schedule entries with start/end times
- Timezone support for schedules

### 4. Session Timeout Handling (1.2.3)

- Configurable session timeout (`sessionTimeoutMinutes`)
- Automatic logout after inactivity
- Notification support for expiring sessions
- Multi-device session management

### 5. Auto-Logout & Re-Auth Prompts

- Session validation endpoint to check re-auth requirements
- Forced logout capability for admins
- Session expiry tracking
- Logout from all devices option

---

## Database Entities

### Agent Entity (Updated)

New fields added to the existing `Agent` entity:

```typescript
@Column({ nullable: true })
lastActivityAt: Date;

@Column({ nullable: true })
lastLoginAt: Date;

@Column({ nullable: true })
lastLogoutAt: Date;

@Column({ default: 15 })
autoAwayMinutes: number;

@Column({ default: 60 })
sessionTimeoutMinutes: number;

@Column({ default: false })
scheduleEnabled: boolean;
```

### AgentSession Entity (New)

Tracks individual login sessions:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| agentId | UUID | Reference to agent |
| token | string | Hashed session token |
| status | enum | active, expired, logged_out, forced_logout |
| ipAddress | string | Client IP address |
| userAgent | string | Browser/client info |
| lastActivityAt | Date | Last activity timestamp |
| expiresAt | Date | Session expiry time |
| loggedOutAt | Date | Logout timestamp |
| logoutReason | string | Reason for logout |

### AgentSchedule Entity (New)

Defines work schedules:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| agentId | UUID | Reference to agent |
| dayOfWeek | enum | 0=Monday through 6=Sunday |
| startTime | time | Start of availability (HH:mm) |
| endTime | time | End of availability (HH:mm) |
| isActive | boolean | Whether schedule is active |
| timezone | string | Timezone for schedule |

### AgentStatusLog Entity (New)

Audit log for status changes:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| agentId | UUID | Reference to agent |
| previousStatus | enum | Status before change |
| newStatus | enum | Status after change |
| reason | enum | manual, auto_away, schedule, overload, session_timeout, login, logout, system |
| details | string | Additional details |
| ipAddress | string | Client IP address |
| createdAt | Date | Timestamp |

---

## API Endpoints

### Agent Status Endpoints (`/v1/agent-status`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get current agent's status details |
| PUT | `/me` | Update current agent's status |
| POST | `/me/toggle-online` | Toggle online/offline status |
| POST | `/me/accepting-chats` | Toggle accepting new chats |
| POST | `/me/heartbeat` | Record activity (prevent auto-away) |
| PATCH | `/me/settings` | Update auto-away settings |
| GET | `/me/history` | Get status change history |
| GET | `/online` | Get all online agents |
| GET | `/summary` | Get status summary (admin) |
| POST | `/:agentId/force-logout` | Force logout agent (admin) |

### Schedule Endpoints (`/v1/agent-status/me/schedules`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all schedules |
| POST | `/` | Create a schedule |
| PUT | `/` | Set weekly schedule (bulk) |
| PATCH | `/:scheduleId` | Update a schedule |
| DELETE | `/:scheduleId` | Delete a schedule |

### Session Endpoints (`/v1/sessions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get active sessions |
| GET | `/check-auth` | Check if re-auth required |
| GET | `/stats` | Get session statistics |
| POST | `/logout` | Logout current session |
| POST | `/logout-all` | Logout all sessions |
| DELETE | `/:sessionId` | Terminate specific session |

### Admin Scheduler Endpoints (`/v1/admin/scheduler`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/trigger-auto-away` | Manually trigger auto-away check |
| POST | `/trigger-session-timeout` | Manually trigger timeout check |
| POST | `/trigger-schedule-check` | Manually trigger schedule check |
| POST | `/trigger-overload-check` | Manually trigger overload check |

---

## Automatic Schedulers

The system includes automatic background tasks that run on schedules:

### 1. Auto-Away Check (Every 1 minute)
- Checks for agents who have been inactive
- Switches to "away" status after `autoAwayMinutes` of inactivity

### 2. Session Timeout Check (Every 5 minutes)
- Checks for sessions that have exceeded timeout
- Logs out inactive users automatically
- Sets agent status to offline

### 3. Schedule Availability Check (Every 1 minute)
- Checks agents with `scheduleEnabled = true`
- Automatically sets online/offline based on work schedule

### 4. Overload Check (Every 30 seconds)
- Monitors active chat counts
- Switches to "busy" when at max capacity
- Reverts to "online" when capacity available

### 5. Session Cleanup (Every hour)
- Removes expired session records
- Maintains database hygiene

---

## Security

### Token-Based Authentication

All status update endpoints use token-based authentication, ensuring:
- Agents can only update their own status
- No agent ID required in requests (extracted from token)
- Prevents one agent from changing another's status

### Role-Based Access

Certain endpoints require elevated privileges:
- **Force Logout**: Admin or Supervisor only
- **Scheduler Triggers**: Admin only

### Session Security

- Sessions track IP address and user agent
- Token hashing for storage
- Automatic expiry enforcement
- Forced logout capability for security incidents

---

## Usage Examples

### 1. Update Agent Status

```http
PUT /v1/agent-status/me
Authorization: Bearer <token>
Content-Type: application/json

{
    "status": "online",
    "reason": "Starting my shift"
}
```

### 2. Set Weekly Schedule

```http
PUT /v1/agent-status/me/schedules
Authorization: Bearer <token>
Content-Type: application/json

[
    {
        "dayOfWeek": 0,
        "startTime": "09:00",
        "endTime": "17:00",
        "isActive": true,
        "timezone": "America/New_York"
    },
    {
        "dayOfWeek": 1,
        "startTime": "09:00",
        "endTime": "17:00",
        "isActive": true,
        "timezone": "America/New_York"
    }
]
```

### 3. Send Heartbeat (Prevent Auto-Away)

```http
POST /v1/agent-status/me/heartbeat
Authorization: Bearer <token>
```

### 4. Check Re-Authentication Required

```http
GET /v1/sessions/check-auth
Authorization: Bearer <token>

Response:
{
    "requiresReauth": false
}

// Or if re-auth needed:
{
    "requiresReauth": true,
    "reason": "Session expired"
}
```

### 5. Get Status Details

```http
GET /v1/agent-status/me
Authorization: Bearer <token>

Response:
{
    "agent": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "status": "online",
        "acceptingChats": true,
        "maxConcurrentChats": 5
    },
    "activity": {
        "lastActivityAt": "2026-01-10T10:30:00Z",
        "lastLoginAt": "2026-01-10T09:00:00Z",
        "autoAwayMinutes": 15,
        "sessionTimeoutMinutes": 60
    },
    "session": {
        "id": "session-uuid",
        "createdAt": "2026-01-10T09:00:00Z",
        "lastActivityAt": "2026-01-10T10:30:00Z",
        "expiresAt": "2026-01-10T11:30:00Z"
    },
    "workload": {
        "activeChats": 3,
        "maxConcurrentChats": 5,
        "availability": 40,
        "isOverloaded": false
    },
    "schedule": {
        "enabled": true,
        "isWithinSchedule": true,
        "schedules": [...]
    }
}
```

---

## Files Created/Modified

### New Files

| File | Description |
|------|-------------|
| `src/database/mysql/agent-session.entity.ts` | Session entity |
| `src/database/mysql/agent-schedule.entity.ts` | Schedule entity |
| `src/database/mysql/agent-status-log.entity.ts` | Status log entity |
| `src/agents/agent-status.service.ts` | Status management service |
| `src/agents/agent-status.controller.ts` | Status API controller |
| `src/agents/session.controller.ts` | Session API controller |
| `src/agents/agent-scheduler.service.ts` | Automatic schedulers |
| `src/agents/scheduler.controller.ts` | Admin scheduler triggers |
| `src/agents/dto/update-status.dto.ts` | Status update DTO |
| `src/agents/dto/schedule.dto.ts` | Schedule DTOs |
| `src/agents/dto/auto-away.dto.ts` | Auto-away settings DTO |
| `src/agents/dto/toggle-availability.dto.ts` | Availability toggle DTO |
| `postman/Agent_Status_Management_API.postman_collection.json` | Postman collection |

### Modified Files

| File | Changes |
|------|---------|
| `src/database/mysql/agent.entity.ts` | Added new fields and status values |
| `src/agents/agents.module.ts` | Added new services and controllers |
| `src/auth/auth.service.ts` | Session creation on login |
| `src/auth/auth.module.ts` | Added AgentSession entity |
| `src/auth/auth.controller.ts` | Added IP/user-agent capture |

---

## Postman Collection

A Postman collection has been created at:
```
postman/Agent_Status_Management_API.postman_collection.json
```

Import this into Postman to test all endpoints. The collection includes:
- Automatic token saving on login
- Environment variables for base URL and token
- Pre-configured request bodies
- Documentation for each endpoint

---

## Configuration

### Environment Variables

No new environment variables required. The system uses existing JWT configuration.

### Default Settings

| Setting | Default | Range |
|---------|---------|-------|
| Auto-away minutes | 15 | 1-120 |
| Session timeout minutes | 60 | 5-480 |
| Max concurrent chats | 5 | 1-20 |
| Schedule enabled | false | - |

---

## Notes

- TypeORM `synchronize: true` will automatically create/update database tables
- All timestamps are stored in UTC
- Status changes are logged for audit purposes
- Heartbeat should be called every 5 minutes to prevent auto-away
