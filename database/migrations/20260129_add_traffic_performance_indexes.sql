-- Traffic API Performance Optimization Indexes
-- Created: January 29, 2026
-- Purpose: Add indexes to improve query performance for traffic/visitors endpoints

-- Conversations table indexes
CREATE INDEX IF NOT EXISTS idx_conversations_status 
  ON conversations(status);

CREATE INDEX IF NOT EXISTS idx_conversations_assigned_agent 
  ON conversations(assignedAgentId);

CREATE INDEX IF NOT EXISTS idx_conversations_status_assigned 
  ON conversations(status, assignedAgentId);

CREATE INDEX IF NOT EXISTS idx_conversations_created 
  ON conversations(createdAt DESC);

-- Threads table indexes
CREATE INDEX IF NOT EXISTS idx_threads_conversation 
  ON threads(conversationId);

CREATE INDEX IF NOT EXISTS idx_threads_status 
  ON threads(status);

CREATE INDEX IF NOT EXISTS idx_threads_active_thread 
  ON threads(conversationId, status, id);

-- Events table indexes (for future message loading optimization)
CREATE INDEX IF NOT EXISTS idx_events_thread 
  ON events(threadId);

CREATE INDEX IF NOT EXISTS idx_events_thread_created 
  ON events(threadId, createdAt DESC);

-- Verify indexes created
SHOW INDEXES FROM conversations WHERE Key_name LIKE 'idx_%';
SHOW INDEXES FROM threads WHERE Key_name LIKE 'idx_%';
SHOW INDEXES FROM events WHERE Key_name LIKE 'idx_%';
