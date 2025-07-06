// Garden Types for TypeScript

export interface Plant {
  id: string;
  name: string;
  growth_time_hours: number;
  weather_bonus: {
    sunny: number;
    cloudy: number;
    rainy: number;
  };
  image_path: string;
  harvest_points: number;
  created_at: string;
}

export interface PlantedPlant {
  id: string;
  garden_owner_id: string;
  planter_id: string;
  plant_id: string;
  planted_at: string;
  current_stage: number; // 1-5
  is_mature: boolean;
  created_at: string;
}

export interface GardenData {
  planted_plant_id: string;
  garden_owner_id: string;
  planter_id: string;
  planted_at: string;
  current_stage: number;
  is_mature: boolean;
  plant_id: string;
  plant_name: string;
  growth_time_hours: number;
  weather_bonus: {
    sunny: number;
    cloudy: number;
    rainy: number;
  };
  image_path: string;
}

export interface PlantWithGrowth extends PlantedPlant {
  plant: Plant;
  planter_name?: string;
}

export type GrowthStage = 1 | 2 | 3 | 4 | 5;

export interface WeatherCondition {
  sunny: string;
  cloudy: string;
  rainy: string;
}

// Plant picker modal props
export interface PlantPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlant: (plantId: string) => void;
  weatherCondition: string;
}

// Garden area props
export interface GardenAreaProps {
  gardenOwnerId: string;
  plants: any[]; // Using any[] to handle the joined data structure from Supabase
  weatherCondition: string;
  onPlantPress: (slotIdx: number) => void;
  onPlantDetailsPress?: (plant: any, weatherCondition: string) => void; // Optional callback for plant details
  isGardenFull: boolean;
}

// Plant component props
export interface PlantProps {
  plant: GardenData;
  weatherCondition: string;
  onWater?: (plantId: string) => void;
}

// Growth calculation result
export interface GrowthCalculation {
  stage: GrowthStage;
  progress: number; // 0-100
  shouldAdvance: boolean;
}

// Plant image mapping
export interface PlantImageMap {
  [plantName: string]: {
    [stage: number]: any; // require() result
  };
}

// Profile interface for user data
export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  phone_number?: string;
  latitude?: number;
  longitude?: number;
  weather_condition?: string;
  contacts_approved?: boolean;
  contacts_count?: number;
  points: number;
  created_at?: string;
  updated_at?: string;
} 