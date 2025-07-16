import { GardenService } from '../../services/gardenService';
import { GrowthService } from '../../services/growthService';

// Mock the supabase module
jest.mock('../../utils/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

// Mock GrowthService
jest.mock('../../services/growthService', () => ({
  GrowthService: {
    calculateGrowthStage: jest.fn()
  }
}));

// Import the mocked modules
import { supabase } from '../../utils/supabase';

describe('GardenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchAvailablePlants', () => {
    it('should fetch and return available plants', async () => {
      const mockPlants = [
        { id: '1', name: 'Sunflower', growth_time_hours: 24 },
        { id: '2', name: 'Cactus', growth_time_hours: 48 }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockPlants, error: null })
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await GardenService.fetchAvailablePlants();

      expect(supabase.from).toHaveBeenCalledWith('plants');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('name');
      expect(result).toEqual(mockPlants);
    });

    it('should handle errors', async () => {
      const mockError = new Error('Database error');
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: mockError })
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await expect(GardenService.fetchAvailablePlants()).rejects.toThrow('Database error');
    });
  });

  describe('fetchPlantedPlants', () => {
    it('should fetch planted plants for a specific friend', async () => {
      const mockPlantedPlants = [
        {
          id: '1',
          garden_owner_id: 'friend1',
          plant: { id: '1', name: 'Sunflower' }
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockPlantedPlants, error: null })
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await GardenService.fetchPlantedPlants('friend1');

      expect(supabase.from).toHaveBeenCalledWith('planted_plants');
      expect(mockQuery.select).toHaveBeenCalledWith('*, plant:plants(*)');
      expect(mockQuery.eq).toHaveBeenCalledWith('garden_owner_id', 'friend1');
      expect(mockQuery.is).toHaveBeenCalledWith('harvested_at', null);
      expect(result).toEqual(mockPlantedPlants);
    });
  });

  describe('fetchAllPlantedPlantsBatch', () => {
    it('should fetch planted plants for multiple users and group them', async () => {
      const mockAllPlants = [
        {
          id: '1',
          garden_owner_id: 'user1',
          plant: { id: '1', name: 'Sunflower' }
        },
        {
          id: '2',
          garden_owner_id: 'user1',
          plant: { id: '2', name: 'Cactus' }
        },
        {
          id: '3',
          garden_owner_id: 'user2',
          plant: { id: '1', name: 'Sunflower' }
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockAllPlants, error: null })
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await GardenService.fetchAllPlantedPlantsBatch(['user1', 'user2']);

      expect(supabase.from).toHaveBeenCalledWith('planted_plants');
      expect(mockQuery.select).toHaveBeenCalledWith('*, plant:plants(*)');
      expect(mockQuery.in).toHaveBeenCalledWith('garden_owner_id', ['user1', 'user2']);
      expect(result).toEqual({
        user1: [
          { id: '1', garden_owner_id: 'user1', plant: { id: '1', name: 'Sunflower' } },
          { id: '2', garden_owner_id: 'user1', plant: { id: '2', name: 'Cactus' } }
        ],
        user2: [
          { id: '3', garden_owner_id: 'user2', plant: { id: '1', name: 'Sunflower' } }
        ]
      });
    });

    it('should return empty object for empty userIds array', async () => {
      const result = await GardenService.fetchAllPlantedPlantsBatch([]);
      expect(result).toEqual({});
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('plantSeed', () => {
    it('should plant a seed successfully', async () => {
      const mockAvailablePlants = [
        { id: '1', name: 'Sunflower' },
        { id: '2', name: 'Cactus' }
      ];

      const mockPlantedPlant = {
        id: 'new-plant-id',
        garden_owner_id: 'friend1',
        planter_id: 'user1',
        plant_id: '1',
        current_stage: 2,
        is_mature: false,
        slot: 0
      };

      // Mock for slot check (empty result = slot available)
      const mockSlotQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ data: [], error: null })
      };

      // Mock for plant insertion
      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPlantedPlant, error: null })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSlotQuery)
        .mockReturnValueOnce(mockInsertQuery);

      const result = await GardenService.plantSeed({
        friendId: 'friend1',
        slotIdx: 0,
        plantId: '1',
        userId: 'user1',
        availablePlants: mockAvailablePlants
      });

      expect(supabase.from).toHaveBeenCalledWith('planted_plants');
      expect(mockSlotQuery.eq).toHaveBeenCalledWith('garden_owner_id', 'friend1');
      expect(mockSlotQuery.eq).toHaveBeenCalledWith('slot', 0);
      expect(mockInsertQuery.insert).toHaveBeenCalledWith({
        garden_owner_id: 'friend1',
        planter_id: 'user1',
        plant_id: '1',
        current_stage: 2,
        is_mature: false,
        slot: 0
      });
      expect(result).toEqual({
        ...mockPlantedPlant,
        plant: mockAvailablePlants[0]
      });
    });

    it('should throw error when slot is occupied', async () => {
      const mockAvailablePlants = [{ id: '1', name: 'Sunflower' }];
      
      const mockSlotQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ data: [{ id: 'existing-plant' }], error: null })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSlotQuery);

      await expect(GardenService.plantSeed({
        friendId: 'friend1',
        slotIdx: 0,
        plantId: '1',
        userId: 'user1',
        availablePlants: mockAvailablePlants
      })).rejects.toThrow('Slot Occupied');
    });
  });

  describe('refreshUserPoints', () => {
    it('should fetch and return user points', async () => {
      const mockProfile = { points: 150 };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await GardenService.refreshUserPoints('user1');

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockQuery.select).toHaveBeenCalledWith('points');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'user1');
      expect(result).toBe(150);
    });

    it('should return 0 when profile not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await GardenService.refreshUserPoints('user1');
      expect(result).toBe(0);
    });
  });

  describe('updatePlantGrowth', () => {
    it('should update plant growth for immature plants', async () => {
      const mockPlantedPlants = [
        {
          id: '1',
          garden_owner_id: 'user1',
          plant: { id: '1', name: 'Sunflower' },
          is_mature: false
        }
      ];

      const mockProfile = { weather_condition: 'clear' };

      // Mock for planted plants query
      const mockPlantedQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockPlantedPlants, error: null })
      };

      // Mock for profile query
      const mockProfileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
      };

      // Mock for update query
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockPlantedQuery)
        .mockReturnValueOnce(mockProfileQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      // Mock GrowthService
      (GrowthService.calculateGrowthStage as jest.Mock).mockReturnValue({
        stage: 5,
        progress: 100
      });

      await GardenService.updatePlantGrowth();

      expect(supabase.from).toHaveBeenCalledWith('planted_plants');
      expect(mockPlantedQuery.select).toHaveBeenCalledWith('*, plant:plants(*)');
      expect(mockPlantedQuery.eq).toHaveBeenCalledWith('is_mature', false);
    });

    it('should handle empty planted plants', async () => {
      const mockPlantedQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockPlantedQuery);

      await GardenService.updatePlantGrowth();

      expect(supabase.from).toHaveBeenCalledWith('planted_plants');
      // Should not make additional calls since no plants to process
    });
  });
}); 