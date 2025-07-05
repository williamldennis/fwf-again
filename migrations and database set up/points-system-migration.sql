-- Points System Migration
-- Adds points column to profiles and harvest_points to plants

-- Step 1: Add points column to profiles table
ALTER TABLE profiles ADD COLUMN points INTEGER DEFAULT 0;

-- Step 2: Add harvest_points column to plants table
ALTER TABLE plants ADD COLUMN harvest_points INTEGER;

-- Step 3: Update existing plants with point values
-- Based on growth time and weather complexity
UPDATE plants SET harvest_points = 10 WHERE name = 'Sunflower';      -- 4 hours, sunny preference
UPDATE plants SET harvest_points = 8  WHERE name = 'Mushroom';       -- 2 hours, rainy preference (fastest)
UPDATE plants SET harvest_points = 15 WHERE name = 'Fern';           -- 6 hours, cloudy preference
UPDATE plants SET harvest_points = 12 WHERE name = 'Cactus';         -- 3 hours, sunny preference
UPDATE plants SET harvest_points = 18 WHERE name = 'Water Lily';     -- 5 hours, rainy preference
UPDATE plants SET harvest_points = 25 WHERE name = 'Pine Tree';      -- 8 hours, cloudy preference (longest)

-- Step 4: Verify the updates
SELECT name, growth_time_hours, harvest_points FROM plants ORDER BY harvest_points DESC; 