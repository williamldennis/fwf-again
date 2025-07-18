import { renderHook, waitFor } from '@testing-library/react-native';
import { AchievementService, Achievement, AchievementProgress } from '../../services/achievementService';
import useAchievements from '../../hooks/useAchievements';

// Mock the AchievementService
jest.mock('../../services/achievementService');
const mockedAchievementService = AchievementService as jest.Mocked<typeof AchievementService>;

describe('useAchievements', () => {
  const mockUserId = 'test-user-id';
  
  const mockAchievements: Achievement[] = [
    {
      id: 'harvest_25_plants',
      name: 'Dedicated Harvester',
      description: 'Harvest 25 total plants',
      xpReward: 400,
      category: 'milestones',
      requirements: {
        type: 'count',
        action: 'harvest_plant',
        target: 25
      }
    },
    {
      id: 'first_harvest',
      name: 'First Harvest',
      description: 'Harvest your first mature plant',
      xpReward: 150,
      category: 'milestones',
      requirements: {
        type: 'count',
        action: 'harvest_plant',
        target: 1
      }
    }
  ];

  const mockUserAchievements = [
    {
      id: '1',
      user_id: mockUserId,
      achievement_id: 'first_harvest',
      unlocked_at: '2024-01-01T00:00:00Z',
      progress_data: {},
      created_at: '2024-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock getAllAchievements
    mockedAchievementService.getAllAchievements.mockResolvedValue(mockAchievements);
    
    // Mock getUserAchievements
    mockedAchievementService.getUserAchievements.mockResolvedValue(mockUserAchievements);
  });

  it('should fetch achievements and calculate progress correctly', async () => {
    // Mock calculateAchievementProgress to return different values based on achievement ID
    mockedAchievementService.calculateAchievementProgress.mockImplementation(
      async (userId: string, achievement: Achievement) => {
        if (achievement.id === 'harvest_25_plants') {
          return {
            achievementId: 'harvest_25_plants',
            currentProgress: 15, // User has harvested 15 plants
            maxProgress: 25,
            isUnlocked: false
          };
        } else if (achievement.id === 'first_harvest') {
          return {
            achievementId: 'first_harvest',
            currentProgress: 1,
            maxProgress: 1,
            isUnlocked: true
          };
        }
        return {
          achievementId: achievement.id,
          currentProgress: 0,
          maxProgress: achievement.requirements.target,
          isUnlocked: false
        };
      }
    );

    const { result } = renderHook(() => useAchievements(mockUserId));

    // Wait for the hook to finish loading
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify that getAllAchievements was called
    expect(mockedAchievementService.getAllAchievements).toHaveBeenCalled();

    // Verify that getUserAchievements was called
    expect(mockedAchievementService.getUserAchievements).toHaveBeenCalledWith(mockUserId);

    // Verify that calculateAchievementProgress was called for each achievement (may be called multiple times due to React strict mode)
    expect(mockedAchievementService.calculateAchievementProgress).toHaveBeenCalled();

    // Verify the achievements are loaded
    expect(result.current.achievements).toEqual(mockAchievements);

    // Verify the progress is calculated correctly (order may vary)
    expect(result.current.userProgress['harvest_25_plants']).toEqual({
      achievementId: 'harvest_25_plants',
      currentProgress: 15,
      maxProgress: 25,
      isUnlocked: false
    });
    expect(result.current.userProgress['first_harvest']).toEqual({
      achievementId: 'first_harvest',
      currentProgress: 1,
      maxProgress: 1,
      isUnlocked: true
    });

    // Verify category stats
    expect(result.current.categoryStats).toEqual({
      milestones: {
        total: 2,
        completed: 1
      }
    });
  });

  it('should handle errors gracefully', async () => {
    // Mock an error in getAllAchievements
    mockedAchievementService.getAllAchievements.mockRejectedValue(
      new Error('Database error')
    );

    const { result } = renderHook(() => useAchievements(mockUserId));

    // Wait for the hook to finish loading
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have error state
    expect(result.current.error).toBe('Database error');
  });

  it('should return empty state when userId is null', async () => {
    const { result } = renderHook(() => useAchievements(null));

    // Should not be loading and should not call any services
    expect(result.current.loading).toBe(false);
    expect(mockedAchievementService.getAllAchievements).not.toHaveBeenCalled();
    expect(mockedAchievementService.getUserAchievements).not.toHaveBeenCalled();
  });

  it('should refresh achievements when refresh is called', async () => {
    mockedAchievementService.calculateAchievementProgress
      .mockResolvedValue({
        achievementId: 'harvest_25_plants',
        currentProgress: 15,
        maxProgress: 25,
        isUnlocked: false
      });

    const { result } = renderHook(() => useAchievements(mockUserId));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mocks to verify refresh calls
    jest.clearAllMocks();
    mockedAchievementService.getAllAchievements.mockResolvedValue(mockAchievements);
    mockedAchievementService.getUserAchievements.mockResolvedValue(mockUserAchievements);
    mockedAchievementService.calculateAchievementProgress.mockResolvedValue({
      achievementId: 'harvest_25_plants',
      currentProgress: 20, // Updated progress
      maxProgress: 25,
      isUnlocked: false
    });

    // Call refresh
    await result.current.refresh();

    // Verify services were called again
    expect(mockedAchievementService.getAllAchievements).toHaveBeenCalled();
    expect(mockedAchievementService.getUserAchievements).toHaveBeenCalled();
    expect(mockedAchievementService.calculateAchievementProgress).toHaveBeenCalled();
  });
}); 