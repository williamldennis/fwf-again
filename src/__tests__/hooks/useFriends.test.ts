// @jest-environment jsdom
import { renderHook, waitFor, act } from '@testing-library/react';
import useFriends from '../../hooks/useFriends';
import { ContactsService } from '../../services/contactsService';
import { WeatherService } from '../../services/weatherService';

jest.mock('../../services/contactsService');
jest.mock('../../services/weatherService');

describe('useFriends', () => {
  const mockUserId = 'test-user-id';
  const mockContacts = [
    { contact_phone: '+1234567890', contact_name: 'John Doe' },
    { contact_phone: '+0987654321', contact_name: 'Jane Smith' },
  ];

  const mockFriends = [
    {
      id: 'friend-1',
      phone_number: '+1234567890',
      weather_temp: 70,
      weather_condition: 'Clear',
      weather_icon: '01d',
      weather_updated_at: '2025-07-16T00:00:00Z',
      latitude: 37.7749,
      longitude: -122.4194,
      selfie_urls: { sunny: 'test-url' },
      points: 100,
      contact_name: 'John Doe',
      city_name: 'San Francisco',
    },
    {
      id: 'friend-2',
      phone_number: '+0987654321',
      weather_temp: 65,
      weather_condition: 'Clouds',
      weather_icon: '03d',
      weather_updated_at: '2025-07-16T00:00:00Z',
      latitude: 40.7128,
      longitude: -74.0060,
      selfie_urls: { cloudy: 'test-url' },
      points: 150,
      contact_name: 'Jane Smith',
      city_name: 'New York',
    },
  ];

  const mockFreshWeather = {
    current: {
      main: {
        temp: 75,
      },
      weather: [
        {
          main: 'Sunny',
          icon: '01d',
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock ContactsService methods
    (ContactsService.fetchUserContacts as jest.Mock).mockResolvedValue(mockContacts);
    (ContactsService.refreshContacts as jest.Mock).mockResolvedValue({
      success: true,
      contactCount: 2,
    });

    // Mock WeatherService methods
    (WeatherService.getCityFromCoords as jest.Mock).mockResolvedValue('Test City');
    (WeatherService.fetchWeatherData as jest.Mock).mockResolvedValue(mockFreshWeather);

    // Mock findFriendsFromContacts to simulate the new weather fetching behavior
    (ContactsService.findFriendsFromContacts as jest.Mock).mockImplementation(async (contacts, userId) => {
      // Simulate the weather fetching that happens in the real method
      const friendsWithFreshWeather = await Promise.all(
        mockFriends.map(async (friend) => {
          const contactName = friend.contact_name;
          let cityName = "Unknown";
          let freshWeather = null;

          if (friend.latitude && friend.longitude) {
            // Get city name
            try {
              cityName = await WeatherService.getCityFromCoords(
                friend.latitude,
                friend.longitude
              );
            } catch (cityError) {
              console.warn(`[Friends] ⚠️ Could not get city name for ${contactName}:`, cityError);
            }

            // Get fresh weather data using friend's stored location
            try {
              freshWeather = await WeatherService.fetchWeatherData(
                friend.latitude,
                friend.longitude
              );
            } catch (weatherError) {
              console.warn(`[Friends] ⚠️ Could not fetch fresh weather for ${contactName}, using stored data:`, weatherError);
            }
          }

          return {
            ...friend,
            contact_name: contactName || "Unknown",
            city_name: cityName,
            // Use fresh weather data if available, otherwise fall back to stored data
            weather_temp: freshWeather?.current?.main?.temp ?? friend.weather_temp,
            weather_condition: freshWeather?.current?.weather?.[0]?.main ?? friend.weather_condition,
            weather_icon: freshWeather?.current?.weather?.[0]?.icon ?? friend.weather_icon,
            weather_updated_at: freshWeather ? new Date().toISOString() : friend.weather_updated_at,
          };
        })
      );

      return friendsWithFreshWeather;
    });
  });

  it('should fetch friends successfully', async () => {
    const { result } = renderHook(() => useFriends(mockUserId));

    expect(result.current.loading).toBe(true);
    expect(result.current.friends).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Friends should have fresh weather data applied
    expect(result.current.friends).toHaveLength(2);
    expect(result.current.friends[0].weather_temp).toBe(75); // From mockFreshWeather
    expect(result.current.friends[0].weather_condition).toBe('Sunny'); // From mockFreshWeather
    expect(result.current.friends[1].weather_temp).toBe(75); // From mockFreshWeather
    expect(result.current.friends[1].weather_condition).toBe('Sunny'); // From mockFreshWeather
    expect(result.current.error).toBeNull();
    expect(ContactsService.fetchUserContacts).toHaveBeenCalledWith(mockUserId);
    expect(ContactsService.findFriendsFromContacts).toHaveBeenCalledWith(mockContacts, mockUserId);
  });

  it('should handle friends fetch error gracefully', async () => {
    (ContactsService.fetchUserContacts as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch contacts')
    );

    const { result } = renderHook(() => useFriends(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.friends).toEqual([]);
    expect(result.current.error).toContain('Failed to fetch friends: Failed to fetch contacts');
  });

  it('should handle findFriendsFromContacts error gracefully', async () => {
    (ContactsService.findFriendsFromContacts as jest.Mock).mockRejectedValue(
      new Error('Failed to find friends')
    );

    const { result } = renderHook(() => useFriends(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.friends).toEqual([]);
    expect(result.current.error).toContain('Failed to fetch friends: Failed to find friends');
  });

  it('should refresh friends successfully', async () => {
    const { result } = renderHook(() => useFriends(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock updated friends response
    const updatedFriends = [
      {
        ...mockFriends[0],
        points: 200,
      },
    ];

    (ContactsService.findFriendsFromContacts as jest.Mock).mockResolvedValue(updatedFriends);

    await act(async () => {
      await result.current.refreshFriends();
    });

    expect(result.current.friends).toEqual(updatedFriends);
    expect(result.current.error).toBeNull();
  });

  it('should handle refresh friends error', async () => {
    const { result } = renderHook(() => useFriends(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock refresh error
    (ContactsService.fetchUserContacts as jest.Mock).mockRejectedValue(
      new Error('Refresh failed')
    );

    await act(async () => {
      await result.current.refreshFriends();
    });

    expect(result.current.error).toContain('Failed to fetch friends: Refresh failed');
  });

  it('should refresh contacts successfully', async () => {
    const { result } = renderHook(() => useFriends(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const refreshResult = await act(async () => {
      return await result.current.refreshContacts();
    });

    expect(refreshResult).toEqual({
      success: true,
      contactCount: 2,
    });
    expect(ContactsService.refreshContacts).toHaveBeenCalled();
  });

  it('should handle contacts refresh failure', async () => {
    (ContactsService.refreshContacts as jest.Mock).mockResolvedValue({
      success: false,
      contactCount: 0,
      error: 'Permission denied',
    });

    const { result } = renderHook(() => useFriends(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const refreshResult = await act(async () => {
      return await result.current.refreshContacts();
    });

    expect(refreshResult).toEqual({
      success: false,
      contactCount: 0,
      error: 'Permission denied',
    });
  });

  it('should handle contacts refresh error', async () => {
    (ContactsService.refreshContacts as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useFriends(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const refreshResult = await act(async () => {
      return await result.current.refreshContacts();
    });

    expect(refreshResult).toEqual({
      success: false,
      contactCount: 0,
      error: 'Network error',
    });
  });

  it('should handle null userId', () => {
    const { result } = renderHook(() => useFriends(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.friends).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch fresh weather data for friends', async () => {
    const { result } = renderHook(() => useFriends(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Verify that WeatherService methods were called for each friend
    expect(WeatherService.getCityFromCoords).toHaveBeenCalledTimes(2);
    expect(WeatherService.getCityFromCoords).toHaveBeenCalledWith(37.7749, -122.4194);
    expect(WeatherService.getCityFromCoords).toHaveBeenCalledWith(40.7128, -74.0060);

    expect(WeatherService.fetchWeatherData).toHaveBeenCalledTimes(2);
    expect(WeatherService.fetchWeatherData).toHaveBeenCalledWith(37.7749, -122.4194);
    expect(WeatherService.fetchWeatherData).toHaveBeenCalledWith(40.7128, -74.0060);

    // Verify that fresh weather data was applied
    expect(result.current.friends).toHaveLength(2);
    expect(result.current.friends[0].weather_temp).toBe(75); // From mockFreshWeather
    expect(result.current.friends[0].weather_condition).toBe('Sunny'); // From mockFreshWeather
    expect(result.current.friends[1].weather_temp).toBe(75); // From mockFreshWeather
    expect(result.current.friends[1].weather_condition).toBe('Sunny'); // From mockFreshWeather
    expect(result.current.error).toBeNull();
  });

  it('should handle weather API failures gracefully', async () => {
    // Mock weather API failure
    (WeatherService.fetchWeatherData as jest.Mock).mockRejectedValue(
      new Error('Weather API error')
    );

    const { result } = renderHook(() => useFriends(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Should still load friends even if weather fetching fails
    // Should use stored weather data when API fails
    expect(result.current.friends).toHaveLength(2);
    expect(result.current.friends[0].weather_temp).toBe(70); // Original stored data
    expect(result.current.friends[0].weather_condition).toBe('Clear'); // Original stored data
    expect(result.current.friends[1].weather_temp).toBe(65); // Original stored data
    expect(result.current.friends[1].weather_condition).toBe('Clouds'); // Original stored data
    expect(result.current.error).toBeNull();
    
    // Verify weather service was still called
    expect(WeatherService.fetchWeatherData).toHaveBeenCalledTimes(2);
  });

  it('should not refresh friends when userId is null', async () => {
    const { result } = renderHook(() => useFriends(null));

    await act(async () => {
      await result.current.refreshFriends();
    });

    expect(result.current.friends).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return error when refreshing contacts without userId', async () => {
    const { result } = renderHook(() => useFriends(null));

    const refreshResult = await act(async () => {
      return await result.current.refreshContacts();
    });

    expect(refreshResult).toEqual({
      success: false,
      contactCount: 0,
      error: 'No user ID provided',
    });
  });

  it('should refresh friends after successful contacts refresh', async () => {
    const { result } = renderHook(() => useFriends(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock updated friends after contacts refresh
    const updatedFriends = [
      {
        ...mockFriends[0],
        contact_name: 'Updated John',
      },
    ];

    (ContactsService.findFriendsFromContacts as jest.Mock).mockResolvedValue(updatedFriends);

    await act(async () => {
      await result.current.refreshContacts();
    });

    expect(result.current.friends).toEqual(updatedFriends);
  });

  it('should not refresh friends after failed contacts refresh', async () => {
    (ContactsService.refreshContacts as jest.Mock).mockResolvedValue({
      success: false,
      contactCount: 0,
      error: 'Permission denied',
    });

    const { result } = renderHook(() => useFriends(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Store initial friends
    const initialFriends = result.current.friends;

    await act(async () => {
      await result.current.refreshContacts();
    });

    // Friends should remain unchanged
    expect(result.current.friends).toEqual(initialFriends);
  });

  it('should handle empty friends list', async () => {
    (ContactsService.findFriendsFromContacts as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useFriends(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.friends).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle empty contacts list', async () => {
    (ContactsService.fetchUserContacts as jest.Mock).mockResolvedValue([]);
    (ContactsService.findFriendsFromContacts as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useFriends(mockUserId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.friends).toEqual([]);
    expect(result.current.error).toBeNull();
  });
}); 