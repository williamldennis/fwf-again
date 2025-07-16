import { GrowthService } from '../../services/growthService';
import { Plant, PlantedPlant } from '../../types/garden';

// Mock TimeCalculationService
jest.mock('../../services/timeCalculationService', () => ({
  TimeCalculationService: {
    getTimeElapsedHours: jest.fn()
  }
}));

describe('GrowthService', () => {
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
    planted_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeatherBonus', () => {
    it('should return correct bonus for sunny weather', () => {
      const bonus = GrowthService.getWeatherBonus(mockPlant, 'clear');
      expect(bonus).toBe(1.5);
    });

    it('should return correct bonus for cloudy weather', () => {
      const bonus = GrowthService.getWeatherBonus(mockPlant, 'clouds');
      expect(bonus).toBe(1.0);
    });

    it('should return correct bonus for rainy weather', () => {
      const bonus = GrowthService.getWeatherBonus(mockPlant, 'rain');
      expect(bonus).toBe(0.8);
    });

    it('should return correct bonus for drizzle weather', () => {
      const bonus = GrowthService.getWeatherBonus(mockPlant, 'drizzle');
      expect(bonus).toBe(0.8);
    });

    it('should return correct bonus for mist weather', () => {
      const bonus = GrowthService.getWeatherBonus(mockPlant, 'mist');
      expect(bonus).toBe(0.8);
    });

    it('should return correct bonus for fog weather', () => {
      const bonus = GrowthService.getWeatherBonus(mockPlant, 'fog');
      expect(bonus).toBe(0.8);
    });

    it('should return correct bonus for haze weather', () => {
      const bonus = GrowthService.getWeatherBonus(mockPlant, 'haze');
      expect(bonus).toBe(0.8);
    });

    it('should return correct bonus for snow weather', () => {
      const bonus = GrowthService.getWeatherBonus(mockPlant, 'snow');
      expect(bonus).toBe(0.8);
    });

    it('should return correct bonus for thunderstorm weather', () => {
      const bonus = GrowthService.getWeatherBonus(mockPlant, 'thunderstorm');
      expect(bonus).toBe(0.8);
    });

    it('should return default bonus for unknown weather', () => {
      const bonus = GrowthService.getWeatherBonus(mockPlant, 'unknown');
      expect(bonus).toBe(1.0);
    });

    it('should handle case insensitive weather conditions', () => {
      const bonus = GrowthService.getWeatherBonus(mockPlant, 'CLEAR');
      expect(bonus).toBe(1.5);
    });
  });

  describe('calculateGrowthStage', () => {
    it('should calculate correct stage for newly planted plant', () => {
      const { TimeCalculationService } = require('../../services/timeCalculationService');
      TimeCalculationService.getTimeElapsedHours.mockReturnValue(0);

      const result = GrowthService.calculateGrowthStage(mockPlantedPlant, mockPlant, 'clear');
      
      expect(result.stage).toBe(2); // Dirt stage
      expect(result.progress).toBe(0);
      expect(result.shouldAdvance).toBe(false);
    });

    it('should calculate correct stage for sprout (20% progress)', () => {
      const { TimeCalculationService } = require('../../services/timeCalculationService');
      TimeCalculationService.getTimeElapsedHours.mockReturnValue(0.0166); // ~1 minute

      const result = GrowthService.calculateGrowthStage(mockPlantedPlant, mockPlant, 'clear');
      
      expect(result.stage).toBe(3); // Sprout stage
      expect(result.progress).toBeGreaterThanOrEqual(20);
      expect(result.shouldAdvance).toBe(false);
    });

    it('should calculate correct stage for adolescent (40% progress)', () => {
      const { TimeCalculationService } = require('../../services/timeCalculationService');
      TimeCalculationService.getTimeElapsedHours.mockReturnValue(0.0332); // ~2 minutes

      const result = GrowthService.calculateGrowthStage(mockPlantedPlant, mockPlant, 'clear');
      
      expect(result.stage).toBe(4); // Adolescent stage
      expect(result.progress).toBeGreaterThanOrEqual(40);
      expect(result.shouldAdvance).toBe(false);
    });

    it('should calculate correct stage for mature plant (100% progress)', () => {
      const { TimeCalculationService } = require('../../services/timeCalculationService');
      TimeCalculationService.getTimeElapsedHours.mockReturnValue(0.1); // More than 0.083 hours

      const result = GrowthService.calculateGrowthStage(mockPlantedPlant, mockPlant, 'clear');
      
      expect(result.stage).toBe(5); // Mature stage
      expect(result.progress).toBe(100);
      expect(result.shouldAdvance).toBe(false);
    });

    it('should apply weather bonus correctly', () => {
      const { TimeCalculationService } = require('../../services/timeCalculationService');
      TimeCalculationService.getTimeElapsedHours.mockReturnValue(0.05);

      const sunnyResult = GrowthService.calculateGrowthStage(mockPlantedPlant, mockPlant, 'clear');
      const cloudyResult = GrowthService.calculateGrowthStage(mockPlantedPlant, mockPlant, 'clouds');
      
      // Sunny weather should result in faster growth
      expect(sunnyResult.progress).toBeGreaterThan(cloudyResult.progress);
    });

    it('should cap progress at 100%', () => {
      const { TimeCalculationService } = require('../../services/timeCalculationService');
      TimeCalculationService.getTimeElapsedHours.mockReturnValue(1); // Very long time

      const result = GrowthService.calculateGrowthStage(mockPlantedPlant, mockPlant, 'clear');
      
      expect(result.progress).toBe(100);
      expect(result.stage).toBe(5);
    });
  });

  describe('isPlantMature', () => {
    it('should return true for mature plant', () => {
      const { TimeCalculationService } = require('../../services/timeCalculationService');
      TimeCalculationService.getTimeElapsedHours.mockReturnValue(0.1);

      const isMature = GrowthService.isPlantMature(mockPlantedPlant, mockPlant, 'clear');
      expect(isMature).toBe(true);
    });

    it('should return false for immature plant', () => {
      const { TimeCalculationService } = require('../../services/timeCalculationService');
      TimeCalculationService.getTimeElapsedHours.mockReturnValue(0.01);

      const isMature = GrowthService.isPlantMature(mockPlantedPlant, mockPlant, 'clear');
      expect(isMature).toBe(false);
    });
  });

  describe('getNextStage', () => {
    it('should return next stage for stages 1-4', () => {
      expect(GrowthService.getNextStage(1)).toBe(2);
      expect(GrowthService.getNextStage(2)).toBe(3);
      expect(GrowthService.getNextStage(3)).toBe(4);
      expect(GrowthService.getNextStage(4)).toBe(5);
    });

    it('should return stage 5 for mature plants', () => {
      expect(GrowthService.getNextStage(5)).toBe(5);
    });
  });

  describe('getWeatherPreferenceDescription', () => {
    it('should return sunny preference for sunny-loving plants', () => {
      const sunnyPlant = { ...mockPlant, weather_bonus: { sunny: 2.0, cloudy: 1.0, rainy: 0.5 } };
      const description = GrowthService.getWeatherPreferenceDescription(sunnyPlant);
      expect(description).toBe('Loves sunny weather');
    });

    it('should return rainy preference for rainy-loving plants', () => {
      const rainyPlant = { ...mockPlant, weather_bonus: { sunny: 0.5, cloudy: 1.0, rainy: 2.0 } };
      const description = GrowthService.getWeatherPreferenceDescription(rainyPlant);
      expect(description).toBe('Loves rainy weather');
    });

    it('should return cloudy preference for cloudy-loving plants', () => {
      const cloudyPlant = { ...mockPlant, weather_bonus: { sunny: 0.5, cloudy: 2.0, rainy: 1.0 } };
      const description = GrowthService.getWeatherPreferenceDescription(cloudyPlant);
      expect(description).toBe('Loves cloudy weather');
    });

    it('should return sunny preference for balanced plants (first check)', () => {
      const balancedPlant = { ...mockPlant, weather_bonus: { sunny: 1.0, cloudy: 1.0, rainy: 1.0 } };
      const description = GrowthService.getWeatherPreferenceDescription(balancedPlant);
      expect(description).toBe('Loves sunny weather');
    });
  });

  describe('getGrowthTimeDescription', () => {
    it('should return fast growing for plants under 2 hours', () => {
      expect(GrowthService.getGrowthTimeDescription(1)).toBe('Fast growing');
      expect(GrowthService.getGrowthTimeDescription(2)).toBe('Fast growing');
    });

    it('should return medium growth for plants 2-4 hours', () => {
      expect(GrowthService.getGrowthTimeDescription(3)).toBe('Medium growth');
      expect(GrowthService.getGrowthTimeDescription(4)).toBe('Medium growth');
    });

    it('should return slow growing for plants over 4 hours', () => {
      expect(GrowthService.getGrowthTimeDescription(5)).toBe('Slow growing');
      expect(GrowthService.getGrowthTimeDescription(10)).toBe('Slow growing');
    });
  });

  describe('validatePlant', () => {
    it('should validate correct plant data', () => {
      const isValid = GrowthService.validatePlant(mockPlant);
      expect(isValid).toBe(true);
    });

    it('should reject plant without id', () => {
      const invalidPlant = { ...mockPlant, id: '' };
      const isValid = GrowthService.validatePlant(invalidPlant);
      expect(isValid).toBe(false);
    });

    it('should reject plant without name', () => {
      const invalidPlant = { ...mockPlant, name: '' };
      const isValid = GrowthService.validatePlant(invalidPlant);
      expect(isValid).toBe(false);
    });

    it('should reject plant with invalid growth time', () => {
      const invalidPlant = { ...mockPlant, growth_time_hours: 0 };
      const isValid = GrowthService.validatePlant(invalidPlant);
      expect(isValid).toBe(false);
    });

    it('should reject plant without weather bonus', () => {
      const invalidPlant = { ...mockPlant, weather_bonus: undefined as any };
      const isValid = GrowthService.validatePlant(invalidPlant);
      expect(isValid).toBe(false);
    });

    it('should reject plant without image path', () => {
      const invalidPlant = { ...mockPlant, image_path: '' };
      const isValid = GrowthService.validatePlant(invalidPlant);
      expect(isValid).toBe(false);
    });
  });

  describe('validatePlantedPlant', () => {
    it('should validate correct planted plant data', () => {
      const isValid = GrowthService.validatePlantedPlant(mockPlantedPlant);
      expect(isValid).toBe(true);
    });

    it('should reject planted plant without id', () => {
      const invalidPlant = { ...mockPlantedPlant, id: '' };
      const isValid = GrowthService.validatePlantedPlant(invalidPlant);
      expect(isValid).toBe(false);
    });

    it('should reject planted plant without garden owner id', () => {
      const invalidPlant = { ...mockPlantedPlant, garden_owner_id: '' };
      const isValid = GrowthService.validatePlantedPlant(invalidPlant);
      expect(isValid).toBe(false);
    });

    it('should reject planted plant without planter id', () => {
      const invalidPlant = { ...mockPlantedPlant, planter_id: '' };
      const isValid = GrowthService.validatePlantedPlant(invalidPlant);
      expect(isValid).toBe(false);
    });

    it('should reject planted plant without plant id', () => {
      const invalidPlant = { ...mockPlantedPlant, plant_id: '' };
      const isValid = GrowthService.validatePlantedPlant(invalidPlant);
      expect(isValid).toBe(false);
    });

    it('should reject planted plant with invalid stage', () => {
      const invalidPlant = { ...mockPlantedPlant, current_stage: 0 };
      const isValid = GrowthService.validatePlantedPlant(invalidPlant);
      expect(isValid).toBe(false);
    });

    it('should reject planted plant with stage > 5', () => {
      const invalidPlant = { ...mockPlantedPlant, current_stage: 6 };
      const isValid = GrowthService.validatePlantedPlant(invalidPlant);
      expect(isValid).toBe(false);
    });
  });
}); 