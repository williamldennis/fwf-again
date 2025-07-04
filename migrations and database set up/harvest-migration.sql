-- 🌾 Harvest Migration
-- Add harvested_at and harvester_id columns to planted_plants table
-- Run this in your Supabase SQL Editor

-- Add new columns to planted_plants table
ALTER TABLE planted_plants 
ADD COLUMN IF NOT EXISTS harvested_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS harvester_id UUID REFERENCES auth.users(id);

-- Create index for better performance on harvested queries
CREATE INDEX IF NOT EXISTS idx_planted_plants_harvested_at ON planted_plants(harvested_at);
CREATE INDEX IF NOT EXISTS idx_planted_plants_harvester ON planted_plants(harvester_id);

-- Update the garden_data view to exclude harvested plants
DROP VIEW IF EXISTS garden_data;
CREATE OR REPLACE VIEW garden_data AS
SELECT 
  pp.id as planted_plant_id,
  pp.garden_owner_id,
  pp.planter_id,
  pp.planted_at,
  pp.current_stage,
  pp.is_mature,
  pp.harvested_at,
  pp.harvester_id,
  p.id as plant_id,
  p.name as plant_name,
  p.growth_time_hours,
  p.weather_bonus,
  p.image_path
FROM planted_plants pp
JOIN plants p ON pp.plant_id = p.id
WHERE pp.harvested_at IS NULL; -- Only show non-harvested plants

-- Update the garden functions to exclude harvested plants
CREATE OR REPLACE FUNCTION get_garden_plant_count(garden_owner_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM planted_plants 
    WHERE garden_owner_id = garden_owner_uuid 
    AND harvested_at IS NULL -- Only count non-harvested plants
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_garden_full(garden_owner_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_garden_plant_count(garden_owner_uuid) >= 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the updated view
GRANT SELECT ON garden_data TO authenticated; 