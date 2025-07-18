import { renderHook, waitFor } from '@testing-library/react-native';
import { useXPHistory } from '../../hooks/useXPHistory';
import { XPService } from '../../services/xpService';

// Mock the XPService
jest.mock('../../services/xpService');
const mockXPService = XPService as jest.Mocked<typeof XPService>;

describe('useXPHistory', () => {
  const mockUserId = 'test-user-id';
  const mockTransactions = [
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch XP history successfully', async () => {
    mockXPService.getXPHistory.mockResolvedValue(mockTransactions);

    const { result } = renderHook(() => useXPHistory(mockUserId, 10));

    expect(result.current.loading).toBe(true);
    expect(result.current.transactions).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.transactions).toEqual(mockTransactions);
    expect(result.current.error).toBeNull();
    expect(mockXPService.getXPHistory).toHaveBeenCalledWith(mockUserId, 10);
  });

  it('should handle null userId', async () => {
    const { result } = renderHook(() => useXPHistory(null, 10));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.transactions).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mockXPService.getXPHistory).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const errorMessage = 'Failed to fetch XP history';
    mockXPService.getXPHistory.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useXPHistory(mockUserId, 10));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.transactions).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should refresh data when refresh is called', async () => {
    mockXPService.getXPHistory.mockResolvedValue(mockTransactions);

    const { result } = renderHook(() => useXPHistory(mockUserId, 10));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mock to verify refresh call
    mockXPService.getXPHistory.mockClear();

    await result.current.refresh();

    expect(mockXPService.getXPHistory).toHaveBeenCalledWith(mockUserId, 10);
  });
}); 