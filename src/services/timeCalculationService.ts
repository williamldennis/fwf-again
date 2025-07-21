import { Plant, PlantedPlant } from '../types/garden';
import { GrowthService } from './growthService';

export class TimeCalculationService {
  /**
   * Calculate time elapsed since planting in hours
   */
  static getTimeElapsedHours(plantedAt: string): number {
    // Parse the timestamp manually to avoid timezone conversion
    const plantedDate = new Date(plantedAt + 'Z'); // Force UTC interpretation
    const currentDate = new Date();
    
    const timeElapsed = currentDate.getTime() - plantedDate.getTime();
    const hoursElapsed = timeElapsed / (1000 * 60 * 60);
    
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
    
    const totalRealTimeNeeded = plant.growth_time_hours / weatherBonus;
    const remainingRealTime = totalRealTimeNeeded - hoursElapsed;
    
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
    
    if (hoursElapsed < 1) {
      return "just planted";
    } else if (hoursElapsed >= 24) {
      const days = Math.floor(hoursElapsed / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    } else {
      return `${Math.floor(hoursElapsed)} hour${Math.floor(hoursElapsed) > 1 ? 's' : ''}`;
    }
  }
} 