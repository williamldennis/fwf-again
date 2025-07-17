-- Fix for ambiguous column reference in get_user_xp_summary function
-- Drop the existing function and recreate it with proper column aliases

DROP FUNCTION IF EXISTS get_user_xp_summary(UUID);

-- Function to get user's XP summary (fixed version)
CREATE OR REPLACE FUNCTION get_user_xp_summary(user_uuid UUID)
RETURNS TABLE(
  total_xp INTEGER,
  current_level INTEGER,
  xp_to_next_level INTEGER,
  xp_progress INTEGER
) AS $$
DECLARE
  user_total_xp INTEGER;
  user_current_level INTEGER;
  user_xp_to_next_level INTEGER;
BEGIN
  -- Get user profile data with explicit column selection
  SELECT p.total_xp, p.current_level, p.xp_to_next_level
  INTO user_total_xp, user_current_level, user_xp_to_next_level
  FROM profiles p
  WHERE p.id = user_uuid;
  
  IF user_total_xp IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate XP progress toward next level
  DECLARE
    xp_for_current_level INTEGER;
    xp_for_next_level INTEGER;
  BEGIN
    -- Calculate XP required for current level
    IF user_current_level = 1 THEN
      xp_for_current_level := 0;
    ELSE
      xp_for_current_level := (
        SELECT SUM(xp_requirement)
        FROM (
          SELECT calculate_xp_to_next_level(level) as xp_requirement
          FROM generate_series(1, user_current_level - 1) as level
        ) as requirements
      );
    END IF;
    
    -- Calculate XP required for next level
    xp_for_next_level := xp_for_current_level + user_xp_to_next_level;
    
    -- Calculate progress percentage
    RETURN QUERY SELECT
      user_total_xp,
      user_current_level,
      user_xp_to_next_level,
      CASE 
        WHEN user_current_level = 50 THEN 100
        ELSE ((user_total_xp - xp_for_current_level) * 100) / user_xp_to_next_level
      END;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the fixed function
GRANT EXECUTE ON FUNCTION get_user_xp_summary(UUID) TO authenticated; 