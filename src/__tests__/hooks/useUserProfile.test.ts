// @jest-environment jsdom
import { renderHook, waitFor, act } from '@testing-library/react';
import useUserProfile from '../../hooks/useUserProfile';
import { supabase } from '../../utils/supabase';
import * as Location from 'expo-location';

jest.mock('../../utils/supabase');
jest.mock('expo-location');

describe('useUserProfile', () => {
  const mockUserId = 'test-user-id';
  const mockProfile = {
    latitude: 37.7749,
    longitude: -122.4194,
    selfie_urls: { sunny: 'test-url' },
    points: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    } as any);

    // Mock Location permissions
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    // Mock current position
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    });
  });

  it('should fetch profile successfully with location permission granted', async () => {
    const { result } = renderHook(() => useUserProfile(mockUserId));

    expect(result.current.loading).toBe(true);
    expect(result.current.profile).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toEqual({
      selfieUrls: { sunny: 'test-url' },
      points: 100,
      latitude: 37.7749,
      longitude: -122.4194,
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle location permission denied', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    const { result } = renderHook(() => useUserProfile(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toEqual({
      selfieUrls: { sunny: 'test-url' },
      points: 100,
      latitude: 37.7749,
      longitude: -122.4194,
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle location error gracefully', async () => {
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
      new Error('Location error')
    );

    const { result } = renderHook(() => useUserProfile(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toEqual({
      selfieUrls: { sunny: 'test-url' },
      points: 100,
      latitude: 37.7749,
      longitude: -122.4194,
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle profile fetch error', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Profile not found' },
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useUserProfile(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toContain('Profile error: Profile not found');
  });

  it('should handle missing location coordinates', async () => {
    const profileWithoutLocation = {
      ...mockProfile,
      latitude: null,
      longitude: null,
    };

    // Mock location permission denied to prevent getting current location
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: profileWithoutLocation,
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useUserProfile(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toContain('Location not found');
  });

  it('should update points successfully', async () => {
    const { result } = renderHook(() => useUserProfile(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock updated points response
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { points: 150 },
            error: null,
          }),
        }),
      }),
    } as any);

    let updatedPoints: number = 0;
    await act(async () => {
      updatedPoints = await result.current.updatePoints();
    });

    expect(updatedPoints).toBe(150);
    expect(result.current.profile?.points).toBe(150);
  });

  it('should handle points update error', async () => {
    const { result } = renderHook(() => useUserProfile(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock points update error
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      }),
    } as any);

    await expect(result.current.updatePoints()).rejects.toThrow(
      'Failed to update points: Database error'
    );
  });

  it('should update profile successfully', async () => {
    const { result } = renderHook(() => useUserProfile(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const updates = {
      points: 200,
      latitude: 40.7128,
      longitude: -74.0060,
    };

    await act(async () => {
      await result.current.updateProfile(updates);
    });

    expect(result.current.profile).toEqual({
      selfieUrls: { sunny: 'test-url' },
      points: 200,
      latitude: 40.7128,
      longitude: -74.0060,
    });
  });

  it('should handle profile update error', async () => {
    const { result } = renderHook(() => useUserProfile(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock profile update error
    (supabase.from as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      }),
    } as any);

    await expect(
      result.current.updateProfile({ points: 200 })
    ).rejects.toThrow('Failed to update profile: Update failed');
  });

  it('should refresh profile successfully', async () => {
    const { result } = renderHook(() => useUserProfile(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock updated profile response
    const updatedProfile = {
      ...mockProfile,
      points: 300,
    };

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: updatedProfile,
            error: null,
          }),
        }),
      }),
    } as any);

    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(result.current.profile?.points).toBe(300);
  });

  it('should handle refresh error', async () => {
    const { result } = renderHook(() => useUserProfile(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock refresh error
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Refresh failed' },
          }),
        }),
      }),
    } as any);

    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(result.current.error).toContain('Profile refresh failed');
  });

  it('should handle null userId', () => {
    const { result } = renderHook(() => useUserProfile(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should throw error when updating points without userId', async () => {
    const { result } = renderHook(() => useUserProfile(null));

    await expect(result.current.updatePoints()).rejects.toThrow(
      'No user ID provided'
    );
  });

  it('should throw error when updating profile without userId', async () => {
    const { result } = renderHook(() => useUserProfile(null));

    await expect(
      result.current.updateProfile({ points: 100 })
    ).rejects.toThrow('No user ID provided');
  });

  it('should not refresh when userId is null', async () => {
    const { result } = renderHook(() => useUserProfile(null));

    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });
}); 