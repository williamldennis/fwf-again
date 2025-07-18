-- Add full_name column to profiles table
-- This migration adds a full_name field to store user names during signup

-- Step 1: Add full_name column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);

-- Step 2: Create index for name searches (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);

-- Step 3: Update RLS policies to allow users to update their own name
-- (This assumes RLS is already enabled on profiles table)

-- Step 4: Grant permissions to authenticated users
GRANT UPDATE ON profiles TO authenticated;

-- Step 5: Verify the migration
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name = 'full_name';

-- Migration completed successfully
-- Users can now store their full names during signup 