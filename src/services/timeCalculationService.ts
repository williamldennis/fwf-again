import { Plant, PlantedPlant } from '../types/garden';
import { GrowthService } from './growthService';

export class TimeCalculationService {
  /**
   * Calculate time elapsed since planting in hours
   */
  static getTimeElapsedHours(plantedAt: string): number {
    // Parse the timestamp manually to avoid timezone conversion
    // plantedAt format: "2025-07-04T16:40:10.603888"
    const plantedDate = new Date(plantedAt + 'Z'); // Force UTC interpretation
    const currentDate = new Date();
    
    console.log('TimeCalculationService.getTimeElapsedHours Debug:', {
      plantedAt,
      plantedAtUTC: plantedDate.toISOString(),
      currentTimeUTC: currentDate.toISOString(),
      plantedAtTime: plantedDate.getTime(),
      currentTimeMs: currentDate.getTime(),
      timeElapsed: currentDate.getTime() - plantedDate.getTime(),
      timeElapsedHours: (currentDate.getTime() - plantedDate.getTime()) / (1000 * 60 * 60)
    });
    
    const timeElapsed = currentDate.getTime() - plantedDate.getTime();
    const hoursElapsed = timeElapsed / (1000 * 60 * 60);
    
    // Ensure we don't return negative values (handle timezone issues)
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
    const hoursElapsed = this.getTimeElapsedHours(plantedAt);
    const weatherBonus = GrowthService.getWeatherBonus(plant, friendWeather);
    
    // Debug logging
    console.log('TimeCalculationService Debug:', {
      plantName: plant.name,
      baseTime: plant.growth_time_hours,
      friendWeather,
      weatherBonus,
      hoursElapsed,
      plantWeatherBonus: plant.weather_bonus
    });
    
    // Simple: How much real time is left given current weather?
    // If weather bonus is 1.5x, then 1 hour of real time = 1.5 hours of growth
    const totalRealTimeNeeded = plant.growth_time_hours / weatherBonus;
    const remainingRealTime = totalRealTimeNeeded - hoursElapsed;
    
    console.log('TimeCalculationService Result:', {
      totalRealTimeNeeded,
      remainingRealTime,
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
    const timeToMaturity = this.getTimeToMaturity(plantedAt, plant, friendWeather);
    
    if (timeToMaturity <= 0) {
      return "Ready to harvest!";
    }
    
    if (timeToMaturity >= 24) {
      const days = Math.floor(timeToMaturity / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    
    return `${Math.ceil(timeToMaturity)} hours`;
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