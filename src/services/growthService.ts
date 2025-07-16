import { Plant, PlantedPlant, GrowthCalculation, GrowthStage } from '../types/garden';
import { TimeCalculationService } from './timeCalculationService';

export class GrowthService {
  /**
   * Calculate the weather bonus multiplier for a plant based on current weather
   */
  static getWeatherBonus(plant: Plant, weatherCondition: string): number {
    console.log("[GrowthService] getWeatherBonus called with:", {
      plantId: plant.id,
      plantName: plant.name,
      weatherCondition,
      plantWeatherBonus: plant.weather_bonus
    });
    
    // Map API weather conditions to plant weather bonus keys
    const weatherMapping: Record<string, keyof typeof plant.weather_bonus> = {
      'clear': 'sunny',
      'clouds': 'cloudy', 
      'rain': 'rainy',
      'drizzle': 'rainy',
      'mist': 'rainy',
      'fog': 'rainy',
      'haze': 'rainy',
      'snow': 'rainy', // Snow plants don't exist, default to rainy
      'thunderstorm': 'rainy' // Thunderstorm plants don't exist, default to rainy
    };
    
    const weatherKey = weatherCondition.toLowerCase();
    const mappedKey = weatherMapping[weatherKey];
    
    console.log("[GrowthService] Weather mapping:", {
      weatherKey,
      mappedKey,
      availableKeys: Object.keys(plant.weather_bonus)
    });
    
    if (mappedKey) {
      const bonus = plant.weather_bonus[mappedKey];
      console.log("[GrowthService] Weather bonus result:", {
        mappedKey,
        bonus,
        isBonusValid: !isNaN(bonus)
      });
      return bonus;
    }
    
    // Default to 1.0 if weather not found
    console.log("[GrowthService] Weather not found, using default bonus: 1.0");
    return 1.0;
  }

  /**
   * Calculate the current growth stage and progress for a plant
   */
  static calculateGrowthStage(
    plantedPlant: PlantedPlant,
    plant: Plant,
    friendWeather: string
  ): GrowthCalculation {
    console.log("[GrowthService] calculateGrowthStage called with:", {
      plantedPlantId: plantedPlant.id,
      plantId: plant.id,
      plantName: plant.name,
      plantedAt: plantedPlant.planted_at,
      friendWeather,
      plantGrowthTime: plant.growth_time_hours
    });
    
    // Use TimeCalculationService for consistent time calculations
    const hoursElapsed = TimeCalculationService.getTimeElapsedHours(plantedPlant.planted_at);
    const weatherBonus = this.getWeatherBonus(plant, friendWeather);
    const adjustedHours = hoursElapsed * weatherBonus;
    
    // TESTING: Accelerate growth to 5 minutes (0.083 hours) for faster testing
    const totalGrowthHours = 0.083; // 5 minutes instead of plant.growth_time_hours
    // const totalGrowthHours = plant.growth_time_hours; // ORIGINAL: Use actual plant growth time
    
    console.log("[GrowthService] calculateGrowthStage intermediate values:", {
      hoursElapsed,
      weatherBonus,
      adjustedHours,
      totalGrowthHours,
      isHoursElapsedValid: !isNaN(hoursElapsed),
      isWeatherBonusValid: !isNaN(weatherBonus),
      isAdjustedHoursValid: !isNaN(adjustedHours),
      isTotalGrowthHoursValid: !isNaN(totalGrowthHours)
    });
    
    // Calculate progress percentage (0-100)
    const progress = Math.min(100, (adjustedHours / totalGrowthHours) * 100);
    
    console.log("[GrowthService] Progress calculation:", {
      progress,
      isProgressValid: !isNaN(progress)
    });
    
    // Determine current stage based on progress
    let stage: GrowthStage = 1;
    let shouldAdvance = false;
    
    if (progress >= 0) stage = 2; // Dirt (immediate after planting)
    if (progress >= 20) stage = 3; // Sprout
    if (progress >= 40) stage = 4; // Adolescent
    if (progress >= 100) stage = 5; // Mature (only at 100% - ready to harvest)
    
    // Check if plant should advance to next stage
    const currentStageProgress = this.getStageProgress(stage);
    const nextStageProgress = this.getStageProgress((stage + 1) as GrowthStage);
    
    if (progress >= nextStageProgress && stage < 5) {
      shouldAdvance = true;
    }
    
    const result = {
      stage,
      progress: Math.round(progress), // Whole percentages
      shouldAdvance
    };
    
    console.log("[GrowthService] calculateGrowthStage final result:", {
      result,
      isStageValid: !isNaN(result.stage),
      isProgressValid: !isNaN(result.progress)
    });
    
    return result;
  }

