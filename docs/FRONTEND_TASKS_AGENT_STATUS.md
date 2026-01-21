# Frontend Tasks - Agent Status Management API

## 🎯 Task 1: Status Toggle & Display

**Status Badge Colors:**
- 🟢 `online` - Green | ⚫ `offline` - Gray | 🟡 `away` - Yellow | 🔴 `busy` - Red | 🔵 `available` - Blue

**API Endpoints:**
```javascript
// Toggle online/offline
POST /v1/agent-status/me/toggle-online
// How it works:
// - If status is 'offline' → changes to 'online'
// - If status is 'online/away/busy/available' → changes to 'offline'
// - Updates lastActivityAt and lastLoginAt/lastLogoutAt timestamps

// Set specific status
PUT /v1/agent-status/me
Body: { "status": "online|offline|away|busy|available", "reason": "optional" }
// How it works:
// - Manually change agent status to any value
// - Logs status change with reason (manual)
// - Agent can override auto-set statuses (away/busy) back to online
// - Updates lastActivityAt timestamp
```

---

## 🎯 Task 2: Status Dashboard

**API Endpoint:**
```javascript
GET /v1/agent-status/me
Response: {
  agent: { id, name, status, acceptingChats, maxConcurrentChats },
  activity: { lastActivityAt, autoAwayMinutes, sessionTimeoutMinutes },
  session: { id, expiresAt },
  workload: { activeChats, maxConcurrentChats, availability, isOverloaded },
  schedule: { enabled, isWithinSchedule, schedules }
}
// How it works:
// - Returns complete agent status information
// - 'isOverloaded' = true when activeChats >= maxConcurrentChats (triggers auto-busy)
// - 'availability' = percentage of available chat slots
// - 'isWithinSchedule' = true if current time matches schedule (triggers auto-online/offline)
```
Poll every 30-60 seconds for updates.

---

## 🎯 Task 3: Heartbeat (Auto-Away Prevention)

**API Endpoint:**
```javascript
POST /v1/agent-status/me/heartbeat
// How it works:
// - Updates lastActivityAt timestamp
// - Prevents auto-away trigger (away happens after autoAwayMinutes of inactivity)
// - Keeps session active and prevents session timeout
// - Does NOT change status, only records activity
```
- Call every 5 minutes if user is active
- Track mouse/keyboard activity
- Show warning at 80% of `autoAwayMinutes`
- Stop when page hidden (`document.hidden`)

---

## 🎯 Task 4: Session Management

**API Endpoints:**
```javascript
// Check if re-auth needed
GET /v1/sessions/check-auth
Response: { requiresReauth: boolean, reason: string }
// How it works:
// - Checks if current session is still valid
// - Returns true if session expired, forced logout, or not found
// - Session expires after sessionTimeoutMinutes of inactivity

// Get all sessions
GET /v1/sessions
// How it works:
// - Returns all active sessions for current agent
// - Shows sessions from different devices/browsers
// - Each session has: id, ipAddress, userAgent, lastActivityAt, createdAt

// Logout current session
POST /v1/sessions/logout
Body: { "reason": "optional" }
// How it works:
// - Logs out from current session only
// - If this is the last active session → agent status changes to 'offline'
// - Updates lastLogoutAt timestamp

// Logout all sessions
POST /v1/sessions/logout-all
Body: { "reason": "optional" }
// How it works:
// - Terminates ALL active sessions for the agent
// - Agent status changes to 'offline'
// - Useful when user suspects unauthorized access

// Delete specific session
DELETE /v1/sessions/:sessionId
// How it works:
// - Terminate a specific session by ID
// - Agent can only delete own sessions (unless admin)
// - Used to logout from a specific device
```
- Check auth every 2-3 minutes
- Handle 401 responses → redirect to login
- Show re-auth modal 5 minutes before expiry

---

## 🎯 Task 5: Work Schedule

**API Endpoints:**
```javascript
// Get schedules
GET /v1/agent-status/me/schedules
// How it works:
// - Returns weekly schedule for agent
// - Each entry has: dayOfWeek (0-6), startTime, endTime, isActive

// Create single schedule
POST /v1/agent-status/me/schedules
Body: {
  "dayOfWeek": 0-6, // 0=Monday, 6=Sunday
  "startTime": "09:00",
  "endTime": "17:00",
  "isActive": true,
  "timezone": "America/New_York"
}
// How it works:
// - Creates schedule for specific day
// - Fails if schedule already exists for that day (use PATCH to update)

// Bulk update all schedules (recommended)
PUT /v1/agent-status/me/schedules
Body: [{ dayOfWeek, startTime, endTime, isActive, timezone }, ...]
// How it works:
// - Deletes ALL existing schedules and creates new ones
// - Best for setting up complete weekly schedule at once
// - If scheduleEnabled=true, agent will auto-online/offline based on these times

// Update specific schedule
PATCH /v1/agent-status/me/schedules/:scheduleId
Body: { "startTime": "08:00", "endTime": "16:00" }
// How it works:
// - Updates specific schedule by ID
// - Only updates provided fields (partial update)

// Delete schedule
DELETE /v1/agent-status/me/schedules/:scheduleId
// How it works:
// - Removes schedule for specific day
// - Agent won't be auto-managed on that day anymore
```
**Schedule Automation:**
- When `scheduleEnabled=true` and within schedule hours → auto changes to 'online'
- When outside schedule hours → auto changes to 'offline'
- Scheduler runs every minute to check schedules

---

