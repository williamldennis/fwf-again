-- 🌱 XP System Database Migration
-- Run this script in your Supabase SQL Editor
-- This migration implements Tasks 1.1, 1.2, and 1.3 from XP_TODO.md

-- ============================================================================
-- TASK 1.1: Create XP Transactions Table
-- ============================================================================

-- Create xp_transactions table to track all XP earnings
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  action_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  context_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_action_type ON xp_transactions(action_type);

-- ============================================================================
-- TASK 1.2: Extend Profiles Table with XP Fields
-- ============================================================================

-- Add XP-related columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS xp_to_next_level INTEGER DEFAULT 100;

-- Create index for XP queries
CREATE INDEX IF NOT EXISTS idx_profiles_total_xp ON profiles(total_xp);
CREATE INDEX IF NOT EXISTS idx_profiles_current_level ON profiles(current_level);

-- ============================================================================
-- TASK 1.3: Create User Achievements Table
-- ============================================================================

-- Create user_achievements table to track unlocked achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id VARCHAR(100) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  progress_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- XP Transactions policies
CREATE POLICY "Users can view their own XP transactions" ON xp_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP transactions" ON xp_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Achievements policies
CREATE POLICY "Users can view their own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements" ON user_achievements
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- XP System Functions
-- ============================================================================

