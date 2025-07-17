-- ============================================================================
-- Achievement Functions Fix - Ambiguous Column References
-- ============================================================================
-- This migration fixes the ambiguous column reference errors in achievement functions
-- Run this after the main xp-system-migration.sql

-- Drop existing functions first (required to change parameter names)
DROP FUNCTION IF EXISTS has_achievement(UUID, VARCHAR(100));
DROP FUNCTION IF EXISTS unlock_achievement(UUID, VARCHAR(100), JSONB);
DROP FUNCTION IF EXISTS update_achievement_progress(UUID, VARCHAR(100), JSONB);

-- Fix the has_achievement function to resolve ambiguous achievement_id reference
CREATE OR REPLACE FUNCTION has_achievement(user_uuid UUID, achievement_id_param VARCHAR(100))
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM user_achievements 
    WHERE user_id = user_uuid AND achievement_id = achievement_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the unlock_achievement function to resolve ambiguous achievement_id reference
CREATE OR REPLACE FUNCTION unlock_achievement(
  user_uuid UUID,
  achievement_id_param VARCHAR(100),
  progress_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_achievements (user_id, achievement_id, progress_data)
  VALUES (user_uuid, achievement_id_param, progress_data)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the update_achievement_progress function to resolve ambiguous achievement_id reference
CREATE OR REPLACE FUNCTION update_achievement_progress(
  user_uuid UUID,
  achievement_id_param VARCHAR(100),
  progress_data JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_achievements 
  SET progress_data = progress_data,
      updated_at = NOW()
  WHERE user_id = user_uuid AND achievement_id = achievement_id_param;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant Permissions (Re-grant after function updates)
-- ============================================================================

-- Grant execute permissions on updated functions
GRANT EXECUTE ON FUNCTION has_achievement(UUID, VARCHAR(100)) TO authenticated;
GRANT EXECUTE ON FUNCTION unlock_achievement(UUID, VARCHAR(100), JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_achievement_progress(UUID, VARCHAR(100), JSONB) TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================

-- Test the fixed functions (uncomment to test)
-- SELECT has_achievement('00000000-0000-0000-0000-000000000000', 'test_achievement');
-- SELECT unlock_achievement('00000000-0000-0000-0000-000000000000', 'test_achievement', '{}');
-- SELECT update_achievement_progress('00000000-0000-0000-0000-000000000000', 'test_achievement', '{}');

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- This migration fixes:
-- ✅ Ambiguous column reference 'achievement_id' in has_achievement function
-- ✅ Ambiguous column reference 'achievement_id' in unlock_achievement function  
-- ✅ Ambiguous column reference 'achievement_id' in update_achievement_progress function
-- ✅ Re-grants necessary permissions on updated functions 