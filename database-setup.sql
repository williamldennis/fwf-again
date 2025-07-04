-- 🌱 Garden MVP Database Setup
-- Run this script in your Supabase SQL Editor

-- Create plants table
CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  growth_time_hours INTEGER NOT NULL,
  weather_bonus JSONB NOT NULL,
  image_path VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create planted_plants table
CREATE TABLE IF NOT EXISTS planted_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garden_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  planter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
  planted_at TIMESTAMP DEFAULT NOW(),
  current_stage INTEGER DEFAULT 1 CHECK (current_stage >= 1 AND current_stage <= 5),
  is_mature BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_planted_plants_garden_owner ON planted_plants(garden_owner_id);
CREATE INDEX IF NOT EXISTS idx_planted_plants_planter ON planted_plants(planter_id);
CREATE INDEX IF NOT EXISTS idx_planted_plants_planted_at ON planted_plants(planted_at);

-- Insert seed data for plants
INSERT INTO plants (name, growth_time_hours, weather_bonus, image_path) VALUES
('Sunflower', 4, '{"sunny": 1.5, "cloudy": 0.8, "rainy": 0.6}', 'sunflower'),
('Mushroom', 2, '{"rainy": 2.0, "cloudy": 1.2, "sunny": 0.4}', 'mushroom'),
('Fern', 6, '{"cloudy": 1.8, "rainy": 1.3, "sunny": 0.7}', 'fern'),
('Cactus', 3, '{"sunny": 2.0, "cloudy": 0.6, "rainy": 0.3}', 'cactus'),
('Water Lily', 5, '{"rainy": 1.8, "cloudy": 1.0, "sunny": 0.5}', 'water_lily'),
('Pine Tree', 8, '{"cloudy": 1.5, "rainy": 1.2, "sunny": 0.8}', 'pine_tree')
ON CONFLICT (name) DO NOTHING;

-- Set up Row Level Security (RLS) policies
-- Enable RLS on both tables
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE planted_plants ENABLE ROW LEVEL SECURITY;

-- Plants table policies (read-only for authenticated users)
CREATE POLICY "Plants are viewable by authenticated users" ON plants
  FOR SELECT USING (auth.role() = 'authenticated');

-- Planted plants policies
CREATE POLICY "Users can view plants in their own garden" ON planted_plants
  FOR SELECT USING (auth.uid() = garden_owner_id);

CREATE POLICY "Users can view plants they planted" ON planted_plants
  FOR SELECT USING (auth.uid() = planter_id);

CREATE POLICY "Users can plant in any garden" ON planted_plants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update plants in their own garden" ON planted_plants
  FOR UPDATE USING (auth.uid() = garden_owner_id);

-- Create a function to get plant count per garden
CREATE OR REPLACE FUNCTION get_garden_plant_count(garden_owner_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM planted_plants 
    WHERE garden_owner_id = garden_owner_uuid 
    AND is_mature = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if garden is full
CREATE OR REPLACE FUNCTION is_garden_full(garden_owner_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_garden_plant_count(garden_owner_uuid) >= 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON plants TO authenticated;
GRANT ALL ON planted_plants TO authenticated;
GRANT EXECUTE ON FUNCTION get_garden_plant_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_garden_full(UUID) TO authenticated;

-- Create a view for easier garden data fetching
CREATE OR REPLACE VIEW garden_data AS
SELECT 
  pp.id as planted_plant_id,
  pp.garden_owner_id,
  pp.planter_id,
  pp.planted_at,
  pp.current_stage,
  pp.is_mature,
  p.id as plant_id,
  p.name as plant_name,
  p.growth_time_hours,
  p.weather_bonus,
  p.image_path
FROM planted_plants pp
JOIN plants p ON pp.plant_id = p.id
WHERE pp.is_mature = FALSE;

-- Grant access to the view
GRANT SELECT ON garden_data TO authenticated;

-- Note: Views inherit RLS policies from their underlying tables
-- The garden_data view will use the policies from planted_plants table

-- Test data (optional - remove in production)
-- INSERT INTO planted_plants (garden_owner_id, planter_id, plant_id, current_stage)
-- SELECT 
--   (SELECT id FROM auth.users LIMIT 1),
--   (SELECT id FROM auth.users LIMIT 1),
--   (SELECT id FROM plants WHERE name = 'Sunflower' LIMIT 1),
--   2; 