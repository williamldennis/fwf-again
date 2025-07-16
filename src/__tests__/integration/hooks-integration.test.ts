import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAppInitialization } from '../../hooks/useAppInitialization';
import { useWeatherData } from '../../hooks/useWeatherData';
import { supabase } from '../../utils/supabase';
import { GardenService } from '../../services/gardenService';
import { WeatherService } from '../../services/weatherService';
import { ContactsService } from '../../services/contactsService';

// Mock the services
jest.mock('../../services/gardenService');
jest.mock('../../services/weatherService');
jest.mock('../../services/contactsService');

// Mock expo-location
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
    },
  }),
}));

describe('Hooks Integration', () => {
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

  const mockPlantedPlantsBatch = {
    'test-user-id': [
      { id: 'plant-1', slot: 0, plant_id: 'plant-1', planted_at: '2025-07-16T00:00:00Z' },
    ],
    'friend-1': [
      { id: 'plant-2', slot: 1, plant_id: 'plant-1', planted_at: '2025-07-16T00:00:00Z' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Supabase mocks
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
    });

    // Mock supabase.from().update().eq()
    (supabase.from as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
    });

    // Setup service mocks
    (GardenService.fetchAvailablePlants as jest.Mock).mockResolvedValue(mockPlants);
    (GardenService.updatePlantGrowth as jest.Mock).mockResolvedValue(undefined);
    (GardenService.fetchAllPlantedPlantsBatch as jest.Mock).mockResolvedValue(mockPlantedPlantsBatch);
    (GardenService.fetchPlantedPlants as jest.Mock).mockResolvedValue(mockPlantedPlantsBatch['test-user-id']);

    (WeatherService.fetchWeatherData as jest.Mock).mockResolvedValue(mockWeatherData);
    (WeatherService.updateUserWeatherInDatabase as jest.Mock).mockResolvedValue(undefined);
    (WeatherService.getCityFromCoords as jest.Mock).mockResolvedValue('San Francisco');

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

  describe('useAppInitialization + useWeatherData integration', () => {
    it('should initialize app and fetch weather data successfully', async () => {
      // Test app initialization hook
      const { result: appHook } = renderHook(() => useAppInitialization());

      expect(appHook.current.loading).toBe(true);
      expect(appHook.current.isInitialized).toBe(false);

      await act(async () => {
        await appHook.current.initializeApp();
      });

      await waitFor(() => {
        expect(appHook.current.loading).toBe(false);
      });

      expect(appHook.current.currentUserId).toBe('test-user-id');
      expect(appHook.current.availablePlants).toEqual(mockPlants);
      expect(appHook.current.isInitialized).toBe(true);
      expect(appHook.current.error).toBe(null);

      // Test weather data hook
      const { result: weatherHook } = renderHook(() => useWeatherData());

      expect(weatherHook.current.loading).toBe(false);
      expect(weatherHook.current.weather).toBe(null);

      await act(async () => {
        await weatherHook.current.fetchWeatherData(37.7749, -122.4194);
      });

      await waitFor(() => {
        expect(weatherHook.current.loading).toBe(false);
      });

      expect(weatherHook.current.weather).toEqual(mockWeatherData.current);
      expect(weatherHook.current.forecast).toEqual(mockWeatherData.forecast);
      expect(weatherHook.current.cityName).toBe('San Francisco');
      expect(weatherHook.current.error).toBe(null);
    });

    it('should handle app initialization errors gracefully', async () => {
      // Mock app initialization error
      (GardenService.fetchAvailablePlants as jest.Mock).mockRejectedValue(
        new Error('Plants API failed')
      );

      const { result: appHook } = renderHook(() => useAppInitialization());

      await act(async () => {
        await appHook.current.initializeApp();
      });

      await waitFor(() => {
        expect(appHook.current.loading).toBe(false);
      });

      expect(appHook.current.error).toBeTruthy();
      expect(appHook.current.error).toContain('Plants API failed');
    });

    it('should allow clearing app errors', async () => {
      // Set up app error
      (GardenService.fetchAvailablePlants as jest.Mock).mockRejectedValue(
        new Error('App error')
      );

      const { result: appHook } = renderHook(() => useAppInitialization());

      await act(async () => {
        await appHook.current.initializeApp();
      });

      await waitFor(() => {
        expect(appHook.current.loading).toBe(false);
      });

      expect(appHook.current.error).toBeTruthy();

      // Clear app error
      act(() => {
        appHook.current.clearError();
      });

      expect(appHook.current.error).toBe(null);
    });

    it('should support data refresh in both hooks', async () => {
      // Initialize app
      const { result: appHook } = renderHook(() => useAppInitialization());

      await act(async () => {
        await appHook.current.initializeApp();
      });

      await waitFor(() => {
        expect(appHook.current.loading).toBe(false);
      });

      // Test app data refresh
      await act(async () => {
        await appHook.current.refreshData();
      });

      await waitFor(() => {
        expect(appHook.current.loading).toBe(false);
      });

      expect(appHook.current.error).toBe(null);

      // Initialize weather
      const { result: weatherHook } = renderHook(() => useWeatherData());

      await act(async () => {
        await weatherHook.current.fetchWeatherData(37.7749, -122.4194);
      });

      await waitFor(() => {
        expect(weatherHook.current.loading).toBe(false);
      });

      // Test weather refresh
      await act(async () => {
        await weatherHook.current.refreshWeather();
      });

      await waitFor(() => {
        expect(weatherHook.current.loading).toBe(false);
      });

      expect(weatherHook.current.error).toBe(null);
    });
  });
}); 