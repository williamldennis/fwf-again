import { XPService, UserXPSummary, XPAwardResult, XPTransaction } from '../../services/xpService';

// Import the mocked modules
import { supabase } from '../../utils/supabase';

// Mock the supabase module
jest.mock('../../utils/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn()
  }
}));

describe('XPService', () => {
  const mockUserId = 'test-user-id';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('awardXP', () => {
    it('should award XP successfully', async () => {
      const mockAwardResult = true;
      const mockXPSummary: UserXPSummary = {
        total_xp: 110,
        current_level: 2,
        xp_to_next_level: 150,
        xp_progress: 67
      };

      // Mock the award_xp RPC call
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockAwardResult,
        error: null
      });

      // Mock getUserXP call
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [mockXPSummary],
        error: null
      });

      const result = await XPService.awardXP(
        mockUserId,
        10,
        'plant_seed',
        'Planted a sunflower',
        { plantId: 'sunflower-1' }
      );

      expect(supabase.rpc).toHaveBeenCalledWith('award_xp', {
        user_uuid: mockUserId,
        xp_amount: 10,
        action_type: 'plant_seed',
        description: 'Planted a sunflower',
        context_data: { plantId: 'sunflower-1' }
      });

      expect(result).toEqual({
        success: true,
        newTotalXP: 110,
        newLevel: 2,
        leveledUp: false
      });
    });

    it('should handle invalid parameters', async () => {
      const result = await XPService.awardXP('', 0, '', '');

      expect(result).toEqual({
        success: false,
        error: 'Invalid parameters for XP award'
      });

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const mockError = { message: 'Database error' };
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: mockError
      });

      const result = await XPService.awardXP(
        mockUserId,
        10,
        'plant_seed',
        'Test planting'
      );

      expect(result).toEqual({
        success: false,
        error: 'Database error'
      });
    });

    it('should handle exceptions', async () => {
      (supabase.rpc as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await XPService.awardXP(
        mockUserId,
        10,
        'plant_seed',
        'Test planting'
      );

      expect(result).toEqual({
        success: false,
        error: 'Network error'
      });
    });
  });

  describe('getUserXP', () => {
    it('should get user XP summary successfully', async () => {
      const mockXPSummary: UserXPSummary = {
        total_xp: 250,
        current_level: 2,
        xp_to_next_level: 150,
        xp_progress: 100
      };

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [mockXPSummary],
        error: null
      });

      const result = await XPService.getUserXP(mockUserId);

      expect(supabase.rpc).toHaveBeenCalledWith('get_user_xp_summary', {
        user_uuid: mockUserId
      });

      expect(result).toEqual(mockXPSummary);
    });

    it('should return null for invalid userId', async () => {
      const result = await XPService.getUserXP('');

      expect(result).toBeNull();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should handle empty data', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await XPService.getUserXP(mockUserId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await XPService.getUserXP(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('calculateLevel', () => {
    it('should calculate level from XP', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: 5,
        error: null
      });

      const result = await XPService.calculateLevel(1000);

      expect(supabase.rpc).toHaveBeenCalledWith('calculate_level_from_xp', {
        total_xp: 1000
      });

      expect(result).toBe(5);
    });

    it('should return level 1 for negative XP', async () => {
      const result = await XPService.calculateLevel(-10);

      expect(result).toBe(1);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await XPService.calculateLevel(100);

      expect(result).toBe(1);
    });
  });

  describe('getXPToNextLevel', () => {
    it('should get XP required for next level', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: 150,
        error: null
      });

      const result = await XPService.getXPToNextLevel(2);

      expect(supabase.rpc).toHaveBeenCalledWith('calculate_xp_to_next_level', {
        current_level: 2
      });

      expect(result).toBe(150);
    });

    it('should return 0 for invalid levels', async () => {
      const result = await XPService.getXPToNextLevel(0);

      expect(result).toBe(0);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should return 0 for level 50+', async () => {
      const result = await XPService.getXPToNextLevel(51);

      expect(result).toBe(0);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('getXPHistory', () => {
    it('should get XP transaction history', async () => {
      const mockTransactions: XPTransaction[] = [
        {
          id: '1',
          user_id: mockUserId,
          amount: 10,
          action_type: 'plant_seed',
          description: 'Planted sunflower',
          context_data: { plantId: 'sunflower-1' },
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockTransactions, error: null })
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await XPService.getXPHistory(mockUserId, 10, 0);

      expect(supabase.from).toHaveBeenCalledWith('xp_transactions');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockQuery.range).toHaveBeenCalledWith(0, 9);
      expect(result).toEqual(mockTransactions);
    });

    it('should return empty array for invalid userId', async () => {
      const result = await XPService.getXPHistory('');

      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('getTotalXPForAction', () => {
    it('should return 0 for invalid parameters', async () => {
      const result = await XPService.getTotalXPForAction('', 'plant_seed');

      expect(result).toBe(0);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('getXPStatistics', () => {
    it('should return empty object for invalid userId', async () => {
      const result = await XPService.getXPStatistics('');

      expect(result).toEqual({});
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('canReceiveDailyXP', () => {
    it('should return true when user can receive daily XP', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await XPService.canReceiveDailyXP(mockUserId);

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('xp_transactions');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockQuery.eq).toHaveBeenCalledWith('action_type', 'daily_use');
    });

    it('should return false when user already received daily XP', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [{ id: '1' }], error: null })
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await XPService.canReceiveDailyXP(mockUserId);

      expect(result).toBe(false);
    });

    it('should return false for invalid userId', async () => {
      const result = await XPService.canReceiveDailyXP('');

      expect(result).toBe(false);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('awardDailyXP', () => {
    it('should award daily XP when eligible', async () => {
      // Mock canReceiveDailyXP to return true (no daily XP transaction today)
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      // Mock the award_xp RPC call
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: true,
        error: null
      });

      // Mock getUserXP call
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [{ total_xp: 105, current_level: 2, xp_to_next_level: 150, xp_progress: 33 }],
        error: null
      });

      const result = await XPService.awardDailyXP(mockUserId);

      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(105);
    });

    it('should not award daily XP when already received', async () => {
      // Mock canReceiveDailyXP to return false
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [{ id: '1' }], error: null })
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await XPService.awardDailyXP(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Daily XP already awarded today');
    });

    it('should handle invalid userId', async () => {
      const result = await XPService.awardDailyXP('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No userId provided');
    });
  });

  describe('getLevelBenefits', () => {
    it('should return benefits for level 5', async () => {
      const result = await XPService.getLevelBenefits(5);

      expect(result.level).toBe(5);
      expect(result.unlocked_features).toContain('4 planting slots');
    });

    it('should return benefits for level 10', async () => {
      const result = await XPService.getLevelBenefits(10);

      expect(result.level).toBe(10);
      expect(result.unlocked_features).toContain('4 planting slots');
      expect(result.unlocked_features).toContain('5 planting slots');
    });

    it('should return benefits for level 50', async () => {
      const result = await XPService.getLevelBenefits(50);

      expect(result.level).toBe(50);
      expect(result.unlocked_features).toContain('Master Gardener status');
    });
  });
}); 