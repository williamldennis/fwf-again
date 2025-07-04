import { Plant, PlantedPlant, GrowthCalculation, GrowthStage } from '../types/garden';
import { TimeCalculationService } from './timeCalculationService';

export class GrowthService {
  /**
   * Calculate the weather bonus multiplier for a plant based on current weather
   */
  static getWeatherBonus(plant: Plant, weatherCondition: string): number {
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
    
    if (mappedKey) {
      return plant.weather_bonus[mappedKey];
    }
    
    // Default to 1.0 if weather not found
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
    // Use TimeCalculationService for consistent time calculations
    const hoursElapsed = TimeCalculationService.getTimeElapsedHours(plantedPlant.planted_at);
    const weatherBonus = this.getWeatherBonus(plant, friendWeather);
    const adjustedHours = hoursElapsed * weatherBonus;
    
    // Calculate total growth time needed
    const totalGrowthHours = plant.growth_time_hours;
    
    // Calculate progress percentage (0-100)
    const progress = Math.min(100, (adjustedHours / totalGrowthHours) * 100);
    
    // Determine current stage based on progress
    let stage: GrowthStage = 1;
    let shouldAdvance = false;
    
    if (progress >= 0) stage = 1; // Empty pot
    if (progress >= 5) stage = 2; // Dirt (immediate after planting)
    if (progress >= 20) stage = 3; // Sprout
    if (progress >= 40) stage = 4; // Adolescent
    if (progress >= 70) stage = 5; // Mature
    
    // Check if plant should advance to next stage
    const currentStageProgress = this.getStageProgress(stage);
    const nextStageProgress = this.getStageProgress((stage + 1) as GrowthStage);
    
    if (progress >= nextStageProgress && stage < 5) {
      shouldAdvance = true;
    }
    
    return {
      stage,
      progress: Math.round(progress), // Whole percentages
      shouldAdvance
    };
  }

  /**
   * Get the progress threshold for a specific stage
   */
  private static getStageProgress(stage: GrowthStage): number {
    switch (stage) {
      case 1: return 0;   // Empty pot
      case 2: return 5;   // Dirt
      case 3: return 20;  // Sprout
      case 4: return 40;  // Adolescent
      case 5: return 70;  // Mature
      default: return 0;
    }
  }

  /**
   * Check if a plant is mature
   */
  static isPlantMature(plantedPlant: PlantedPlant, plant: Plant, friendWeather: string): boolean {
    const calculation = this.calculateGrowthStage(plantedPlant, plant, friendWeather);
    return calculation.stage === 5 && calculation.progress >= 100;
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