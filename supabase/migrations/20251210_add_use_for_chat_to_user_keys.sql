-- Add use_for_chat column to user_keys table
-- When true, the user's API key will be used instead of the platform's .env key
-- Default is false, meaning the platform key is used unless explicitly enabled

ALTER TABLE user_keys 
ADD COLUMN IF NOT EXISTS use_for_chat BOOLEAN DEFAULT false;

-- Add a comment explaining the column
COMMENT ON COLUMN user_keys.use_for_chat IS 'When true, use this API key for chat instead of the platform default key';
