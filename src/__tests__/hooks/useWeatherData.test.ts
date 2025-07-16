// @jest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWeatherData } from '../../hooks/useWeatherData';
import { WeatherService } from '../../services/weatherService';
// @ts-ignore
import tzlookup from 'tz-lookup';
// @ts-ignore
import { DateTime } from 'luxon';

// Mock the services
jest.mock('../../services/weatherService');

// Mock tz-lookup
jest.mock('tz-lookup', () => jest.fn(() => 'America/New_York'));

// Mock luxon
jest.mock('luxon', () => ({
  DateTime: {
    now: jest.fn(() => ({
      setZone: jest.fn(() => ({
        hour: 12
      }))
    }))
  }
}));

describe('useWeatherData', () => {
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

  const mockCityName = 'San Francisco';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup service mocks
    (WeatherService.fetchWeatherData as jest.Mock).mockResolvedValue(mockWeatherData);
    (WeatherService.getCityFromCoords as jest.Mock).mockResolvedValue(mockCityName);
  });

  describe('automatic fetching', () => {
    it('should automatically fetch weather when coordinates are provided', async () => {
      const { result } = renderHook(() => useWeatherData(37.7749, -122.4194));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.weather).toEqual(mockWeatherData.current);
      expect(result.current.forecast).toEqual(mockWeatherData.forecast);
      expect(result.current.cityName).toBe(mockCityName);
      expect(result.current.backgroundColor).toBe('#87CEEB'); // Day blue for hour 12
      expect(result.current.error).toBe(null);
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
      expect(WeatherService.fetchWeatherData).toHaveBeenCalledWith(37.7749, -122.4194);
      expect(WeatherService.getCityFromCoords).toHaveBeenCalledWith(37.7749, -122.4194);
    }, 10000);

    it('should not fetch when coordinates are null or undefined', () => {
      const { result } = renderHook(() => useWeatherData(null, null));

      expect(result.current.loading).toBe(false);
      expect(result.current.weather).toBe(null);
      expect(result.current.forecast).toEqual([]);
      expect(WeatherService.fetchWeatherData).not.toHaveBeenCalled();
      expect(WeatherService.getCityFromCoords).not.toHaveBeenCalled();
    });

    it('should refetch when coordinates change', async () => {
      const { result, rerender } = renderHook(
        ({ lat, lon }) => useWeatherData(lat, lon),
        { initialProps: { lat: 40.7128, lon: -74.0060 } } // Use different coordinates
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(WeatherService.fetchWeatherData).toHaveBeenCalledWith(40.7128, -74.0060);

      // Reset mock call counts
      (WeatherService.fetchWeatherData as jest.Mock).mockClear();
      (WeatherService.getCityFromCoords as jest.Mock).mockClear();

      // Change coordinates
      rerender({ lat: 51.5074, lon: -0.1278 }); // London coordinates

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should call APIs again for different location
      expect(WeatherService.fetchWeatherData).toHaveBeenCalledWith(51.5074, -0.1278);
      expect(WeatherService.getCityFromCoords).toHaveBeenCalledWith(51.5074, -0.1278);
    }, 10000);
  });

  describe('fetchWeatherData', () => {
    it('should fetch weather data successfully on manual call', async () => {
      const { result } = renderHook(() => useWeatherData());

      expect(result.current.loading).toBe(false);
      expect(result.current.weather).toBe(null);
      expect(result.current.forecast).toEqual([]);

      await act(async () => {
        await result.current.fetchWeatherData(35.6762, 139.6503); // Tokyo coordinates
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.weather).toEqual(mockWeatherData.current);
      expect(result.current.forecast).toEqual(mockWeatherData.forecast);
      expect(result.current.cityName).toBe(mockCityName);
      expect(result.current.backgroundColor).toBe('#87CEEB'); // Day blue for hour 12
      expect(result.current.error).toBe(null);
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
      expect(WeatherService.fetchWeatherData).toHaveBeenCalledWith(35.6762, 139.6503);
      expect(WeatherService.getCityFromCoords).toHaveBeenCalledWith(35.6762, 139.6503);
    }, 10000);

    it('should fetch fresh data for different coordinates', async () => {
      const { result } = renderHook(() => useWeatherData());

      // First call
      await act(async () => {
        await result.current.fetchWeatherData(48.8566, 2.3522); // Paris coordinates
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Reset mock call counts
      (WeatherService.fetchWeatherData as jest.Mock).mockClear();
      (WeatherService.getCityFromCoords as jest.Mock).mockClear();

      // Second call with different coordinates
      await act(async () => {
        await result.current.fetchWeatherData(55.7558, 37.6176); // Moscow coordinates
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should call APIs again for different location
      expect(WeatherService.fetchWeatherData).toHaveBeenCalledWith(55.7558, 37.6176);
      expect(WeatherService.getCityFromCoords).toHaveBeenCalledWith(55.7558, 37.6176);
    }, 10000);

    it('should handle weather service errors gracefully', async () => {
      (WeatherService.fetchWeatherData as jest.Mock).mockRejectedValue(
        new Error('Weather API failed')
      );

      const { result } = renderHook(() => useWeatherData());

      await act(async () => {
        await result.current.fetchWeatherData(19.4326, -99.1332); // Mexico City coordinates
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain('Weather API failed');
      expect(result.current.weather).toBe(null);
      expect(result.current.forecast).toEqual([]);
    }, 10000);
  });

  describe('refreshWeather', () => {
    it('should not refresh if no location is set', async () => {
      const { result } = renderHook(() => useWeatherData());

      // Try to refresh without setting location first
      await act(async () => {
        await result.current.refreshWeather();
      });

      // Should not call any APIs
      expect(WeatherService.fetchWeatherData).not.toHaveBeenCalled();
      expect(WeatherService.getCityFromCoords).not.toHaveBeenCalled();
    }, 10000);

    it('should refresh weather data when location is set', async () => {
      const { result } = renderHook(() => useWeatherData(34.0522, -118.2437)); // LA coordinates

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Reset mock call counts
      (WeatherService.fetchWeatherData as jest.Mock).mockClear();
      (WeatherService.getCityFromCoords as jest.Mock).mockClear();

      // Refresh
      await act(async () => {
        await result.current.refreshWeather();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should call APIs again
      expect(WeatherService.fetchWeatherData).toHaveBeenCalledWith(34.0522, -118.2437);
      expect(WeatherService.getCityFromCoords).toHaveBeenCalledWith(34.0522, -118.2437);
    }, 10000);
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      // Mock both services to fail
      (WeatherService.fetchWeatherData as jest.Mock).mockRejectedValue(
        new Error('Test error')
      );
      (WeatherService.getCityFromCoords as jest.Mock).mockRejectedValue(
        new Error('City API failed')
      );

      const { result } = renderHook(() => useWeatherData());

      // Use different coordinates to avoid cache
      await act(async () => {
        await result.current.fetchWeatherData(41.9028, 12.4964); // Rome coordinates
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Check that error is set
      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain('City API failed');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    }, 10000);
  });

  describe('timezone handling', () => {
    it('should handle timezone calculation errors gracefully', async () => {
      (tzlookup as jest.Mock).mockImplementation(() => {
        throw new Error('Timezone lookup failed');
      });

      const { result } = renderHook(() => useWeatherData(52.3676, 4.9041)); // Amsterdam coordinates

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still work with default hour (12)
      expect(result.current.backgroundColor).toBe('#87CEEB'); // Day blue for hour 12
      expect(result.current.weather).toEqual(mockWeatherData.current);
    }, 10000);
  });

  describe('caching', () => {
    it('should use cached data when available and valid', async () => {
      const { result } = renderHook(() => useWeatherData(59.3293, 18.0686)); // Stockholm coordinates

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Reset mock call counts
      (WeatherService.fetchWeatherData as jest.Mock).mockClear();
      (WeatherService.getCityFromCoords as jest.Mock).mockClear();

      // Fetch same coordinates again
      await act(async () => {
        await result.current.fetchWeatherData(59.3293, 18.0686);
      });

      // Should not call APIs again (using cache)
      expect(WeatherService.fetchWeatherData).not.toHaveBeenCalled();
      expect(WeatherService.getCityFromCoords).not.toHaveBeenCalled();
    }, 10000);
  });
}); 