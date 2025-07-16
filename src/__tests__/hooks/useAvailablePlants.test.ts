// @jest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react';
import useAvailablePlants from '../../hooks/useAvailablePlants';
import { GardenService } from '../../services/gardenService';

jest.mock('../../services/gardenService');

describe('useAvailablePlants', () => {
  const mockPlants = [
    { id: '1', name: 'Sunflower', growth_time_hours: 24 },
    { id: '2', name: 'Cactus', growth_time_hours: 48 },
    { id: '3', name: 'Fern', growth_time_hours: 36 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (GardenService.fetchAvailablePlants as jest.Mock).mockResolvedValue(mockPlants);
  });

  it('should start with empty state', () => {
    const { result } = renderHook(() => useAvailablePlants());

    expect(result.current.availablePlants).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasLoaded).toBe(false);
  });

  it('should fetch plants on first call to fetchPlants', async () => {
    const { result } = renderHook(() => useAvailablePlants());

    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.fetchPlants();
    });

    expect(result.current.availablePlants).toEqual(mockPlants);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasLoaded).toBe(true);
    expect(GardenService.fetchAvailablePlants).toHaveBeenCalledTimes(1);
  });

  it('should not fetch again if already loaded', async () => {
    const { result } = renderHook(() => useAvailablePlants());

    // First fetch
    await act(async () => {
      await result.current.fetchPlants();
    });

    expect(GardenService.fetchAvailablePlants).toHaveBeenCalledTimes(1);

    // Second fetch - should use cache
    await act(async () => {
      await result.current.fetchPlants();
    });

    expect(GardenService.fetchAvailablePlants).toHaveBeenCalledTimes(1); // Still only 1 call
    expect(result.current.availablePlants).toEqual(mockPlants);
    expect(result.current.hasLoaded).toBe(true);
  });

  it('should force refresh when refreshPlants is called', async () => {
    const { result } = renderHook(() => useAvailablePlants());

    // First fetch
    await act(async () => {
      await result.current.fetchPlants();
    });

    expect(GardenService.fetchAvailablePlants).toHaveBeenCalledTimes(1);

    // Refresh - should fetch again
    await act(async () => {
      await result.current.refreshPlants();
    });

    expect(GardenService.fetchAvailablePlants).toHaveBeenCalledTimes(2);
    expect(result.current.availablePlants).toEqual(mockPlants);
    expect(result.current.hasLoaded).toBe(true);
  });

  it('should handle fetch error', async () => {
    (GardenService.fetchAvailablePlants as jest.Mock).mockRejectedValueOnce(
      new Error('Database error')
    );

    const { result } = renderHook(() => useAvailablePlants());

    await act(async () => {
      await result.current.fetchPlants();
    });

    expect(result.current.availablePlants).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toContain('Failed to fetch plants: Database error');
    expect(result.current.hasLoaded).toBe(false);
  });

  it('should handle refresh error', async () => {
    const { result } = renderHook(() => useAvailablePlants());

    // First fetch succeeds
    await act(async () => {
      await result.current.fetchPlants();
    });

    expect(result.current.availablePlants).toEqual(mockPlants);

    // Mock error for refresh
    (GardenService.fetchAvailablePlants as jest.Mock).mockRejectedValueOnce(
      new Error('Refresh error')
    );

    await act(async () => {
      await result.current.refreshPlants();
    });

    expect(result.current.availablePlants).toEqual(mockPlants); // Should keep previous data
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toContain('Failed to refresh plants: Refresh error');
    expect(result.current.hasLoaded).toBe(true);
  });

  it('should handle empty plants array', async () => {
    (GardenService.fetchAvailablePlants as jest.Mock).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useAvailablePlants());

    await act(async () => {
      await result.current.fetchPlants();
    });

    expect(result.current.availablePlants).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasLoaded).toBe(true);
  });

  it('should set loading state correctly during fetch', async () => {
    // Mock a delayed response
    (GardenService.fetchAvailablePlants as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockPlants), 100))
    );

    const { result } = renderHook(() => useAvailablePlants());

    // Start fetch
    let fetchPromise: Promise<void>;
    act(() => {
      fetchPromise = result.current.fetchPlants();
    });

    // Should be loading
    expect(result.current.loading).toBe(true);

    // Wait for fetch to complete
    await act(async () => {
      await fetchPromise!;
    });

    // Should not be loading anymore
    expect(result.current.loading).toBe(false);
    expect(result.current.availablePlants).toEqual(mockPlants);
  });

  it('should set loading state correctly during refresh', async () => {
    // Mock a delayed response
    (GardenService.fetchAvailablePlants as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockPlants), 100))
    );

    const { result } = renderHook(() => useAvailablePlants());

    // Start refresh
    let refreshPromise: Promise<void>;
    act(() => {
      refreshPromise = result.current.refreshPlants();
    });

    // Should be loading
    expect(result.current.loading).toBe(true);

    // Wait for refresh to complete
    await act(async () => {
      await refreshPromise!;
    });

    // Should not be loading anymore
    expect(result.current.loading).toBe(false);
    expect(result.current.availablePlants).toEqual(mockPlants);
  });

  it('should clear error when new fetch succeeds', async () => {
    // First fetch fails
    (GardenService.fetchAvailablePlants as jest.Mock)
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce(mockPlants);

    const { result } = renderHook(() => useAvailablePlants());

    // First fetch - should fail
    await act(async () => {
      await result.current.fetchPlants();
    });

    expect(result.current.error).toContain('First error');

    // Second fetch - should succeed and clear error
    await act(async () => {
      await result.current.refreshPlants();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.availablePlants).toEqual(mockPlants);
  });

  it('should handle unknown errors', async () => {
    (GardenService.fetchAvailablePlants as jest.Mock).mockRejectedValueOnce('Unknown error');

    const { result } = renderHook(() => useAvailablePlants());

    await act(async () => {
      await result.current.fetchPlants();
    });

    expect(result.current.error).toContain('Failed to fetch plants: Unknown error');
  });
}); 