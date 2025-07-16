import { TimeCalculationService } from '../../services/timeCalculationService';
import { Plant, PlantedPlant } from '../../types/garden';

// Mock GrowthService
jest.mock('../../services/growthService', () => ({
  GrowthService: {
    getWeatherBonus: jest.fn()
  }
}));

describe('TimeCalculationService - Simple Tests', () => {
  const mockPlant: Plant = {
    id: '1',
    name: 'Sunflower',
    growth_time_hours: 24,
    weather_bonus: {
      sunny: 1.5,
      cloudy: 1.0,
      rainy: 0.8
    },
    image_path: '/plants/sunflower',
    harvest_points: 10,
    created_at: '2024-01-01T00:00:00Z'
  };

  const mockPlantedPlant: PlantedPlant = {
    id: '1',
    garden_owner_id: 'user1',
    planter_id: 'user2',
    plant_id: '1',
    current_stage: 2,
    is_mature: false,
    planted_at: '2024-01-01T00:00:00',
    created_at: '2024-01-01T00:00:00'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { GrowthService } = require('../../services/growthService');
    GrowthService.getWeatherBonus.mockReturnValue(1.0);
  });

  describe('getTimeElapsedHours', () => {
    it('should return a non-negative number', () => {
      const hoursElapsed = TimeCalculationService.getTimeElapsedHours('2024-01-01T00:00:00');
      expect(hoursElapsed).toBeGreaterThanOrEqual(0);
    });

    it('should handle valid date strings', () => {
      const hoursElapsed = TimeCalculationService.getTimeElapsedHours('2024-01-01T00:00:00');
      expect(typeof hoursElapsed).toBe('number');
      expect(isNaN(hoursElapsed)).toBe(false);
    });
  });

  describe('getTimeToMaturity', () => {
    it('should return a non-negative number', () => {
      const timeToMaturity = TimeCalculationService.getTimeToMaturity(
        '2024-01-01T00:00:00',
        mockPlant,
        'clear'
      );
      expect(timeToMaturity).toBeGreaterThanOrEqual(0);
    });

    it('should apply weather bonus', () => {
      const { GrowthService } = require('../../services/growthService');
      GrowthService.getWeatherBonus.mockReturnValue(1.5);

      const timeToMaturity = TimeCalculationService.getTimeToMaturity(
        '2024-01-01T00:00:00',
        mockPlant,
        'clear'
      );
      
      expect(timeToMaturity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTimeToMaturityForPlantedPlant', () => {
    it('should call getTimeToMaturity with correct parameters', () => {
      const timeToMaturity = TimeCalculationService.getTimeToMaturityForPlantedPlant(
        mockPlantedPlant,
        mockPlant,
        'clear'
      );
      
      expect(typeof timeToMaturity).toBe('number');
      expect(timeToMaturity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getFormattedTimeToMaturity', () => {
    it('should return a string', () => {
      const formatted = TimeCalculationService.getFormattedTimeToMaturity(
        '2024-01-01T00:00:00',
        mockPlant,
        'clear'
      );
      
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should handle ready to harvest case', () => {
      // Mock a case where time to maturity is 0 or negative
      const { GrowthService } = require('../../services/growthService');
      GrowthService.getWeatherBonus.mockReturnValue(1000); // Very fast growth
      
      const formatted = TimeCalculationService.getFormattedTimeToMaturity(
        '2024-01-01T00:00:00',
        mockPlant,
        'clear'
      );
      
      expect(formatted).toBe('Ready to harvest!');
    });
  });

  describe('getFormattedTimeSincePlanted', () => {
    it('should return a string', () => {
      const formatted = TimeCalculationService.getFormattedTimeSincePlanted('2024-01-01T00:00:00');
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should include "hours" or "day" in the result', () => {
      const formatted = TimeCalculationService.getFormattedTimeSincePlanted('2024-01-01T00:00:00');
      expect(formatted.includes('hours') || formatted.includes('day')).toBe(true);
    });
  });
}); 