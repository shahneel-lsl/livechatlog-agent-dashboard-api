-- Migration: Add environment field to conversations table
-- Date: 2026-02-02
-- Purpose: Store visitor's device OS, browser, and device type for troubleshooting

-- Add environment column to store device/browser information
ALTER TABLE conversations 
ADD COLUMN environment JSON NULL 
AFTER notes;

-- Add comment to document the field structure
ALTER TABLE conversations 
MODIFY COLUMN environment JSON NULL 
COMMENT 'Stores visitor environment info: { os: { name, version }, browser: { name, version }, device: { type } }';

-- Optional: Create a virtual column index for environment.os.name if needed for queries
-- ALTER TABLE conversations ADD INDEX idx_conversations_environment_os ((CAST(environment->>'$.os.name' AS CHAR(50))));
