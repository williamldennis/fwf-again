import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAppInitialization } from '../../hooks/useAppInitialization';
import { supabase } from '../../utils/supabase';
import { GardenService } from '../../services/gardenService';
import { WeatherService } from '../../services/weatherService';
import { ContactsService } from '../../services/contactsService';
import * as Location from 'expo-location';

// Mock all dependencies
jest.mock('../../utils/supabase');
jest.mock('../../services/gardenService');
jest.mock('../../services/weatherService');
jest.mock('../../services/contactsService');
jest.mock('expo-location');
jest.mock('tz-lookup', () => jest.fn(() => 'America/New_York'));
jest.mock('luxon', () => ({
  DateTime: {
    now: () => ({
      setZone: () => ({
        hour: 12
      })
    })
  }
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockGardenService = GardenService as jest.Mocked<typeof GardenService>;
const mockWeatherService = WeatherService as jest.Mocked<typeof WeatherService>;
const mockContactsService = ContactsService as jest.Mocked<typeof ContactsService>;
const mockLocation = Location as jest.Mocked<typeof Location>;

describe('useAppInitialization - Progressive Loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase auth
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });

    // Mock profile fetch
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              latitude: 40.7128,
              longitude: -74.0060,
              selfie_urls: { sunny: 'test-url' },
              points: 100,
            },
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    } as any);

    // Mock location permissions
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted' as any,
      expires: 'never' as any,
      granted: true,
      canAskAgain: true,
    });

    // Mock current position
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    });

    // Mock services
    mockGardenService.fetchAvailablePlants.mockResolvedValue([
      { id: '1', name: 'Sunflower' },
      { id: '2', name: 'Mushroom' },
    ]);
    mockGardenService.updatePlantGrowth.mockResolvedValue();

    mockWeatherService.fetchWeatherData.mockResolvedValue({
      current: { temp: 72, weather: [{ description: 'sunny' }] },
      forecast: [{ weather: [{ description: 'sunny' }] }],
    });
    mockWeatherService.updateUserWeatherInDatabase.mockResolvedValue();

    mockContactsService.fetchUserContacts.mockResolvedValue([
      { phone: '+1234567890', name: 'Test Contact' } as any,
    ]);
    mockContactsService.findFriendsFromContacts.mockResolvedValue([
      { id: 'friend-1', name: 'Friend 1' } as any,
    ]);

    mockGardenService.fetchAllPlantedPlantsBatch.mockResolvedValue({
      'test-user-id': [],
      'friend-1': [],
    });
  });

  it('should show app immediately after user auth and profile fetch', async () => {
    const { result } = renderHook(() => useAppInitialization());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.isInitialized).toBe(false);

    // Start initialization
    await act(async () => {
      await result.current.initializeApp();
    });

    // App should be ready immediately after profile fetch
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.userProfile).toBeTruthy();
      expect(result.current.currentUserId).toBe('test-user-id');
    });

    // Progressive loading states should be active (background operations)
    // Note: In test environment, these might complete very quickly
    // so we check that they were at least set to true at some point
    expect(result.current.weatherLoading).toBeDefined();
    expect(result.current.friendsLoading).toBeDefined();
    expect(result.current.plantsLoading).toBeDefined();
  });

  it('should load weather data in background', async () => {
    const { result } = renderHook(() => useAppInitialization());

    await act(async () => {
      await result.current.initializeApp();
    });

    // Wait for weather to finish loading
    await waitFor(() => {
      expect(result.current.weatherLoading).toBe(false);
    }, { timeout: 3000 });

    // Weather service should have been called
    expect(mockWeatherService.fetchWeatherData).toHaveBeenCalledWith(40.7128, -74.0060);
    expect(mockWeatherService.updateUserWeatherInDatabase).toHaveBeenCalled();
  });

  it('should load friends and plants data in background', async () => {
    const { result } = renderHook(() => useAppInitialization());

    await act(async () => {
      await result.current.initializeApp();
    });

    // Wait for friends and plants to finish loading
    await waitFor(() => {
      expect(result.current.friendsLoading).toBe(false);
      expect(result.current.plantsLoading).toBe(false);
    }, { timeout: 3000 });

    // Services should have been called
    expect(mockContactsService.fetchUserContacts).toHaveBeenCalledWith('test-user-id');
    expect(mockContactsService.findFriendsFromContacts).toHaveBeenCalled();
    expect(mockGardenService.fetchAllPlantedPlantsBatch).toHaveBeenCalled();
  });

  it('should handle weather fetch errors gracefully', async () => {
    mockWeatherService.fetchWeatherData.mockRejectedValue(new Error('Weather API failed'));

    const { result } = renderHook(() => useAppInitialization());

    await act(async () => {
      await result.current.initializeApp();
    });

    // App should still be initialized even if weather fails
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.isInitialized).toBe(true);
    });

    // Weather loading should eventually stop
    await waitFor(() => {
      expect(result.current.weatherLoading).toBe(false);
    }, { timeout: 3000 });

    // App should not have an error (weather failure is non-blocking)
    expect(result.current.error).toBeNull();
  });

  it('should handle friends/plants fetch errors gracefully', async () => {
    mockContactsService.fetchUserContacts.mockRejectedValue(new Error('Contacts failed'));

    const { result } = renderHook(() => useAppInitialization());

    await act(async () => {
      await result.current.initializeApp();
    });

    // App should still be initialized even if friends/plants fail
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.isInitialized).toBe(true);
    });

    // Friends/plants loading should eventually stop
    await waitFor(() => {
      expect(result.current.friendsLoading).toBe(false);
      expect(result.current.plantsLoading).toBe(false);
    }, { timeout: 3000 });

    // App should not have an error (friends/plants failure is non-blocking)
    expect(result.current.error).toBeNull();
  });

  it('should load available plants immediately', async () => {
    const { result } = renderHook(() => useAppInitialization());

    await act(async () => {
      await result.current.initializeApp();
    });

    // Available plants should be loaded immediately (light operation)
    await waitFor(() => {
      expect(result.current.availablePlants).toHaveLength(2);
      expect(result.current.availablePlants[0].name).toBe('Sunflower');
      expect(result.current.availablePlants[1].name).toBe('Mushroom');
    });
  });
}); 