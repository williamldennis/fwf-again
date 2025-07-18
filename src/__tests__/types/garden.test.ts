import { Plant } from '../../types/garden';

describe('Garden Types', () => {
  describe('Plant Interface', () => {
    it('should include planting_cost field', () => {
      const plant: Plant = {
        id: 'test-plant',
        name: 'Test Plant',
        growth_time_hours: 4,
        weather_bonus: {
          sunny: 1.0,
          cloudy: 1.0,
          rainy: 1.0
        },
        image_path: 'test-plant',
        harvest_points: 5,
        planting_cost: 0, // Now free!
        created_at: '2024-01-01T00:00:00Z'
      };

      expect(plant).toHaveProperty('planting_cost');
      expect(typeof plant.planting_cost).toBe('number');
      expect(plant.planting_cost).toBe(0);
    });

    it('should validate complete plant structure', () => {
      const plant: Plant = {
        id: 'mushroom',
        name: 'Mushroom',
        growth_time_hours: 2,
        weather_bonus: {
          sunny: 0.4,
          cloudy: 1.2,
          rainy: 2.0
        },
        image_path: 'mushroom',
        harvest_points: 8,
        planting_cost: 3,
        created_at: '2024-01-01T00:00:00Z'
      };

      // Verify all required fields are present
      expect(plant.id).toBeDefined();
      expect(plant.name).toBeDefined();
      expect(plant.growth_time_hours).toBeDefined();
      expect(plant.weather_bonus).toBeDefined();
      expect(plant.image_path).toBeDefined();
      expect(plant.harvest_points).toBeDefined();
      expect(plant.planting_cost).toBeDefined();
      expect(plant.created_at).toBeDefined();

      // Verify profit calculation works
      const profit = plant.harvest_points - plant.planting_cost;
      expect(profit).toBe(5); // 5 - 0 = 5
    });

    it('should support all plant types with their costs', () => {
      const plants: Plant[] = [
        {
          id: 'mushroom',
          name: 'Mushroom',
          growth_time_hours: 2,
          weather_bonus: { sunny: 0.4, cloudy: 1.2, rainy: 2.0 },
          image_path: 'mushroom',
          harvest_points: 8,
          planting_cost: 3,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'cactus',
          name: 'Cactus',
          growth_time_hours: 3,
          weather_bonus: { sunny: 2.0, cloudy: 0.6, rainy: 0.3 },
          image_path: 'cactus',
          harvest_points: 12,
          planting_cost: 4,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'sunflower',
          name: 'Sunflower',
          growth_time_hours: 4,
          weather_bonus: { sunny: 1.5, cloudy: 0.8, rainy: 0.6 },
          image_path: 'sunflower',
          harvest_points: 5,
          planting_cost: 0, // Now free!
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'water_lily',
          name: 'Water Lily',
          growth_time_hours: 5,
          weather_bonus: { sunny: 0.5, cloudy: 1.0, rainy: 1.8 },
          image_path: 'water_lily',
          harvest_points: 18,
          planting_cost: 7,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'fern',
          name: 'Fern',
          growth_time_hours: 6,
          weather_bonus: { sunny: 0.7, cloudy: 1.8, rainy: 1.3 },
          image_path: 'fern',
          harvest_points: 15,
          planting_cost: 8,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'pine_tree',
          name: 'Pine Tree',
          growth_time_hours: 8,
          weather_bonus: { sunny: 0.8, cloudy: 1.5, rainy: 1.2 },
          image_path: 'pine_tree',
          harvest_points: 25,
          planting_cost: 12,
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      // Verify all plants have planting_cost
      plants.forEach(plant => {
        expect(plant).toHaveProperty('planting_cost');
        expect(typeof plant.planting_cost).toBe('number');
        expect(plant.planting_cost).toBeGreaterThanOrEqual(0);
      });

      // Verify profit calculations
      const profits = plants.map(plant => ({
        name: plant.name,
        profit: plant.harvest_points - plant.planting_cost
      }));

      expect(profits).toEqual([
        { name: 'Mushroom', profit: 5 },
        { name: 'Cactus', profit: 8 },
        { name: 'Sunflower', profit: 5 },
        { name: 'Water Lily', profit: 11 },
        { name: 'Fern', profit: 7 },
        { name: 'Pine Tree', profit: 13 }
      ]);

      // Verify all plants have positive profit
      profits.forEach(({ name, profit }) => {
        expect(profit).toBeGreaterThan(0);
      });
    });
  });
}); 