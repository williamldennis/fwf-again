import { renderHook, waitFor } from '@testing-library/react-native';
import { useXP } from '../../hooks/useXP';
import { XPService } from '../../services/xpService';

// Mock the XPService
jest.mock('../../services/xpService');
const mockXPService = XPService as jest.Mocked<typeof XPService>;

describe('useXP', () => {
  const mockUserId = 'test-user-id';
  const mockXPData = {
    total_xp: 150,
    current_level: 2,
    xp_to_next_level: 200,
    xp_progress: 75
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch XP data when userId is provided', async () => {
    mockXPService.getUserXP.mockResolvedValue(mockXPData);

    const { result } = renderHook(() => useXP(mockUserId));

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.xpData).toBe(null);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.xpData).toEqual(mockXPData);
    expect(result.current.error).toBe(null);
    expect(mockXPService.getUserXP).toHaveBeenCalledWith(mockUserId);
  });

  it('should handle null userId', async () => {
    const { result } = renderHook(() => useXP(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.xpData).toBe(null);
    expect(result.current.error).toBe(null);
    expect(mockXPService.getUserXP).not.toHaveBeenCalled();
  });

  it('should handle empty userId', async () => {
    const { result } = renderHook(() => useXP(''));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.xpData).toBe(null);
    expect(result.current.error).toBe(null);
    expect(mockXPService.getUserXP).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const errorMessage = 'Failed to fetch XP data';
    mockXPService.getUserXP.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useXP(mockUserId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.xpData).toBe(null);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should provide refresh function', async () => {
    mockXPService.getUserXP.mockResolvedValue(mockXPData);

    const { result } = renderHook(() => useXP(mockUserId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mock to verify refresh calls it again
    mockXPService.getUserXP.mockClear();

    // Call refresh
    await result.current.refreshXP();

    expect(mockXPService.getUserXP).toHaveBeenCalledWith(mockUserId);
  });

  it('should handle service returning null', async () => {
    mockXPService.getUserXP.mockResolvedValue(null);

    const { result } = renderHook(() => useXP(mockUserId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.xpData).toBe(null);
    expect(result.current.error).toBe(null);
  });
}); 