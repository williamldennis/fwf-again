// @jest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react';
import useGardenData from '../../hooks/useGardenData';
import { supabase } from '../../utils/supabase';
import { GardenService } from '../../services/gardenService';

jest.mock('../../utils/supabase');
jest.mock('../../services/gardenService');

const mockUserId = 'user-123';
const mockFriends = [
  { id: 'friend-1' },
  { id: 'friend-2' },
];
const mockPlantedPlantsBatch = {
  'user-123': [{ id: 'plant-1', name: 'Fern' }],
  'friend-1': [{ id: 'plant-2', name: 'Cactus' }],
  'friend-2': [{ id: 'plant-3', name: 'Sunflower' }],
};
const mockSingleGarden = [{ id: 'plant-2', name: 'Cactus' }];

describe('useGardenData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (GardenService.fetchAllPlantedPlantsBatch as jest.Mock).mockResolvedValue(mockPlantedPlantsBatch);
    (GardenService.fetchPlantedPlants as jest.Mock).mockResolvedValue(mockSingleGarden);
    (GardenService.updatePlantGrowth as jest.Mock).mockResolvedValue(undefined);
    (supabase.channel as jest.Mock).mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    });
    (supabase.removeChannel as jest.Mock).mockImplementation(() => {});
  });

  it('should fetch all gardens on mount', async () => {
    const { result } = renderHook(() => useGardenData(mockUserId, mockFriends));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.plantedPlants).toEqual(mockPlantedPlantsBatch);
    expect(result.current.error).toBeNull();
    expect(GardenService.fetchAllPlantedPlantsBatch).toHaveBeenCalledWith([
      mockUserId,
      ...mockFriends.map(f => f.id),
    ]);
  });

  it('should update a single garden', async () => {
    const { result } = renderHook(() => useGardenData(mockUserId, mockFriends));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.updateSingleGarden('friend-1');
    });
    expect(GardenService.fetchPlantedPlants).toHaveBeenCalledWith('friend-1');
    expect(result.current.plantedPlants['friend-1']).toEqual(mockSingleGarden);
  });

  it('should update all gardens', async () => {
    const { result } = renderHook(() => useGardenData(mockUserId, mockFriends));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.updateAllGardens();
    });
    expect(GardenService.fetchAllPlantedPlantsBatch).toHaveBeenCalledTimes(2); // initial + update
    expect(result.current.plantedPlants).toEqual(mockPlantedPlantsBatch);
  });

  it('should update growth and refresh gardens', async () => {
    const { result } = renderHook(() => useGardenData(mockUserId, mockFriends));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.updateGrowth();
    });
    expect(GardenService.updatePlantGrowth).toHaveBeenCalled();
    expect(GardenService.fetchAllPlantedPlantsBatch).toHaveBeenCalledTimes(2);
    expect(result.current.plantedPlants).toEqual(mockPlantedPlantsBatch);
  });

  it('should handle fetchAllGardens error', async () => {
    (GardenService.fetchAllPlantedPlantsBatch as jest.Mock).mockRejectedValueOnce(new Error('Batch error'));
    const { result } = renderHook(() => useGardenData(mockUserId, mockFriends));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain('Failed to fetch gardens: Batch error');
  });

  it('should handle updateSingleGarden error', async () => {
    (GardenService.fetchPlantedPlants as jest.Mock).mockRejectedValueOnce(new Error('Single error'));
    const { result } = renderHook(() => useGardenData(mockUserId, mockFriends));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.updateSingleGarden('friend-1');
    });
    expect(result.current.error).toContain('Failed to update garden: Single error');
  });

  it('should handle updateGrowth error', async () => {
    (GardenService.updatePlantGrowth as jest.Mock).mockRejectedValueOnce(new Error('Growth error'));
    const { result } = renderHook(() => useGardenData(mockUserId, mockFriends));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.updateGrowth();
    });
    expect(result.current.error).toContain('Failed to update growth: Growth error');
  });

  it('should do nothing if userId is null', async () => {
    const { result, unmount } = renderHook(() => useGardenData(null, mockFriends));
    // loading should be false immediately
    expect(result.current.loading).toBe(false);
    expect(result.current.plantedPlants).toEqual({});
    // unmount should NOT call removeChannel
    const removeChannelMock = supabase.removeChannel as jest.Mock;
    unmount();
    expect(removeChannelMock).not.toHaveBeenCalled();
  });
}); 