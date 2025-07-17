import { AchievementService, Achievement, UserAchievement, AchievementProgress, AchievementCheckResult } from '../../services/achievementService';
import { XPService } from '../../services/xpService';

// Mock the supabase module
jest.mock('../../utils/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn()
  }
}));

// Mock the XPService
jest.mock('../../services/xpService', () => ({
  XPService: {
    awardXP: jest.fn()
  }
}));

// Import the mocked modules
import { supabase } from '../../utils/supabase';

describe('AchievementService', () => {
  const mockUserId = 'test-user-id';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAndAwardAchievements', () => {
    it('should handle invalid parameters', async () => {
      const result = await AchievementService.checkAndAwardAchievements('', '');

      expect(result).toEqual({
        unlocked: [],
        progress: [],
        xpAwarded: 0
      });
    });

    it('should not award already unlocked achievements', async () => {
      const mockUserAchievements: UserAchievement[] = [
        {
          id: '1',
          user_id: mockUserId,
          achievement_id: 'first_seed',
          unlocked_at: '2024-01-01T00:00:00Z',
          progress_data: {},
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      // Mock getUserAchievements
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockUserAchievements, error: null })
      });

      const result = await AchievementService.checkAndAwardAchievements(
        mockUserId,
        'plant_seed'
      );

      expect(result.unlocked).toEqual([]);
      expect(result.xpAwarded).toBe(0);
      expect(XPService.awardXP).not.toHaveBeenCalled();
    });

    it('should handle invalid parameters', async () => {
      const result = await AchievementService.checkAndAwardAchievements('', '');

      expect(result).toEqual({
        unlocked: [],
        progress: [],
        xpAwarded: 0
      });
    });

    it('should handle exceptions', async () => {
      // Mock getUserAchievements to throw an error
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const result = await AchievementService.checkAndAwardAchievements(
        mockUserId,
        'plant_seed'
      );

      expect(result.unlocked).toEqual([]);
      expect(result.xpAwarded).toBe(0);
    });
  });

  describe('getUserAchievements', () => {
    it('should get user achievements successfully', async () => {
      const mockUserAchievements: UserAchievement[] = [
        {
          id: '1',
          user_id: mockUserId,
          achievement_id: 'first_seed',
          unlocked_at: '2024-01-01T00:00:00Z',
          progress_data: {},
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockUserAchievements, error: null })
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await AchievementService.getUserAchievements(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('user_achievements');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockQuery.order).toHaveBeenCalledWith('unlocked_at', { ascending: false });
      expect(result).toEqual(mockUserAchievements);
    });

    it('should return empty array for invalid userId', async () => {
      const result = await AchievementService.getUserAchievements('');

      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await AchievementService.getUserAchievements(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getAllAchievements', () => {
    it('should return all available achievements', async () => {
      const result = await AchievementService.getAllAchievements();

      expect(result).toHaveLength(11); // Number of achievements defined in the service
      expect(result.some(a => a.id === 'first_seed')).toBe(true);
      expect(result.some(a => a.id === 'plant_10_seeds')).toBe(true);
      expect(result.some(a => a.id === 'first_harvest')).toBe(true);
    });
  });

  describe('updateProgress', () => {
    it('should update achievement progress successfully', async () => {
      const mockProgress = { current: 5, target: 10 };

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: true,
        error: null
      });

      const result = await AchievementService.updateProgress(
        mockUserId,
        'plant_10_seeds',
        mockProgress
      );

      expect(supabase.rpc).toHaveBeenCalledWith('update_achievement_progress', {
        user_uuid: mockUserId,
        achievement_id: 'plant_10_seeds',
        progress_data: mockProgress
      });

      expect(result).toBe(true);
    });

    it('should return false for invalid parameters', async () => {
      const result = await AchievementService.updateProgress('', '', {});

      expect(result).toBe(false);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('hasAchievement', () => {
    it('should check if user has achievement', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: true,
        error: null
      });

      const result = await AchievementService.hasAchievement(mockUserId, 'first_seed');

      expect(supabase.rpc).toHaveBeenCalledWith('has_achievement', {
        user_uuid: mockUserId,
        achievement_id: 'first_seed'
      });

      expect(result).toBe(true);
    });

    it('should return false for invalid parameters', async () => {
      const result = await AchievementService.hasAchievement('', '');

      expect(result).toBe(false);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('unlockAchievement', () => {
    it('should unlock achievement successfully', async () => {
      const mockProgress: AchievementProgress = {
        achievementId: 'first_seed',
        currentProgress: 1,
        maxProgress: 1,
        isUnlocked: true
      };

      // Mock hasAchievement to return false (not already unlocked)
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: false,
        error: null
      });

      // Mock unlock_achievement
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: true,
        error: null
      });

      const result = await AchievementService.unlockAchievement(
        mockUserId,
        'first_seed',
        mockProgress
      );

      expect(supabase.rpc).toHaveBeenCalledWith('unlock_achievement', {
        user_uuid: mockUserId,
        achievement_id: 'first_seed',
        progress_data: { progress: 1 }
      });

      expect(result).toBe(true);
    });

    it('should not unlock already unlocked achievement', async () => {
      const mockProgress: AchievementProgress = {
        achievementId: 'first_seed',
        currentProgress: 1,
        maxProgress: 1,
        isUnlocked: true
      };

      // Mock hasAchievement to return true (already unlocked)
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: true,
        error: null
      });

      const result = await AchievementService.unlockAchievement(
        mockUserId,
        'first_seed',
        mockProgress
      );

      expect(result).toBe(false);
      expect(supabase.rpc).toHaveBeenCalledTimes(1); // Only hasAchievement call
    });

    it('should return false for invalid parameters', async () => {
      const mockProgress: AchievementProgress = {
        achievementId: 'first_seed',
        currentProgress: 1,
        maxProgress: 1,
        isUnlocked: true
      };

      const result = await AchievementService.unlockAchievement('', '', mockProgress);

      expect(result).toBe(false);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('getAchievementsByCategory', () => {
    it('should return achievements by category', async () => {
      const dailyAchievements = await AchievementService.getAchievementsByCategory('daily');
      const milestoneAchievements = await AchievementService.getAchievementsByCategory('milestones');
      const weatherAchievements = await AchievementService.getAchievementsByCategory('weather');

      expect(dailyAchievements.every(a => a.category === 'daily')).toBe(true);
      expect(milestoneAchievements.every(a => a.category === 'milestones')).toBe(true);
      expect(weatherAchievements.every(a => a.category === 'weather')).toBe(true);
    });

    it('should return empty array for invalid category', async () => {
      const result = await AchievementService.getAchievementsByCategory('invalid');

      expect(result).toEqual([]);
    });
  });

  describe('getAchievementStatistics', () => {
    it('should get achievement statistics', async () => {
      const mockUserAchievements: UserAchievement[] = [
        {
          id: '1',
          user_id: mockUserId,
          achievement_id: 'first_seed',
          unlocked_at: '2024-01-01T00:00:00Z',
          progress_data: {},
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockUserAchievements, error: null })
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await AchievementService.getAchievementStatistics(mockUserId);

      expect(result.total).toBe(11); // Total achievements
      expect(result.unlocked).toBe(1); // One unlocked achievement
      expect(result.remaining).toBe(10); // Remaining achievements
      expect(result.completion_percentage).toBe(9); // 1/11 ≈ 9%
      expect(result.milestones_total).toBeGreaterThan(0);
      expect(result.milestones_unlocked).toBe(1);
    });

    it('should handle empty user achievements', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await AchievementService.getAchievementStatistics(mockUserId);

      expect(result.total).toBe(11);
      expect(result.unlocked).toBe(0);
      expect(result.remaining).toBe(11);
      expect(result.completion_percentage).toBe(0);
    });
  });

  describe('Achievement Definitions', () => {
    it('should have correct achievement structure', async () => {
      const achievements = await AchievementService.getAllAchievements();

      achievements.forEach(achievement => {
        expect(achievement).toHaveProperty('id');
        expect(achievement).toHaveProperty('name');
        expect(achievement).toHaveProperty('description');
        expect(achievement).toHaveProperty('xpReward');
        expect(achievement).toHaveProperty('category');
        expect(achievement).toHaveProperty('requirements');
        expect(achievement.requirements).toHaveProperty('type');
        expect(achievement.requirements).toHaveProperty('action');
        expect(achievement.requirements).toHaveProperty('target');
      });
    });

    it('should have valid categories', async () => {
      const achievements = await AchievementService.getAllAchievements();
      const validCategories = ['daily', 'milestones', 'weather', 'social', 'collection'];

      achievements.forEach(achievement => {
        expect(validCategories).toContain(achievement.category);
      });
    });

    it('should have valid requirement types', async () => {
      const achievements = await AchievementService.getAllAchievements();
      const validTypes = ['count', 'unique', 'streak', 'combination'];

      achievements.forEach(achievement => {
        expect(validTypes).toContain(achievement.requirements.type);
      });
    });

    it('should have positive XP rewards', async () => {
      const achievements = await AchievementService.getAllAchievements();

      achievements.forEach(achievement => {
        expect(achievement.xpReward).toBeGreaterThan(0);
      });
    });
  });


}); 