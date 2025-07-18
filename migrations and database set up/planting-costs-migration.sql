-- Planting Costs Migration
-- Adds planting_cost column to plants table with tiered pricing

-- Step 1: Add planting_cost column to plants table
ALTER TABLE plants ADD COLUMN planting_cost INTEGER DEFAULT 5;

-- Step 2: Update existing plants with tiered planting costs
-- Based on growth time and strategic value
UPDATE plants SET planting_cost = 3  WHERE name = 'Mushroom';       -- 2 hours, fast grower
UPDATE plants SET planting_cost = 4  WHERE name = 'Cactus';         -- 3 hours, medium-fast
UPDATE plants SET planting_cost = 5  WHERE name = 'Sunflower';      -- 4 hours, medium
UPDATE plants SET planting_cost = 7  WHERE name = 'Water Lily';     -- 5 hours, medium-slow
UPDATE plants SET planting_cost = 8  WHERE name = 'Fern';           -- 6 hours, slow grower
UPDATE plants SET planting_cost = 12 WHERE name = 'Pine Tree';      -- 8 hours, longest grower

-- Step 3: Make planting_cost NOT NULL after setting values
ALTER TABLE plants ALTER COLUMN planting_cost SET NOT NULL;

-- Step 4: Verify the updates
SELECT 
    name, 
    growth_time_hours, 
    harvest_points, 
    planting_cost,
    (harvest_points - planting_cost) as profit
FROM plants 
ORDER BY planting_cost ASC; 