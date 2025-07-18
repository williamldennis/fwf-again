-- Make Sunflower Free Migration
-- Updates sunflower to be free to plant (0 points) to encourage new user engagement

-- Step 1: Update sunflower to be free
UPDATE plants SET planting_cost = 0 WHERE name = 'Sunflower';

-- Step 2: Verify the update
SELECT 
    name, 
    growth_time_hours, 
    harvest_points, 
    planting_cost,
    (harvest_points - planting_cost) as profit
FROM plants 
WHERE name = 'Sunflower';

-- Step 3: Show all plants for reference
SELECT 
    name, 
    growth_time_hours, 
    harvest_points, 
    planting_cost,
    (harvest_points - planting_cost) as profit
FROM plants 
ORDER BY planting_cost ASC; 