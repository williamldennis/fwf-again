-- Add type column to weather_data table, rename complete_data to data
ALTER TABLE weather_data RENAME complete_data TO "data";

CREATE TYPE weather_data_type AS ENUM ('partial', 'complete');

ALTER TABLE weather_data ADD COLUMN IF NOT EXISTS "type" weather_data_type NOT NULL;

ALTER TABLE weather_data DROP CONSTRAINT weather_data_coordinates_key;

ALTER TABLE weather_data
ADD CONSTRAINT weather_data_coordinates_type_unique
UNIQUE (coordinates, type);