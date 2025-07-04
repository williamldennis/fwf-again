-- Test script to verify garden database setup
-- Run this in your Supabase SQL Editor to test the setup

-- Test 1: Check if tables exist
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('plants', 'planted_plants')
ORDER BY table_name, ordinal_position;

-- Test 2: Check if plants were inserted
SELECT 
  name,
  growth_time_hours,
  weather_bonus,
  image_path
FROM plants
ORDER BY name;

-- Test 3: Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('plants', 'planted_plants');

-- Test 4: Test the garden functions
-- (This will only work if you have users in your auth.users table)
-- SELECT get_garden_plant_count('your-user-id-here');
-- SELECT is_garden_full('your-user-id-here');

-- Test 5: Check the garden_data view
SELECT * FROM garden_data LIMIT 5;

-- Test 6: Verify indexes were created
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('plants', 'planted_plants');

-- Expected results:
-- 1. Should show 2 tables with their columns
-- 2. Should show 6 plants (Sunflower, Mushroom, Fern, Cactus, Water Lily, Pine Tree)
-- 3. Should show RLS policies for both tables
-- 4. Garden functions should exist (test with actual user ID)
-- 5. Garden_data view should be accessible
-- 6. Should show indexes on planted_plants table 