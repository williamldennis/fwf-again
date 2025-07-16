import { renderHook, waitFor } from '@testing-library/react-native';
import { useAppInitialization } from '../../hooks/useAppInitialization';
import { WeatherService } from '../../services/weatherService';
import { ContactsService } from '../../services/contactsService';
import { GardenService } from '../../services/gardenService';
import { supabase } from '../../utils/supabase';
import * as Location from 'expo-location';

// Mock all services
jest.mock('../../services/weatherService');
jest.mock('../../services/contactsService');
jest.mock('../../services/gardenService');
jest.mock('../../utils/supabase');
jest.mock('expo-location');
jest.mock('luxon');

const mockWeatherService = WeatherService as jest.Mocked<typeof WeatherService>;
const mockContactsService = ContactsService as jest.Mocked<typeof ContactsService>;
const mockGardenService = GardenService as jest.Mocked<typeof GardenService>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Consolidated Data Fetching', () => {
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
                            selfie_urls: { front: 'test-url' },
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
        (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
            status: 'granted',
        });
        (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
            coords: { latitude: 40.7128, longitude: -74.0060 },
        });

        // Mock contacts service
        mockContactsService.fetchUserContacts.mockResolvedValue([
            { phone: '+1234567890', name: 'Test Contact' } as any,
        ]);
        mockContactsService.findFriendsFromContacts.mockResolvedValue([
            { id: 'friend-1', name: 'Friend 1', city: 'New York' } as any,
            { id: 'friend-2', name: 'Friend 2', city: 'Los Angeles' } as any,
        ]);

        // Mock garden service
        mockGardenService.fetchAvailablePlants.mockResolvedValue([
            { id: 'plant-1', name: 'Sunflower' },
        ]);
        mockGardenService.fetchAllPlantedPlantsBatch.mockResolvedValue({
            'test-user-id': [{ id: 'plant-1', type: 'sunflower' }],
            'friend-1': [{ id: 'plant-2', type: 'fern' }],
            'friend-2': [],
        });
        mockGardenService.updatePlantGrowth.mockResolvedValue();
    });

    it('should fetch all data in a single initialization call', async () => {
        const { result } = renderHook(() => useAppInitialization());

        // Initialize the app
        await result.current.initializeApp();

        await waitFor(() => {
            expect(result.current.isInitialized).toBe(true);
        });

        // Verify all services were called exactly once (weather is now handled by useWeatherData)
        expect(mockContactsService.fetchUserContacts).toHaveBeenCalledTimes(1);
        expect(mockContactsService.findFriendsFromContacts).toHaveBeenCalledTimes(1);
        expect(mockGardenService.fetchAllPlantedPlantsBatch).toHaveBeenCalledTimes(1);
        expect(mockGardenService.fetchAvailablePlants).toHaveBeenCalledTimes(1);
        expect(mockGardenService.updatePlantGrowth).toHaveBeenCalledTimes(1);

        // Verify the consolidated data is available
        expect(result.current.friendsData).toHaveLength(2);
        expect(result.current.plantedPlants).toHaveProperty('test-user-id');
        expect(result.current.plantedPlants).toHaveProperty('friend-1');
        expect(result.current.plantedPlants).toHaveProperty('friend-2');
        expect(result.current.userProfile).toEqual({
            selfieUrls: { front: 'test-url' },
            points: 100,
            latitude: 40.7128,
            longitude: -74.0060,
        });
    });

    it('should refresh all data when refreshData is called', async () => {
        const { result } = renderHook(() => useAppInitialization());

        // Initialize first
        await result.current.initializeApp();
        await waitFor(() => {
            expect(result.current.isInitialized).toBe(true);
        });

        // Clear mock call counts
        jest.clearAllMocks();

        // Mock the services again for refresh
        mockContactsService.findFriendsFromContacts.mockResolvedValue([
            { id: 'friend-1', name: 'Friend 1', city: 'New York' } as any,
        ]);
        mockGardenService.fetchAllPlantedPlantsBatch.mockResolvedValue({
            'test-user-id': [{ id: 'plant-3', type: 'cactus' }],
            'friend-1': [],
        });

        // Refresh data
        await result.current.refreshData();

        // Wait for the new state
        await waitFor(() => {
            expect(result.current.friendsData).toHaveLength(1);
            expect(result.current.plantedPlants['test-user-id']).toHaveLength(1);
            expect(result.current.plantedPlants['test-user-id'][0].type).toBe('cactus');
        });
    });

    it('should handle errors gracefully and set error state', async () => {
        // Mock a service error (using garden service since weather is no longer called)
        mockGardenService.fetchAvailablePlants.mockRejectedValue(new Error('Plants API error'));

        const { result } = renderHook(() => useAppInitialization());

        // Initialize the app
        await result.current.initializeApp();

        await waitFor(() => {
            expect(result.current.error).toBeTruthy();
            expect(result.current.error).toContain('Plants API error');
        });

        // With progressive loading, the app is still considered initialized 
        // even if background operations fail, as long as core data (user + profile) loads
        expect(result.current.isInitialized).toBe(true);
    });

    it('should clear error when clearError is called', async () => {
        // Mock a service error first (using garden service since weather is no longer called)
        mockGardenService.fetchAvailablePlants.mockRejectedValue(new Error('Plants API error'));

        const { result } = renderHook(() => useAppInitialization());

        // Initialize the app
        await result.current.initializeApp();

        await waitFor(() => {
            expect(result.current.error).toBeTruthy();
        });

        // Clear error
        result.current.clearError();

        // Wait for the state update
        await waitFor(() => {
            expect(result.current.error).toBeNull();
        });
    });

    it('should batch fetch plants for all users efficiently', async () => {
        const { result } = renderHook(() => useAppInitialization());

        await result.current.initializeApp();

        await waitFor(() => {
            expect(result.current.isInitialized).toBe(true);
        });

        // Verify that fetchAllPlantedPlantsBatch was called with all user IDs
        expect(mockGardenService.fetchAllPlantedPlantsBatch).toHaveBeenCalledWith([
            'test-user-id',
            'friend-1',
            'friend-2',
        ]);

        // Verify the returned data structure
        expect(result.current.plantedPlants).toEqual({
            'test-user-id': [{ id: 'plant-1', type: 'sunflower' }],
            'friend-1': [{ id: 'plant-2', type: 'fern' }],
            'friend-2': [],
        });
    });
}); 