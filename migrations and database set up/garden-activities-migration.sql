-- 🌱 Garden Activities Migration
-- Create garden_activities table to track plant-related activities
-- Run this in your Supabase SQL Editor

-- Create garden_activities table
CREATE TABLE IF NOT EXISTS garden_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garden_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('planted', 'harvested')),
  plant_id UUID REFERENCES plants(id) ON DELETE CASCADE NOT NULL,
  planted_plant_id UUID REFERENCES planted_plants(id) ON DELETE CASCADE,
  plant_name VARCHAR(50) NOT NULL,
  actor_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_garden_activities_garden_owner ON garden_activities(garden_owner_id);
CREATE INDEX IF NOT EXISTS idx_garden_activities_created_at ON garden_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_garden_activities_actor ON garden_activities(actor_id);
CREATE INDEX IF NOT EXISTS idx_garden_activities_type ON garden_activities(activity_type);

-- Enable Row Level Security (RLS)
ALTER TABLE garden_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view activities in their own garden" ON garden_activities
  FOR SELECT USING (auth.uid() = garden_owner_id);

CREATE POLICY "Users can insert activities in their own garden" ON garden_activities
  FOR INSERT WITH CHECK (auth.uid() = garden_owner_id);

-- Grant permissions
GRANT ALL ON garden_activities TO authenticated;

-- Create a function to log garden activities
CREATE OR REPLACE FUNCTION log_garden_activity(
  p_garden_owner_id UUID,
  p_actor_id UUID,
  p_activity_type VARCHAR(50),
  p_plant_id UUID,
  p_plant_name VARCHAR(50),
  p_actor_name VARCHAR(100),
  p_planted_plant_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO garden_activities (
    garden_owner_id,
    actor_id,
    activity_type,
    plant_id,
    planted_plant_id,
    plant_name,
    actor_name
  ) VALUES (
    p_garden_owner_id,
    p_actor_id,
    p_activity_type,
    p_plant_id,
    p_planted_plant_id,
    p_plant_name,
    p_actor_name
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION log_garden_activity(UUID, UUID, VARCHAR(50), UUID, VARCHAR(50), VARCHAR(100), UUID) TO authenticated; 