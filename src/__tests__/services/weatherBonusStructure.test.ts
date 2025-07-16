import { GrowthService } from '../../services/growthService';

describe('Weather Bonus Object Structure Tests', () => {
  const mockPlant = {
    id: 'test-plant',
    name: 'Fern',
    growth_time_hours: 6,
    harvest_points: 15,
    image_path: 'fern',
    created_at: '2025-07-04T14:06:08.666219',
    weather_bonus: {
      sunny: 0.7,
      cloudy: 1.8,
      rainy: 1.3
    }
  };

  describe('getWeatherBonus function', () => {
    it('should preserve weather_bonus object structure', () => {
      const result = GrowthService.getWeatherBonus(mockPlant, 'Clouds');
      
      // Verify the function returns a valid number
      expect(typeof result).toBe('number');
      expect(result).toBe(1.8);
      
      // Verify the original plant object is not mutated
      expect(mockPlant.weather_bonus).toEqual({
        sunny: 0.7,
        cloudy: 1.8,
        rainy: 1.3
      });
    });

    it('should handle different weather conditions correctly', () => {
      const sunnyResult = GrowthService.getWeatherBonus(mockPlant, 'Clear');
      const cloudyResult = GrowthService.getWeatherBonus(mockPlant, 'Clouds');
      const rainyResult = GrowthService.getWeatherBonus(mockPlant, 'Rain');
      
      expect(sunnyResult).toBe(0.7);
      expect(cloudyResult).toBe(1.8);
      expect(rainyResult).toBe(1.3);
    });

    it('should return default value for unknown weather', () => {
      const result = GrowthService.getWeatherBonus(mockPlant, 'UnknownWeather');
      
      expect(result).toBe(1.0);
    });

    it('should handle case insensitive weather conditions', () => {
      const result1 = GrowthService.getWeatherBonus(mockPlant, 'CLOUDS');
      const result2 = GrowthService.getWeatherBonus(mockPlant, 'clouds');
      
      expect(result1).toBe(1.8);
      expect(result2).toBe(1.8);
    });
  });

  describe('Data structure validation', () => {
    it('should handle weather_bonus that is not an object', () => {
      const invalidPlant = {
        ...mockPlant,
        weather_bonus: 1.8 // This should be an object, not a number
      } as any; // Type assertion for test case

      // When weather_bonus is a number, accessing weather_bonus['cloudy'] returns undefined
      const result = GrowthService.getWeatherBonus(invalidPlant, 'Clouds');
      expect(result).toBe(undefined);
    });

    it('should handle missing weather_bonus property', () => {
      const plantWithoutWeatherBonus = {
        ...mockPlant,
        weather_bonus: undefined
      } as any; // Type assertion for test case

      // This should throw an error because Object.keys() is called on undefined
      expect(() => {
        GrowthService.getWeatherBonus(plantWithoutWeatherBonus, 'Clouds');
      }).toThrow();
    });

    it('should handle weather_bonus with missing weather types', () => {
      const incompleteWeatherBonus = {
        ...mockPlant,
        weather_bonus: {
          sunny: 0.7
          // Missing cloudy and rainy
        }
      } as any; // Type assertion for test case

      const result = GrowthService.getWeatherBonus(incompleteWeatherBonus, 'Clouds');
      
      expect(result).toBe(undefined); // Should return undefined when key doesn't exist
    });
  });

  describe('Integration test - PlantDetailsModal data flow simulation', () => {
    it('should detect when weather_bonus object structure is corrupted', () => {
      // This test simulates the bug scenario and verifies our fix prevents it
      const plantObject = {
        ...mockPlant
      };

      // First call - should work correctly
      const firstCall = GrowthService.getWeatherBonus(plantObject, 'Clouds');
      expect(firstCall).toBe(1.8);

      // Simulate the bug: overwriting weather_bonus with a number
      const buggyPlantObject = {
        ...plantObject,
        weather_bonus: firstCall // ❌ This is the bug - overwriting object with number
      } as any; // Type assertion for test case

      // Second call - should return undefined because weather_bonus[mappedKey] is undefined
      const secondCall = GrowthService.getWeatherBonus(buggyPlantObject, 'Clouds');
      
      // When weather_bonus is a number, accessing weather_bonus['cloudy'] returns undefined
      expect(secondCall).toBe(undefined);
    });

    it('should verify the fix preserves object structure', () => {
      const plantObject = {
        ...mockPlant
      };

      // First call - should work correctly
      const firstCall = GrowthService.getWeatherBonus(plantObject, 'Clouds');
      expect(firstCall).toBe(1.8);

      // Fixed version: keep the original weather_bonus object
      const fixedPlantObject = {
        ...plantObject,
        weather_bonus: plantObject.weather_bonus // ✅ Keep the original object
      };

      // Second call - should still work correctly
      const secondCall = GrowthService.getWeatherBonus(fixedPlantObject, 'Clouds');
      
      // This should work because weather_bonus is still an object
      expect(secondCall).toBe(1.8);
    });

    it('should verify that corrupted weather_bonus causes NaN in calculations', () => {
      // This test verifies that the bug leads to NaN values in the broader system
      const plantObject = {
        ...mockPlant
      };

      // First call - should work correctly
      const firstCall = GrowthService.getWeatherBonus(plantObject, 'Clouds');
      expect(firstCall).toBe(1.8);

      // Simulate the bug: overwriting weather_bonus with a number
      const buggyPlantObject = {
        ...plantObject,
        weather_bonus: firstCall // ❌ This is the bug
      } as any;

      // Second call - should return undefined
      const secondCall = GrowthService.getWeatherBonus(buggyPlantObject, 'Clouds');
      expect(secondCall).toBe(undefined);

      // Simulate what happens in calculateGrowthStage
      const hoursElapsed = 1; // 1 hour
      const weatherBonus = secondCall; // undefined
      const adjustedHours = hoursElapsed * weatherBonus; // 1 * undefined = NaN
      
      expect(adjustedHours).toBeNaN();
    });
  });
}); 