-- Function to calculate level from total XP
CREATE OR REPLACE FUNCTION calculate_level_from_xp(total_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Level calculation based on XP_LEVELS_SPEC.md
  IF total_xp < 100 THEN RETURN 1;
  ELSIF total_xp < 250 THEN RETURN 2;
  ELSIF total_xp < 450 THEN RETURN 3;
  ELSIF total_xp < 700 THEN RETURN 4;
  ELSIF total_xp < 1000 THEN RETURN 5;
  ELSIF total_xp < 1350 THEN RETURN 6;
  ELSIF total_xp < 1750 THEN RETURN 7;
  ELSIF total_xp < 2200 THEN RETURN 8;
  ELSIF total_xp < 2700 THEN RETURN 9;
  ELSIF total_xp < 3300 THEN RETURN 10;
  ELSIF total_xp < 4100 THEN RETURN 11;
  ELSIF total_xp < 4900 THEN RETURN 12;
  ELSIF total_xp < 5700 THEN RETURN 13;
  ELSIF total_xp < 6500 THEN RETURN 14;
  ELSIF total_xp < 7500 THEN RETURN 15;
  ELSIF total_xp < 8500 THEN RETURN 16;
  ELSIF total_xp < 9700 THEN RETURN 17;
  ELSIF total_xp < 10900 THEN RETURN 18;
  ELSIF total_xp < 12100 THEN RETURN 19;
  ELSIF total_xp < 13700 THEN RETURN 20;
  ELSIF total_xp < 15300 THEN RETURN 21;
  ELSIF total_xp < 16900 THEN RETURN 22;
  ELSIF total_xp < 18700 THEN RETURN 23;
  ELSIF total_xp < 20500 THEN RETURN 24;
  ELSIF total_xp < 22700 THEN RETURN 25;
  ELSIF total_xp < 24900 THEN RETURN 26;
  ELSIF total_xp < 27100 THEN RETURN 27;
  ELSIF total_xp < 29300 THEN RETURN 28;
  ELSIF total_xp < 31500 THEN RETURN 29;
  ELSIF total_xp < 33700 THEN RETURN 30;
  ELSIF total_xp < 35900 THEN RETURN 31;
  ELSIF total_xp < 38100 THEN RETURN 32;
  ELSIF total_xp < 40300 THEN RETURN 33;
  ELSIF total_xp < 42500 THEN RETURN 34;
  ELSIF total_xp < 44700 THEN RETURN 35;
  ELSIF total_xp < 46900 THEN RETURN 36;
  ELSIF total_xp < 49100 THEN RETURN 37;
  ELSIF total_xp < 51300 THEN RETURN 38;
  ELSIF total_xp < 53500 THEN RETURN 39;
  ELSIF total_xp < 55700 THEN RETURN 40;
  ELSIF total_xp < 57900 THEN RETURN 41;
  ELSIF total_xp < 60100 THEN RETURN 42;
  ELSIF total_xp < 62300 THEN RETURN 43;
  ELSIF total_xp < 64500 THEN RETURN 44;
  ELSIF total_xp < 66700 THEN RETURN 45;
  ELSIF total_xp < 68900 THEN RETURN 46;
  ELSIF total_xp < 71100 THEN RETURN 47;
  ELSIF total_xp < 73300 THEN RETURN 48;
  ELSIF total_xp < 75500 THEN RETURN 49;
  ELSE RETURN 50;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate XP needed for next level
CREATE OR REPLACE FUNCTION calculate_xp_to_next_level(current_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- XP requirements based on XP_LEVELS_SPEC.md
  CASE current_level
    WHEN 1 THEN RETURN 100;
    WHEN 2 THEN RETURN 150;
    WHEN 3 THEN RETURN 200;
    WHEN 4 THEN RETURN 250;
    WHEN 5 THEN RETURN 300;
    WHEN 6 THEN RETURN 350;
    WHEN 7 THEN RETURN 400;
    WHEN 8 THEN RETURN 450;
    WHEN 9 THEN RETURN 500;
    WHEN 10 THEN RETURN 600;
    WHEN 11 THEN RETURN 700;
    WHEN 12 THEN RETURN 800;
    WHEN 13 THEN RETURN 900;
    WHEN 14 THEN RETURN 1000;
    WHEN 15 THEN RETURN 1200;
    WHEN 16 THEN RETURN 1400;
    WHEN 17 THEN RETURN 1600;
    WHEN 18 THEN RETURN 1800;
    WHEN 19 THEN RETURN 2000;
    WHEN 20 THEN RETURN 2200;
    WHEN 21 THEN RETURN 2400;
    WHEN 22 THEN RETURN 2600;
    WHEN 23 THEN RETURN 2800;
    WHEN 24 THEN RETURN 3000;
    WHEN 25 THEN RETURN 3200;
    WHEN 26 THEN RETURN 3400;
    WHEN 27 THEN RETURN 3600;
    WHEN 28 THEN RETURN 3800;
    WHEN 29 THEN RETURN 4000;
    WHEN 30 THEN RETURN 4200;
    WHEN 31 THEN RETURN 4400;
    WHEN 32 THEN RETURN 4600;
    WHEN 33 THEN RETURN 4800;
    WHEN 34 THEN RETURN 5000;
    WHEN 35 THEN RETURN 5200;
    WHEN 36 THEN RETURN 5400;
    WHEN 37 THEN RETURN 5600;
    WHEN 38 THEN RETURN 5800;
    WHEN 39 THEN RETURN 6000;
    WHEN 40 THEN RETURN 6200;
    WHEN 41 THEN RETURN 6400;
    WHEN 42 THEN RETURN 6600;
    WHEN 43 THEN RETURN 6800;
    WHEN 44 THEN RETURN 7000;
    WHEN 45 THEN RETURN 7200;
    WHEN 46 THEN RETURN 7400;
    WHEN 47 THEN RETURN 7600;
    WHEN 48 THEN RETURN 7800;
    WHEN 49 THEN RETURN 8000;
    ELSE RETURN 0; -- Level 50 is max level
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award XP and update user profile
CREATE OR REPLACE FUNCTION award_xp(
  user_uuid UUID,
  xp_amount INTEGER,
  action_type VARCHAR(50),
  description TEXT,
  context_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  new_total_xp INTEGER;
  new_level INTEGER;
  new_xp_to_next_level INTEGER;
BEGIN
  -- Insert XP transaction
  INSERT INTO xp_transactions (user_id, amount, action_type, description, context_data)
  VALUES (user_uuid, xp_amount, action_type, description, context_data);
  
  -- Update user's total XP
  UPDATE profiles 
  SET total_xp = total_xp + xp_amount
  WHERE id = user_uuid
  RETURNING total_xp INTO new_total_xp;
  
  -- Calculate new level
  new_level := calculate_level_from_xp(new_total_xp);
  new_xp_to_next_level := calculate_xp_to_next_level(new_level);
  
  -- Update level and XP to next level
  UPDATE profiles 
  SET current_level = new_level,
      xp_to_next_level = new_xp_to_next_level
  WHERE id = user_uuid;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's XP summary
CREATE OR REPLACE FUNCTION get_user_xp_summary(user_uuid UUID)
RETURNS TABLE(
  total_xp INTEGER,
  current_level INTEGER,
  xp_to_next_level INTEGER,
  xp_progress INTEGER
) AS $$
DECLARE
  user_profile RECORD;
BEGIN
  SELECT total_xp, current_level, xp_to_next_level
  INTO user_profile
  FROM profiles
  WHERE id = user_uuid;
  
  IF user_profile IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate XP progress toward next level
  DECLARE
    xp_for_current_level INTEGER;
    xp_for_next_level INTEGER;
  BEGIN
    -- Calculate XP required for current level
    IF user_profile.current_level = 1 THEN
      xp_for_current_level := 0;
    ELSE
      xp_for_current_level := (
        SELECT SUM(xp_requirement)
        FROM (
          SELECT calculate_xp_to_next_level(level) as xp_requirement
          FROM generate_series(1, user_profile.current_level - 1) as level
        ) as requirements
      );
    END IF;
    
    -- Calculate XP required for next level
    xp_for_next_level := xp_for_current_level + user_profile.xp_to_next_level;
    
    -- Calculate progress percentage
    RETURN QUERY SELECT
      user_profile.total_xp,
      user_profile.current_level,
      user_profile.xp_to_next_level,
      CASE 
        WHEN user_profile.current_level = 50 THEN 100
        ELSE ((user_profile.total_xp - xp_for_current_level) * 100) / user_profile.xp_to_next_level
      END;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Achievement System Functions
-- ============================================================================

-- Function to check if user has unlocked an achievement
CREATE OR REPLACE FUNCTION has_achievement(user_uuid UUID, achievement_id VARCHAR(100))
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM user_achievements 
    WHERE user_id = user_uuid AND achievement_id = achievement_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlock achievement
CREATE OR REPLACE FUNCTION unlock_achievement(
  user_uuid UUID,
  achievement_id VARCHAR(100),
  progress_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_achievements (user_id, achievement_id, progress_data)
  VALUES (user_uuid, achievement_id, progress_data)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update achievement progress
CREATE OR REPLACE FUNCTION update_achievement_progress(
  user_uuid UUID,
  achievement_id VARCHAR(100),
  progress_data JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_achievements 
  SET progress_data = progress_data,
      updated_at = NOW()
  WHERE user_id = user_uuid AND achievement_id = achievement_id;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant permissions to authenticated users
GRANT ALL ON xp_transactions TO authenticated;
GRANT ALL ON user_achievements TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_level_from_xp(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_xp_to_next_level(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION award_xp(UUID, INTEGER, VARCHAR(50), TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_xp_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_achievement(UUID, VARCHAR(100)) TO authenticated;
GRANT EXECUTE ON FUNCTION unlock_achievement(UUID, VARCHAR(100), JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_achievement_progress(UUID, VARCHAR(100), JSONB) TO authenticated;

-- ============================================================================
-- Views for Easy Data Access
-- ============================================================================

-- View for user XP and level information
CREATE OR REPLACE VIEW user_xp_summary AS
SELECT 
  p.id as user_id,
  p.total_xp,
  p.current_level,
  p.xp_to_next_level,
  (p.total_xp - COALESCE(
    (SELECT SUM(calculate_xp_to_next_level(level))
     FROM generate_series(1, p.current_level - 1) as level), 0
  )) * 100 / p.xp_to_next_level as xp_progress
FROM profiles p
WHERE p.total_xp IS NOT NULL;

-- View for achievement progress
CREATE OR REPLACE VIEW user_achievement_progress AS
SELECT 
  ua.user_id,
  ua.achievement_id,
  ua.unlocked_at,
  ua.progress_data,
  CASE 
    WHEN ua.unlocked_at IS NOT NULL THEN 'unlocked'
    ELSE 'locked'
  END as status
FROM user_achievements ua;

-- Grant access to views
GRANT SELECT ON user_xp_summary TO authenticated;
GRANT SELECT ON user_achievement_progress TO authenticated;

-- ============================================================================
-- Migration for Existing Users
-- ============================================================================

-- Update existing users to have default XP values
UPDATE profiles 
SET total_xp = 0,
    current_level = 1,
    xp_to_next_level = 100
WHERE total_xp IS NULL;

-- ============================================================================
-- Verification Queries (Optional - Remove in production)
-- ============================================================================

-- Verify tables were created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('xp_transactions', 'user_achievements');

-- Verify columns were added to profiles
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name IN ('total_xp', 'current_level', 'xp_to_next_level');

-- Test level calculation function
-- SELECT calculate_level_from_xp(0) as level_0_xp,
--        calculate_level_from_xp(100) as level_1_xp,
--        calculate_level_from_xp(250) as level_2_xp,
--        calculate_level_from_xp(54700) as level_50_xp;

-- Test XP to next level function
-- SELECT calculate_xp_to_next_level(1) as xp_to_level_2,
--        calculate_xp_to_next_level(5) as xp_to_level_6,
--        calculate_xp_to_next_level(10) as xp_to_level_11;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- This migration implements:
-- ✅ Task 1.1: Create XP Transactions Table
-- ✅ Task 1.2: Extend Profiles Table with XP Fields  
-- ✅ Task 1.3: Create User Achievements Table
-- ✅ All necessary indexes, RLS policies, and functions
-- ✅ Migration for existing users

-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify tables and functions were created successfully
-- 3. Proceed to Task 1.4: Create XP Service Foundation 