## 🎯 Task 6: Auto-Away Settings

**API Endpoint:**
```javascript
PATCH /v1/agent-status/me/settings
Body: {
  "autoAwayMinutes": 15,        // 1-120, default: 15
  "sessionTimeoutMinutes": 60,  // 5-480, default: 60
  "scheduleEnabled": true
}
// How it works:
// - autoAwayMinutes: After X minutes of no activity → status changes 'online' to 'away'
// - sessionTimeoutMinutes: After X minutes → session expires and logs out (status → 'offline')
// - scheduleEnabled: Enable/disable automatic online/offline based on work schedule
// - Settings are per-agent, not global
```

---

## 🎯 Task 7: Status History

**API Endpoint:**
```javascript
GET /v1/agent-status/me/history?limit=50
Response: [{
  id, previousStatus, newStatus, 
  reason: "manual|auto_away|schedule|overload|session_timeout|login|logout|system",
  details, createdAt
}]
// How it works:
// - Returns audit log of all status changes
// - 'reason' shows what triggered the change:
//   - manual: Agent manually changed status
//   - auto_away: Inactive for autoAwayMinutes
//   - schedule: Schedule-based auto-online/offline
//   - overload: Reached maxConcurrentChats (online → busy)
//   - session_timeout: Session expired
//   - login/logout: Agent logged in/out
//   - system: System triggered (e.g., busy → online when chats reduced)
```

---

## 🎯 Task 8: Accept Chats Toggle

**API Endpoint:**
```javascript
POST /v1/agent-status/me/accepting-chats
Body: { "acceptingChats": true|false }
// How it works:
// - Toggle acceptingChats flag without changing status
// - When false: agent stays 'online' but won't receive new chat assignments
// - When true: agent can receive new chats again
// - Does NOT affect existing active chats
// - Useful for agents who need a break but want to stay online
```
Show "⏸️ Paused" banner when false.

---

## 🎯 Task 9: Admin Features

**API Endpoints:**
```javascript
// Agent summary
GET /v1/agent-status/summary
Response: { total, online, offline, away, busy, available, acceptingChats }
// How it works:
// - Returns count of agents by status
// - Shows how many are accepting chats vs not accepting
// - Admin/supervisor dashboard overview

// Online agents list
GET /v1/agent-status/online
// How it works:
// - Returns all agents with status: 'online', 'available', or 'busy'
// - Excludes 'offline' and 'away' agents
// - Shows available agents for chat routing

// Force logout (admin only)
POST /v1/agent-status/:agentId/force-logout
Body: { "reason": "required" }
// How it works:
// - Admin/supervisor can force logout any agent
// - Terminates ALL sessions for that agent
// - Agent status changes to 'offline'
// - Agent sees "Logged out by administrator" message
// - Requires admin or supervisor role

// Session stats
GET /v1/sessions/stats
Response: { active, expired, loggedOut, forcedLogout, total, sessionsToday }
// How it works:
// - Returns overall session statistics
// - Shows session counts by status
// - Admin monitoring dashboard
```

---

## 🎯 Task 10: Manual Scheduler Triggers (Admin Only)

**API Endpoints:**
```javascript
POST /v1/admin/scheduler/trigger-auto-away
// How it works:
// - Manually runs the auto-away check
// - Finds agents with status='online' who haven't had activity for autoAwayMinutes
// - Changes their status from 'online' → 'away'
// - Returns: { processed, awayCount }

POST /v1/admin/scheduler/trigger-session-timeout
// How it works:
// - Manually runs session timeout check
// - Finds agents inactive for sessionTimeoutMinutes
// - Expires their sessions and sets status to 'offline'
// - Returns: { processed, timedOut }

POST /v1/admin/scheduler/trigger-schedule-check
// How it works:
// - Manually runs schedule availability check
// - Checks agents with scheduleEnabled=true
// - If within schedule hours and offline → changes to 'online'
// - If outside schedule hours → changes to 'offline'
// - Returns: { processed, updated }

POST /v1/admin/scheduler/trigger-overload-check
// How it works:
// - Manually runs overload/capacity check
// - If agent has activeChats >= maxConcurrentChats → changes 'online' to 'busy'
// - If busy agent has activeChats < maxConcurrentChats → changes 'busy' back to 'online'
// - Returns: { processed, busy }
```
**Note:** These auto-run in background:
- Auto-away: Every 1 minute
- Session timeout: Every 5 minutes
- Schedule check: Every 1 minute
- Overload check: Every 30 seconds

---

## 📊 Automatic Status Flow Diagram

```
LOGIN → online
  ↓
  ├─ No activity for autoAwayMinutes → away
  │   └─ Agent can manually change back to online
  │
  ├─ Active chats >= maxConcurrentChats → busy
  │   └─ When chats reduce → back to online
  │
  ├─ Outside schedule hours (if enabled) → offline
  │   └─ Within schedule hours → back to online
  │
  └─ No activity for sessionTimeoutMinutes → offline (logged out)

MANUAL STATUS CHANGE → any status (overrides automatic changes)
```

---

## 📦 Notes

- All endpoints require `Authorization: Bearer <token>` header
- Use optimistic UI updates for better UX
- Cache status data for 30-60 seconds
- Handle errors gracefully with user-friendly messages
- Poll heartbeat every 5 minutes, status every 30-60 seconds

**Documentation:** See `AGENT_STATUS_MANAGEMENT.md` for full details  
**Postman:** Import `postman/Agent_Status_Management_API.postman_collection.json`
