import { renderHook, waitFor } from '@testing-library/react-native';
import { useLevelBenefits } from '../../hooks/useLevelBenefits';
import { XPService } from '../../services/xpService';

// Mock the XPService
jest.mock('../../services/xpService');
const mockXPService = XPService as jest.Mocked<typeof XPService>;

describe('useLevelBenefits', () => {
  const mockCurrentBenefits = {
    level: 5,
    description: 'Level 5 benefits',
    unlocked_features: ['4 planting slots']
  };

  const mockNextLevelBenefits = {
    level: 6,
    description: 'Level 6 benefits',
    unlocked_features: ['4 planting slots', '5 planting slots']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch level benefits successfully', async () => {
    mockXPService.getLevelBenefits
      .mockResolvedValueOnce(mockCurrentBenefits)
      .mockResolvedValueOnce(mockNextLevelBenefits);

    const { result } = renderHook(() => useLevelBenefits(5));

    expect(result.current.loading).toBe(true);
    expect(result.current.currentBenefits).toBeNull();
    expect(result.current.nextLevelBenefits).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentBenefits).toEqual(mockCurrentBenefits);
    expect(result.current.nextLevelBenefits).toEqual(mockNextLevelBenefits);
    expect(result.current.error).toBeNull();
    expect(mockXPService.getLevelBenefits).toHaveBeenCalledWith(5);
    expect(mockXPService.getLevelBenefits).toHaveBeenCalledWith(6);
  });

  it('should handle null currentLevel', async () => {
    const { result } = renderHook(() => useLevelBenefits(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentBenefits).toBeNull();
    expect(result.current.nextLevelBenefits).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockXPService.getLevelBenefits).not.toHaveBeenCalled();
  });

  it('should handle max level (50)', async () => {
    mockXPService.getLevelBenefits.mockResolvedValue(mockCurrentBenefits);

    const { result } = renderHook(() => useLevelBenefits(50));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentBenefits).toEqual(mockCurrentBenefits);
    expect(result.current.nextLevelBenefits).toBeNull();
    expect(mockXPService.getLevelBenefits).toHaveBeenCalledWith(50);
    expect(mockXPService.getLevelBenefits).not.toHaveBeenCalledWith(51);
  });

  it('should handle errors', async () => {
    const errorMessage = 'Failed to fetch level benefits';
    mockXPService.getLevelBenefits.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useLevelBenefits(5));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentBenefits).toBeNull();
    expect(result.current.nextLevelBenefits).toBeNull();
    expect(result.current.error).toBe(errorMessage);
  });

  it('should refresh data when refresh is called', async () => {
    mockXPService.getLevelBenefits
      .mockResolvedValueOnce(mockCurrentBenefits)
      .mockResolvedValueOnce(mockNextLevelBenefits);

    const { result } = renderHook(() => useLevelBenefits(5));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mock to verify refresh call
    mockXPService.getLevelBenefits.mockClear();
    mockXPService.getLevelBenefits
      .mockResolvedValueOnce(mockCurrentBenefits)
      .mockResolvedValueOnce(mockNextLevelBenefits);

    await result.current.refresh();

    expect(mockXPService.getLevelBenefits).toHaveBeenCalledWith(5);
    expect(mockXPService.getLevelBenefits).toHaveBeenCalledWith(6);
  });
}); 