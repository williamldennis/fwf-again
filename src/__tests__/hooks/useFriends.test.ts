// @jest-environment jsdom
import { renderHook, waitFor, act } from '@testing-library/react';
import useFriends from '../../hooks/useFriends';
import { ContactsService } from '../../services/contactsService';

jest.mock('../../services/contactsService');

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

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock ContactsService methods
    (ContactsService.fetchUserContacts as jest.Mock).mockResolvedValue(mockContacts);
    (ContactsService.findFriendsFromContacts as jest.Mock).mockResolvedValue(mockFriends);
    (ContactsService.refreshContacts as jest.Mock).mockResolvedValue({
      success: true,
      contactCount: 2,
    });
  });

  it('should fetch friends successfully', async () => {
    const { result } = renderHook(() => useFriends(mockUserId));

    expect(result.current.loading).toBe(true);
    expect(result.current.friends).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.friends).toEqual(mockFriends);
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