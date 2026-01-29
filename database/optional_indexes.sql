-- Optional Performance Indexes
-- Run these manually when you have time (not critical for deployment)
-- The optimized queries will work fine without these, but they'll make things even faster

-- Connect to database:
-- gcloud sql connect livechatlog-mysql --project=livechat-application-481611 --user=root
-- USE livechatlog_database;

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_agent ON conversations(assignedAgentId);
CREATE INDEX IF NOT EXISTS idx_conversations_status_assigned ON conversations(status, assignedAgentId);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(createdAt);

-- Threads indexes
CREATE INDEX IF NOT EXISTS idx_threads_conversation ON threads(conversationId);
CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status);
CREATE INDEX IF NOT EXISTS idx_threads_conversation_status ON threads(conversationId, status);

-- Events indexes (for future optimization)
CREATE INDEX IF NOT EXISTS idx_events_thread ON events(threadId);
CREATE INDEX IF NOT EXISTS idx_events_thread_created ON events(threadId, createdAt DESC);

-- Verify
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'livechatlog_database'
AND TABLE_NAME IN ('conversations', 'threads', 'events')
AND INDEX_NAME LIKE 'idx_%'
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;