  /**
   * Get the progress threshold for a specific stage
   */
  private static getStageProgress(stage: GrowthStage): number {
    switch (stage) {
      case 1: return 0;   // Empty pot (not used anymore)
      case 2: return 0;   // Dirt (immediate after planting)
      case 3: return 20;  // Sprout
      case 4: return 40;  // Adolescent
      case 5: return 100; // Mature (only at 100% - ready to harvest)
      default: return 0;
    }
  }

  /**
   * Check if a plant is mature
   */
  static isPlantMature(plantedPlant: PlantedPlant, plant: Plant, friendWeather: string): boolean {
    console.log("[GrowthService] isPlantMature called with:", {
      plantedPlantId: plantedPlant.id,
      plantId: plant.id,
      plantName: plant.name,
      friendWeather
    });
    
    const calculation = this.calculateGrowthStage(plantedPlant, plant, friendWeather);
    const isMature = calculation.stage === 5 && calculation.progress >= 100;
    
    console.log("[GrowthService] isPlantMature result:", {
      calculation,
      isMature,
      stage: calculation.stage,
      progress: calculation.progress
    });
    
    return isMature;
  }

  /**
   * Get the next stage for a plant
   */
  static getNextStage(currentStage: GrowthStage): GrowthStage {
    if (currentStage >= 5) return 5;
    return (currentStage + 1) as GrowthStage;
  }

  /**
   * Calculate growth for all plants in a garden
   */
  static calculateGardenGrowth(
    plantedPlants: PlantedPlant[],
    plants: Plant[],
    friendWeather: string
  ): { plantedPlant: PlantedPlant; newStage: GrowthStage; isMature: boolean }[] {
    const plantMap = new Map(plants.map(p => [p.id, p]));
    const updates: { plantedPlant: PlantedPlant; newStage: GrowthStage; isMature: boolean }[] = [];
    
    for (const plantedPlant of plantedPlants) {
      const plant = plantMap.get(plantedPlant.plant_id);
      if (!plant) continue;
      
      const calculation = this.calculateGrowthStage(plantedPlant, plant, friendWeather);
      const isMature = this.isPlantMature(plantedPlant, plant, friendWeather);
      
      if (calculation.shouldAdvance || isMature) {
        updates.push({
          plantedPlant,
          newStage: calculation.shouldAdvance ? this.getNextStage(calculation.stage) : calculation.stage,
          isMature
        });
      }
    }
    
    return updates;
  }

  /**
   * Get weather description for plant preferences
   */
  static getWeatherPreferenceDescription(plant: Plant): string {
    const bonuses = plant.weather_bonus;
    const maxBonus = Math.max(bonuses.sunny, bonuses.cloudy, bonuses.rainy);
    
    if (maxBonus === bonuses.sunny) return "Loves sunny weather";
    if (maxBonus === bonuses.rainy) return "Loves rainy weather";
    if (maxBonus === bonuses.cloudy) return "Loves cloudy weather";
    
    return "Grows in any weather";
  }

  /**
   * Get growth time description
   */
  static getGrowthTimeDescription(growthTimeHours: number): string {
    if (growthTimeHours <= 2) return "Fast growing";
    if (growthTimeHours <= 4) return "Medium growth";
    return "Slow growing";
  }

  /**
   * Validate plant data
   */
  static validatePlant(plant: Plant): boolean {
    return !!(
      plant.id &&
      plant.name &&
      plant.growth_time_hours > 0 &&
      plant.weather_bonus &&
      plant.image_path
    );
  }

  /**
   * Validate planted plant data
   */
  static validatePlantedPlant(plantedPlant: PlantedPlant): boolean {
    return !!(
      plantedPlant.id &&
      plantedPlant.garden_owner_id &&
      plantedPlant.planter_id &&
      plantedPlant.plant_id &&
      plantedPlant.current_stage >= 1 &&
      plantedPlant.current_stage <= 5
    );
  }
} 