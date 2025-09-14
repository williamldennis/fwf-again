-- Add last_checked_activity_at_timestamp column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_checked_activity_at TIMESTAMP;

-- (Optional) Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_checked_activity ON profiles(last_checked_activity_at);

-- (Optional) Grant update permission to authenticated users
GRANT UPDATE ON profiles TO authenticated;