-- Migration: Add visibility and messages fields to canned_responses table
-- Date: 2026-01-20

-- Add visibility column with default 'shared'
ALTER TABLE canned_responses 
ADD COLUMN visibility ENUM('shared', 'private') NOT NULL DEFAULT 'shared' 
AFTER category;

-- Add messages column for multiple messages support (JSON array)
ALTER TABLE canned_responses 
ADD COLUMN messages JSON NULL 
AFTER message;

-- Create index on visibility for faster filtering
CREATE INDEX idx_canned_responses_visibility ON canned_responses(visibility);

-- Create index on createdBy for faster private response queries
CREATE INDEX idx_canned_responses_created_by ON canned_responses(created_by);

-- Update existing records to have 'shared' visibility (already default)
UPDATE canned_responses SET visibility = 'shared' WHERE visibility IS NULL;
