-- Weather Data Migration
-- Create weather_data table to cache fetched weather data to save API calls
-- Run this in your Supabase SQL Editor

-- Create weather_data table
CREATE TABLE IF NOT EXISTS weather_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinates VARCHAR(20) NOT NULL UNIQUE,
  complete_data JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS city_coordinates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coordinates VARCHAR(20) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL
);

ALTER TABLE weather_data
ADD CONSTRAINT coordinates_format_check
CHECK (
  coordinates ~ '^-?\d+\.\d{4},-?\d+\.\d{4}$'
);

ALTER TABLE city_coordinates
ADD CONSTRAINT coordinates_format_check
CHECK (
  coordinates ~ '^-?\d+\.\d{4},-?\d+\.\d{4}$'
);