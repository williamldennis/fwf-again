import { ActivityService } from '../../services/activityService';
import { supabase } from '../../utils/supabase';

// Mock Supabase
jest.mock('../../utils/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        on: jest.fn(() => ({
          subscribe: jest.fn(),
        })),
      })),
      unsubscribe: jest.fn(),
    })),
  },
}));

describe('ActivityService', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logActivity', () => {
    it('should log activity successfully', async () => {
      const mockRpcResponse = { data: true, error: null } as any;
      mockSupabase.rpc.mockResolvedValue(mockRpcResponse);

      const result = await ActivityService.logActivity(
        'garden-owner-id',
        'actor-id',
        'planted',
        'plant-id',
        'Sunflower',
        'John Doe',
        'planted-plant-id'
      );

      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_garden_activity', {
        p_garden_owner_id: 'garden-owner-id',
        p_actor_id: 'actor-id',
        p_activity_type: 'planted',
        p_plant_id: 'plant-id',
        p_plant_name: 'Sunflower',
        p_actor_name: 'John Doe',
        p_planted_plant_id: 'planted-plant-id',
      });
    });

    it('should handle errors gracefully', async () => {
      const mockRpcResponse = { data: null, error: { message: 'Database error' } } as any;
      mockSupabase.rpc.mockResolvedValue(mockRpcResponse);

      const result = await ActivityService.logActivity(
        'garden-owner-id',
        'actor-id',
        'planted',
        'plant-id',
        'Sunflower',
        'John Doe'
      );

      expect(result).toBe(false);
    });
  });

  describe('getGardenActivities', () => {
    it('should fetch activities successfully', async () => {
      const mockActivities = [
        {
          id: 'activity-1',
          garden_owner_id: 'garden-owner-id',
          actor_id: 'actor-id',
          activity_type: 'planted',
          plant_id: 'plant-id',
          plant_name: 'Sunflower',
          actor_name: 'John Doe',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockActivitiesResponse = {
        data: mockActivities,
        error: null,
        count: 1,
      };

      const mockProfilesResponse = {
        data: [
          {
            id: 'garden-owner-id',
            full_name: 'Garden Owner',
          },
        ],
        error: null,
      };

      // Mock the activities query
      const mockFromActivities = {
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue(mockActivitiesResponse),
            }),
          }),
        }),
      };

      // Mock the profiles query
      const mockFromProfiles = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue(mockProfilesResponse),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockFromActivities as any)
        .mockReturnValueOnce(mockFromProfiles as any);

      const result = await ActivityService.getGardenActivities('garden-owner-id');

      expect(result.success).toBe(true);
      expect(result.activities).toEqual([
        {
          ...mockActivities[0],
          garden_owner_name: 'Garden Owner',
        },
      ]);
      expect(result.hasMore).toBe(false);
    });

    it('should handle pagination correctly', async () => {
      const mockActivities = [
        {
          id: 'activity-1',
          garden_owner_id: 'garden-owner-id',
          actor_id: 'actor-id',
          activity_type: 'planted',
          plant_id: 'plant-id',
          plant_name: 'Sunflower',
          actor_name: 'John Doe',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockActivitiesResponse = {
        data: mockActivities,
        error: null,
        count: 50,
      };

      const mockProfilesResponse = {
        data: [
          {
            id: 'garden-owner-id',
            full_name: 'Garden Owner',
          },
        ],
        error: null,
      };

      // Mock the activities query
      const mockFromActivities = {
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue(mockActivitiesResponse),
            }),
          }),
        }),
      };

      // Mock the profiles query
      const mockFromProfiles = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue(mockProfilesResponse),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockFromActivities as any)
        .mockReturnValueOnce(mockFromProfiles as any);

      const result = await ActivityService.getGardenActivities('garden-owner-id', 0, 25);

      expect(result.success).toBe(true);
      expect(result.hasMore).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const mockActivitiesResponse = {
        data: null,
        error: { message: 'Database error' },
        count: null,
      };

      // Mock the activities query to return an error
      const mockFromActivities = {
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue(mockActivitiesResponse),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockFromActivities as any);

      const result = await ActivityService.getGardenActivities('garden-owner-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('subscribeToActivities', () => {
    it('should subscribe to activities', () => {
      const mockOnActivity = jest.fn();
      ActivityService.subscribeToActivities('garden-owner-id', mockOnActivity);

      expect(mockSupabase.channel).toHaveBeenCalledWith('garden_activities_garden-owner-id');
    });
  });

  describe('unsubscribeFromActivities', () => {
    it('should unsubscribe from activities', () => {
      ActivityService.unsubscribeFromActivities('garden-owner-id');

      expect(mockSupabase.channel).toHaveBeenCalledWith('garden_activities_garden-owner-id');
    });
  });
});