-- Adjust Sunflower Harvest Points Migration
-- Updates sunflower harvest points from 10 to 5 to maintain game balance
-- Since sunflower is now free to plant (0 points), reducing harvest from 10 to 5
-- keeps the profit at 5 points, which is balanced with other plants

-- Step 1: Update sunflower harvest points
UPDATE plants SET harvest_points = 5 WHERE name = 'Sunflower';

-- Step 2: Verify the update
SELECT 
    name, 
    growth_time_hours, 
    harvest_points, 
    planting_cost,
    (harvest_points - planting_cost) as profit
FROM plants 
WHERE name = 'Sunflower';

-- Step 3: Show all plants for reference (profit should be balanced)
SELECT 
    name, 
    growth_time_hours, 
    harvest_points, 
    planting_cost,
    (harvest_points - planting_cost) as profit
FROM plants 
ORDER BY planting_cost ASC; 