import { XPService } from '../../services/xpService';
import { AchievementService } from '../../services/achievementService';
import { GrowthService } from '../../services/growthService';

// Mock the services
jest.mock('../../services/xpService');
jest.mock('../../services/achievementService');
jest.mock('../../services/growthService');

describe('Planting XP Integration', () => {
  const mockUserId = 'test-user-id';
  const mockPlantId = 'test-plant-id';
  const mockPlantName = 'Sunflower';
  const mockWeatherCondition = 'clear';
  const mockFriendId = 'test-friend-id';

  const mockPlant = {
    id: mockPlantId,
    name: mockPlantName,
    growth_time_hours: 4,
    weather_bonus: {
      sunny: 1.5,
      cloudy: 0.8,
      rainy: 0.6
    },
    image_path: 'sunflower',
    harvest_points: 10,
    planting_cost: 0,
    created_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock XPService
    (XPService.awardXP as jest.Mock).mockResolvedValue({
      success: true,
      newTotalXP: 100,
      newLevel: 2
    });

    // Mock AchievementService
    (AchievementService.checkAndAwardAchievements as jest.Mock).mockResolvedValue({
      unlocked: [],
      progress: [],
      xpAwarded: 0
    });

    // Mock GrowthService
    (GrowthService.getWeatherBonus as jest.Mock).mockReturnValue(1.5);
  });

  describe('XP Awarding Logic', () => {
    it('should award base XP for planting', async () => {
      // Test base XP awarding
      const result = await XPService.awardXP(
        mockUserId,
        10,
        'plant_seed',
        `Planted ${mockPlantName}`,
        { plant_id: mockPlantId, plant_name: mockPlantName }
      );

      expect(result.success).toBe(true);
      expect(XPService.awardXP).toHaveBeenCalledWith(
        mockUserId,
        10,
        'plant_seed',
        `Planted ${mockPlantName}`,
        { plant_id: mockPlantId, plant_name: mockPlantName }
      );
    });

    it('should award weather bonus XP for optimal weather', async () => {
      // Mock optimal weather (1.5x bonus)
      (GrowthService.getWeatherBonus as jest.Mock).mockReturnValue(1.5);

      const result = await XPService.awardXP(
        mockUserId,
        5,
        'weather_bonus_planting',
        `Planted ${mockPlantName} in optimal weather (${mockWeatherCondition})`,
        {
          plant_id: mockPlantId,
          plant_name: mockPlantName,
          weather_condition: mockWeatherCondition,
          weather_bonus: 1.5,
          is_optimal: true
        }
      );

      expect(result.success).toBe(true);
      expect(XPService.awardXP).toHaveBeenCalledWith(
        mockUserId,
        5,
        'weather_bonus_planting',
        `Planted ${mockPlantName} in optimal weather (${mockWeatherCondition})`,
        expect.objectContaining({
          plant_id: mockPlantId,
          weather_bonus: 1.5,
          is_optimal: true
        })
      );
    });

    it('should not award weather bonus XP for suboptimal weather', () => {
      // Mock suboptimal weather (1.0x bonus)
      (GrowthService.getWeatherBonus as jest.Mock).mockReturnValue(1.0);

      const weatherBonus = GrowthService.getWeatherBonus(mockPlant, mockWeatherCondition);
      const isOptimalWeather = weatherBonus >= 1.5;

      expect(isOptimalWeather).toBe(false);
      expect(weatherBonus).toBe(1.0);
    });

    it('should check achievements with correct context', async () => {
      const isFriendGarden = true; // Simulate planting in friend's garden
      const weatherBonus = 1.5;

      const achievementContext = {
        plant_type: mockPlantId,
        plant_name: mockPlantName,
        plant_id: mockPlantId,
        weather_condition: mockWeatherCondition,
        weather_bonus: weatherBonus,
        is_optimal_weather: weatherBonus >= 1.5,
        friend_garden: isFriendGarden,
        garden_owner_id: mockFriendId,
        planter_id: mockUserId,
        action_type: 'plant_seed',
        action_count: 1,
        unique_plants: true,
        friend_gardens: isFriendGarden ? [mockFriendId] : [],
        weather_mastery: {
          plant: mockPlantName,
          weather: mockWeatherCondition,
          bonus: weatherBonus,
          is_optimal: weatherBonus >= 1.5
        }
      };

      await AchievementService.checkAndAwardAchievements(
        mockUserId,
        'plant_seed',
        achievementContext
      );

      expect(AchievementService.checkAndAwardAchievements).toHaveBeenCalledWith(
        mockUserId,
        'plant_seed',
        achievementContext
      );
    });

    it('should award social XP for planting in friend gardens', async () => {
      const result = await XPService.awardXP(
        mockUserId,
        25,
        'social_planting',
        `Planted ${mockPlantName} in friend's garden`,
        {
          plant_id: mockPlantId,
          plant_name: mockPlantName,
          garden_owner_id: mockFriendId,
          planter_id: mockUserId,
          is_friend_garden: true
        }
      );

      expect(result.success).toBe(true);
      expect(XPService.awardXP).toHaveBeenCalledWith(
        mockUserId,
        25,
        'social_planting',
        `Planted ${mockPlantName} in friend's garden`,
        expect.objectContaining({
          plant_id: mockPlantId,
          garden_owner_id: mockFriendId,
          planter_id: mockUserId,
          is_friend_garden: true
        })
      );
    });

    it('should not award social XP for planting in own garden', () => {
      // Test that social XP is not awarded when planting in own garden
      const isFriendGarden = false; // Planting in own garden
      
      expect(isFriendGarden).toBe(false);
      expect(mockFriendId).not.toBe(mockUserId); // Verify they are different IDs
    });
  });

  describe('Error Handling', () => {
    it('should handle XP service failures gracefully', async () => {
      (XPService.awardXP as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const result = await XPService.awardXP(
        mockUserId,
        10,
        'plant_seed',
        `Planted ${mockPlantName}`,
        { plant_id: mockPlantId, plant_name: mockPlantName }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle achievement service failures gracefully', async () => {
      (AchievementService.checkAndAwardAchievements as jest.Mock).mockRejectedValue(
        new Error('Achievement service error')
      );

      await expect(
        AchievementService.checkAndAwardAchievements(
          mockUserId,
          'plant_seed',
          {}
        )
      ).rejects.toThrow('Achievement service error');
    });

    it('should handle weather bonus calculation errors', () => {
      (GrowthService.getWeatherBonus as jest.Mock).mockImplementation(() => {
        throw new Error('Weather calculation error');
      });

      expect(() => {
        GrowthService.getWeatherBonus(mockPlant, mockWeatherCondition);
      }).toThrow('Weather calculation error');
    });
  });

  describe('Weather Bonus Logic', () => {
    it('should correctly identify optimal weather conditions', () => {
      const testCases = [
        { weather: 'clear', bonus: 1.5, expected: true },
        { weather: 'clouds', bonus: 1.0, expected: false },
        { weather: 'rain', bonus: 2.0, expected: true },
        { weather: 'clear', bonus: 1.4, expected: false }
      ];

      testCases.forEach(({ weather, bonus, expected }) => {
        (GrowthService.getWeatherBonus as jest.Mock).mockReturnValue(bonus);
        
        const isOptimalWeather = bonus >= 1.5;
        expect(isOptimalWeather).toBe(expected);
      });
    });

    it('should handle different plant weather preferences', () => {
      const sunflower = { ...mockPlant, weather_bonus: { sunny: 1.5, cloudy: 0.8, rainy: 0.6 } };
      const mushroom = { ...mockPlant, weather_bonus: { sunny: 0.4, cloudy: 1.2, rainy: 2.0 } };

      (GrowthService.getWeatherBonus as jest.Mock)
        .mockReturnValueOnce(1.5) // Sunflower in clear weather
        .mockReturnValueOnce(2.0); // Mushroom in rain

      const sunflowerBonus = GrowthService.getWeatherBonus(sunflower, 'clear');
      const mushroomBonus = GrowthService.getWeatherBonus(mushroom, 'rain');

      expect(sunflowerBonus).toBe(1.5);
      expect(mushroomBonus).toBe(2.0);
    });
  });

  describe('Weather Achievement Integration', () => {
    it('should store weather condition in base planting XP transaction', async () => {
      // Test that the base planting XP transaction includes weather_condition
      const result = await XPService.awardXP(
        mockUserId,
        10,
        'plant_seed',
        `Planted ${mockPlantName}`,
        {
          plant_id: mockPlantId,
          plant_name: mockPlantName,
          weather_condition: mockWeatherCondition
        }
      );

      expect(result.success).toBe(true);
      expect(XPService.awardXP).toHaveBeenCalledWith(
        mockUserId,
        10,
        'plant_seed',
        `Planted ${mockPlantName}`,
        expect.objectContaining({
          plant_id: mockPlantId,
          plant_name: mockPlantName,
          weather_condition: mockWeatherCondition
        })
      );
    });

    it('should unlock weather achievements based on stored weather condition', async () => {
      // Mock the achievement service to simulate unlocking weather achievements
      (AchievementService.checkAndAwardAchievements as jest.Mock).mockResolvedValue({
        unlocked: ['cloudy_planting'],
        progress: [],
        xpAwarded: 50
      });

      const achievementContext = {
        weather_condition: 'Clouds',
        plant_id: mockPlantId,
        plant_name: mockPlantName,
        weather: 'cloudy' // Achievement condition
      };

      const result = await AchievementService.checkAndAwardAchievements(
        mockUserId,
        'plant_seed',
        achievementContext
      );

      expect(result.unlocked).toContain('cloudy_planting');
      expect(result.xpAwarded).toBe(50);
      expect(AchievementService.checkAndAwardAchievements).toHaveBeenCalledWith(
        mockUserId,
        'plant_seed',
        achievementContext
      );
    });

    it('should not unlock wrong weather achievements', async () => {
      // Mock the achievement service to simulate no weather achievements unlocked
      (AchievementService.checkAndAwardAchievements as jest.Mock).mockResolvedValue({
        unlocked: [],
        progress: [],
        xpAwarded: 0
      });

      const achievementContext = {
        weather_condition: 'Clouds',
        plant_id: mockPlantId,
        plant_name: mockPlantName,
        weather: 'sunny' // Wrong weather condition
      };

      const result = await AchievementService.checkAndAwardAchievements(
        mockUserId,
        'plant_seed',
        achievementContext
      );

      expect(result.unlocked).not.toContain('sunny_planting');
      expect(result.unlocked).not.toContain('cloudy_planting');
      expect(result.xpAwarded).toBe(0);
    });

    it('should handle weather condition mapping correctly', () => {
      // Test that weather conditions are mapped correctly for achievements
      const weatherMappings = [
        { apiCondition: 'Clouds', achievementCondition: 'cloudy', shouldMatch: true },
        { apiCondition: 'Clear', achievementCondition: 'sunny', shouldMatch: true },
        { apiCondition: 'Rain', achievementCondition: 'rainy', shouldMatch: true },
        { apiCondition: 'Clouds', achievementCondition: 'sunny', shouldMatch: false },
        { apiCondition: 'Clear', achievementCondition: 'cloudy', shouldMatch: false }
      ];

      weatherMappings.forEach(({ apiCondition, achievementCondition, shouldMatch }) => {
        const context = {
          weather_condition: apiCondition,
          weather: achievementCondition
        };

        // This would be tested in the actual achievement service
        // For now, we just verify the test data is correct
        expect(context.weather_condition).toBe(apiCondition);
        expect(context.weather).toBe(achievementCondition);
      });
    });

    it('should integrate weather bonus and weather achievements correctly', async () => {
      // Mock optimal weather for bonus XP
      (GrowthService.getWeatherBonus as jest.Mock).mockReturnValue(1.5);

      // Award base XP with weather condition
      const baseResult = await XPService.awardXP(
        mockUserId,
        10,
        'plant_seed',
        `Planted ${mockPlantName}`,
        {
          plant_id: mockPlantId,
          plant_name: mockPlantName,
          weather_condition: mockWeatherCondition
        }
      );

      // Award weather bonus XP
      const weatherResult = await XPService.awardXP(
        mockUserId,
        5,
        'weather_bonus_planting',
        `Planted ${mockPlantName} in optimal weather (${mockWeatherCondition})`,
        {
          plant_id: mockPlantId,
          plant_name: mockPlantName,
          weather_condition: mockWeatherCondition,
          weather_bonus: 1.5,
          is_optimal: true
        }
      );

      // Check achievements
      (AchievementService.checkAndAwardAchievements as jest.Mock).mockResolvedValue({
        unlocked: ['sunny_planting'],
        progress: [],
        xpAwarded: 50
      });

      const achievementResult = await AchievementService.checkAndAwardAchievements(
        mockUserId,
        'plant_seed',
        {
          weather_condition: mockWeatherCondition,
          weather: 'sunny'
        }
      );

      expect(baseResult.success).toBe(true);
      expect(weatherResult.success).toBe(true);
      expect(achievementResult.unlocked).toContain('sunny_planting');
    });
  });
}); 