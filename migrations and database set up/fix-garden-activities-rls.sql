-- 🔧 Fix Garden Activities RLS Policy
-- Update RLS policy to allow users to see activities where they are either garden owner or actor
-- Run this in your Supabase SQL Editor

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view activities in their own garden" ON garden_activities;

-- Create new policy that allows users to see activities where they are garden owner OR actor
CREATE POLICY "Users can view activities in their own garden or where they are actor" ON garden_activities
  FOR SELECT USING (auth.uid() = garden_owner_id OR auth.uid() = actor_id);

-- The insert policy remains the same since users should only be able to insert activities in their own garden
-- (when they log activities for their own garden) 