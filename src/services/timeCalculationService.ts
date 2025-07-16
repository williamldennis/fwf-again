import { Plant, PlantedPlant } from '../types/garden';
import { GrowthService } from './growthService';

export class TimeCalculationService {
  /**
   * Calculate time elapsed since planting in hours
   */
  static getTimeElapsedHours(plantedAt: string): number {
    console.log("[TimeCalculationService] getTimeElapsedHours called with:", plantedAt);
    
    // Parse the timestamp manually to avoid timezone conversion
    const plantedDate = new Date(plantedAt + 'Z'); // Force UTC interpretation
    const currentDate = new Date();
    
    console.log("[TimeCalculationService] Date parsing results:", {
      plantedAt,
      plantedDateString: plantedDate.toString(),
      plantedDateISO: plantedDate.toISOString(),
      currentDateString: currentDate.toString(),
      currentDateISO: currentDate.toISOString(),
      plantedTime: plantedDate.getTime(),
      currentTime: currentDate.getTime(),
      isPlantedDateValid: !isNaN(plantedDate.getTime()),
      isCurrentDateValid: !isNaN(currentDate.getTime())
    });
    
    const timeElapsed = currentDate.getTime() - plantedDate.getTime();
    const hoursElapsed = timeElapsed / (1000 * 60 * 60);
    
    console.log("[TimeCalculationService] Calculation results:", {
      timeElapsed,
      hoursElapsed,
      isTimeElapsedValid: !isNaN(timeElapsed),
      isHoursElapsedValid: !isNaN(hoursElapsed),
      finalResult: Math.max(0, hoursElapsed)
    });
    
    return Math.max(0, hoursElapsed);
  }

  /**
   * Calculate time to maturity - how much real time is left
   */
  static getTimeToMaturity(
    plantedAt: string,
    plant: Plant,
    friendWeather: string
  ): number {
    console.log("[TimeCalculationService] getTimeToMaturity called with:", {
      plantedAt,
      plantId: plant.id,
      plantName: plant.name,
      growthTimeHours: plant.growth_time_hours,
      friendWeather
    });
    
    const hoursElapsed = this.getTimeElapsedHours(plantedAt);
    const weatherBonus = GrowthService.getWeatherBonus(plant, friendWeather);
    
    console.log("[TimeCalculationService] getTimeToMaturity intermediate values:", {
      hoursElapsed,
      weatherBonus,
      growthTimeHours: plant.growth_time_hours
    });
    
    const totalRealTimeNeeded = plant.growth_time_hours / weatherBonus;
    const remainingRealTime = totalRealTimeNeeded - hoursElapsed;
    
    console.log("[TimeCalculationService] getTimeToMaturity calculation:", {
      totalRealTimeNeeded,
      remainingRealTime,
      isTotalTimeValid: !isNaN(totalRealTimeNeeded),
      isRemainingTimeValid: !isNaN(remainingRealTime),
      finalResult: Math.max(0, remainingRealTime)
    });
    
    return Math.max(0, remainingRealTime);
  }

  /**
   * Calculate time to maturity for a planted plant (with joined data)
   */
  static getTimeToMaturityForPlantedPlant(
    plantedPlant: PlantedPlant,
    plant: Plant,
    friendWeather: string
  ): number {
    return this.getTimeToMaturity(plantedPlant.planted_at, plant, friendWeather);
  }

  /**
   * Get formatted time string (e.g., "2 hours", "1 day")
   */
  static getFormattedTimeToMaturity(
    plantedAt: string,
    plant: Plant,
    friendWeather: string
  ): string {
    console.log("[TimeCalculationService] getFormattedTimeToMaturity called with:", {
      plantedAt,
      plantId: plant.id,
      plantName: plant.name,
      friendWeather
    });
    
    const timeToMaturity = this.getTimeToMaturity(plantedAt, plant, friendWeather);
    
    console.log("[TimeCalculationService] getFormattedTimeToMaturity timeToMaturity:", timeToMaturity);
    
    if (timeToMaturity <= 0) {
      console.log("[TimeCalculationService] Returning 'Ready to harvest!'");
      return "Ready to harvest!";
    }
    
    if (timeToMaturity >= 24) {
      const days = Math.floor(timeToMaturity / 24);
      const result = `${days} day${days > 1 ? 's' : ''}`;
      console.log("[TimeCalculationService] Returning days format:", result);
      return result;
    }
    
    const result = `${Math.ceil(timeToMaturity)} hours`;
    console.log("[TimeCalculationService] Returning hours format:", result);
    return result;
  }

  /**
   * Get formatted time since planted
   */
  static getFormattedTimeSincePlanted(plantedAt: string): string {
    const hoursElapsed = this.getTimeElapsedHours(plantedAt);
    
    if (hoursElapsed >= 24) {
      const days = Math.floor(hoursElapsed / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    
    return `${Math.floor(hoursElapsed)} hours`;
  }
} 