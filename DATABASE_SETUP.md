# 🌱 Garden Database Setup

## Overview

This document contains the SQL scripts needed to set up the garden feature database tables and seed data.

## Files

- `database-setup.sql` - Main setup script with tables, indexes, RLS policies, and seed data
- `test-database.sql` - Test script to verify the setup worked correctly

## Setup Instructions

### 1. Run the Main Setup Script

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database-setup.sql`
4. Run the script

### 2. Verify the Setup

1. Run the contents of `test-database.sql` in the SQL Editor
2. Verify all tests pass (see expected results in the test file)

### 3. What Gets Created

#### Tables

- **`plants`** - Plant definitions with growth times and weather bonuses
- **`planted_plants`** - Individual plants planted in user gardens

#### Indexes

- Performance indexes on `planted_plants` table for faster queries

#### RLS Policies

- Secure access policies for authenticated users
- Users can view plants in their own garden
- Users can plant in any garden
- Users can update plants in their own garden

#### Functions

- `get_garden_plant_count()` - Count plants in a garden
- `is_garden_full()` - Check if garden has 3 plants

#### Views

- `garden_data` - Joined view for easy garden data fetching

#### Seed Data

- 6 plants: Sunflower, Mushroom, Fern, Cactus, Water Lily, Pine Tree
- Each with growth times and weather preferences

## Plant Data Structure

### Plants Table

```sql
CREATE TABLE plants (
  id UUID PRIMARY KEY,
  name VARCHAR(50),
  growth_time_hours INTEGER,
  weather_bonus JSONB, -- {"sunny": 1.5, "cloudy": 0.8, "rainy": 0.6}
  image_path VARCHAR(100)
);
```

### Planted Plants Table

```sql
CREATE TABLE planted_plants (
  id UUID PRIMARY KEY,
  garden_owner_id UUID REFERENCES auth.users(id),
  planter_id UUID REFERENCES auth.users(id),
  plant_id UUID REFERENCES plants(id),
  planted_at TIMESTAMP,
  current_stage INTEGER, -- 1-5
  is_mature BOOLEAN
);
```

## Growth Stages

1. **Empty Pot** (Stage 1) - Same for all plants
2. **Dirt** (Stage 2) - Shows immediately after planting
3. **Sprout** (Stage 3) - Plant-specific image
4. **Adolescent** (Stage 4) - Plant-specific image
5. **Mature** (Stage 5) - Plant-specific image

## Weather Effects

Each plant has weather bonuses that affect growth speed:

- **Sunny**: Multiplier for sunny weather
- **Cloudy**: Multiplier for cloudy weather
- **Rainy**: Multiplier for rainy weather

Example: `{"sunny": 1.5, "cloudy": 0.8, "rainy": 0.6}` means:

- 50% faster growth in sunny weather
- 20% slower growth in cloudy weather
- 40% slower growth in rainy weather

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own garden data
- Users can plant in any garden but only update their own
- All operations require authentication

## Testing

After setup, you can test the database by:

1. Running the test script
2. Checking that all 6 plants are inserted
3. Verifying RLS policies are in place
4. Testing the garden functions with a real user ID

## Next Steps

Once the database is set up, you can proceed to:

1. Day 2: Create the garden components
2. Day 3: Integrate with the friend cards
3. Day 4: Implement growth logic
4. Day 5: Polish and testing
