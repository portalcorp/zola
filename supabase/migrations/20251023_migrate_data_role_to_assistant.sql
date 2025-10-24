-- AI SDK 5 Migration: Convert 'data' role to 'assistant'
-- This migration converts all messages with role 'data' to 'assistant'
-- to be compatible with AI SDK v5 which doesn't support the 'data' role

-- Step 1: Backup the messages table (optional but recommended)
-- CREATE TABLE messages_backup_before_v5 AS SELECT * FROM messages;

-- Step 2: Update all 'data' roles to 'assistant'
UPDATE messages 
SET role = 'assistant' 
WHERE role = 'data';

-- Step 3: Modify the check constraint to only allow v5-compatible roles
-- First drop the existing constraint
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_role_check;

-- Add new constraint that only allows v5-compatible roles
ALTER TABLE messages 
ADD CONSTRAINT messages_role_check 
CHECK (role IN ('system', 'user', 'assistant'));

-- Step 4: Verify the migration (optional)
-- SELECT COUNT(*) as data_role_count FROM messages WHERE role = 'data';
-- Should return 0

-- Note: This migration is NOT reversible once the constraint is updated
-- Make sure to have a backup before running this migration
