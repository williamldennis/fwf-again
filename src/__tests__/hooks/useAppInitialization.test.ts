import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAppInitialization } from '../../hooks/useAppInitialization';
import { supabase } from '../../utils/supabase';
import { GardenService } from '../../services/gardenService';
import { WeatherService } from '../../services/weatherService';
import { ContactsService } from '../../services/contactsService';
import * as Location from 'expo-location';

// Mock the services
jest.mock('../../services/gardenService');
jest.mock('../../services/weatherService');
jest.mock('../../services/contactsService');

// Mock expo-location
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 'balanced',
  },
}));

describe('useAppInitialization', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  const mockProfile = {
    id: 'test-user-id',
    latitude: 37.7749,
    longitude: -122.4194,
    selfie_urls: ['https://example.com/selfie.jpg'],
    points: 100,
  };

  const mockLocation = {
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
    },
  };

  const mockWeatherData = {
    current: {
      temp: 65,
      weather: [{ main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
    },
    forecast: [
      {
        dt_txt: '2025-07-16 15:00:00',
        main: { temp: 65 },
        weather: [{ main: 'Clouds', icon: '03d' }],
      },
    ],
  };

  const mockPlants = [
    {
      id: 'plant-1',
      name: 'Fern',
      growth_time_hours: 6,
      harvest_points: 15,
      image_path: 'fern',
      weather_bonus: {
        sunny: 0.7,
        cloudy: 1.8,
        rainy: 1.3,
      },
    },
  ];

  const mockContacts = [
    {
      contact_phone: '+1234567890',
      contact_name: 'John Doe',
    },
  ];

  const mockFriends = [
    {
      id: 'friend-1',
      phone_number: '+1234567890',
      weather_temp: 70,
      weather_condition: 'Clear',
      weather_icon: '01d',
      latitude: 37.7749,
      longitude: -122.4194,
      contact_name: 'John Doe',
      city_name: 'San Francisco',
    },
  ];

  const mockPlantedPlants = {
    'test-user-id': [
      {
        id: 'planted-1',
        garden_owner_id: 'test-user-id',
        plant_id: 'plant-1',
        current_stage: 2,
        is_mature: false,
        planted_at: '2025-07-16T10:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Supabase mocks
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
    });

    // Setup Location mocks
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);

    // Setup service mocks
    (GardenService.fetchAvailablePlants as jest.Mock).mockResolvedValue(mockPlants);
    (GardenService.updatePlantGrowth as jest.Mock).mockResolvedValue(undefined);
    (GardenService.fetchAllPlantedPlantsBatch as jest.Mock).mockResolvedValue(mockPlantedPlants);

    (WeatherService.fetchWeatherData as jest.Mock).mockResolvedValue(mockWeatherData);
    (WeatherService.updateUserWeatherInDatabase as jest.Mock).mockResolvedValue(undefined);

    (ContactsService.fetchUserContacts as jest.Mock).mockResolvedValue(mockContacts);
    (ContactsService.findFriendsFromContacts as jest.Mock).mockResolvedValue(mockFriends);

          // Setup Supabase channel mock
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };
      (supabase.channel as jest.Mock).mockReturnValue(mockChannel);
      (supabase.removeChannel as jest.Mock).mockImplementation(() => {});
  });

  describe('initialization', () => {
    it('should initialize successfully with valid user', async () => {
      const { result } = renderHook(() => useAppInitialization());

      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.isInitialized).toBe(false);

      await act(async () => {
        await result.current.initializeApp();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentUserId).toBe('test-user-id');
      expect(result.current.availablePlants).toEqual(mockPlants);
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should handle user not found', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const { result } = renderHook(() => useAppInitialization());

      await act(async () => {
        await result.current.initializeApp();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('User not found.');
      expect(result.current.currentUserId).toBe(null);
      expect(result.current.isInitialized).toBe(false);
    });

    it('should handle profile fetch error', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Profile not found' },
        }),
      });

      const { result } = renderHook(() => useAppInitialization());

      await act(async () => {
        await result.current.initializeApp();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('Profile error: Profile not found');
    });

    it('should handle location permission denied', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const { result } = renderHook(() => useAppInitialization());

      await act(async () => {
        await result.current.initializeApp();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still succeed using stored coordinates
      expect(result.current.currentUserId).toBe('test-user-id');
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should handle weather service error', async () => {
      (WeatherService.fetchWeatherData as jest.Mock).mockRejectedValue(
        new Error('Weather API failed')
      );

      const { result } = renderHook(() => useAppInitialization());

      await act(async () => {
        await result.current.initializeApp();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('Weather API failed');
      expect(result.current.isInitialized).toBe(false);
    });
  });

  describe('refreshData', () => {
    it('should refresh data successfully', async () => {
      const { result } = renderHook(() => useAppInitialization());

      // First initialize
      await act(async () => {
        await result.current.initializeApp();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Then refresh
      await act(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(null);
      expect(result.current.isInitialized).toBe(true);
    });

    it('should not refresh if no user ID', async () => {
      const { result } = renderHook(() => useAppInitialization());

      // Don't initialize, so currentUserId is null
      await act(async () => {
        await result.current.refreshData();
      });

      // Should not call any services
      expect(WeatherService.fetchWeatherData).not.toHaveBeenCalled();
      expect(ContactsService.fetchUserContacts).not.toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => useAppInitialization());

      // Set an error
      await act(async () => {
        await result.current.initializeApp();
      });

      // Force an error by mocking a failure
      (WeatherService.fetchWeatherData as jest.Mock).mockRejectedValue(
        new Error('Test error')
      );

      await act(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(result.current.error).toContain('Test error');
      });

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('background sync', () => {
    it('should set up periodic growth updates', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useAppInitialization());

      await act(async () => {
        await result.current.initializeApp();
      });

      // Fast-forward time to trigger the interval
      await act(async () => {
        jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
      });

      expect(GardenService.updatePlantGrowth).toHaveBeenCalledTimes(2); // Once during init, once from interval

      jest.useRealTimers();
    });

    it('should set up real-time subscription', async () => {
      const { result } = renderHook(() => useAppInitialization());

      await act(async () => {
        await result.current.initializeApp();
      });

      expect(supabase.channel).toHaveBeenCalledWith('public:planted_plants');
      expect(supabase.channel().on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'planted_plants' },
        expect.any(Function)
      );
      expect(supabase.channel().subscribe).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on unmount', async () => {
      jest.useFakeTimers();

      const { result, unmount } = renderHook(() => useAppInitialization());

      await act(async () => {
        await result.current.initializeApp();
      });

      // Unmount the hook
      unmount();

      // Should cleanup the interval and subscription
      expect(supabase.removeChannel).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
}); 