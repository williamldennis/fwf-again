import { Friend } from '../../services/contactsService';

// Define the types that match the home component
type FlatListItem =
    | { type: "user-card"; id: "user-card" }
    | { type: "add-friends" }
    | Friend;

// Copy the isFriend function from home.tsx for testing
const isFriend = (item: FlatListItem): item is Friend => {
    return item != null && "id" in item && "contact_name" in item && !("type" in item);
};

describe('isFriend Type Guard', () => {
    it('should correctly identify Friend objects with contact_name property', () => {
        const friend: Friend = {
            id: 'friend-1',
            contact_name: 'John Doe',
            phone_number: '+1234567890',
            weather_temp: 75,
            weather_condition: 'Clear',
            weather_icon: '01d',
            weather_updated_at: '2024-01-01T00:00:00Z',
            latitude: 40.7128,
            longitude: -74.0060,
            selfie_urls: null,
            points: 500,
            city_name: 'New York',
        };

        expect(isFriend(friend)).toBe(true);
    });

    it('should not identify objects with type property as friends', () => {
        const userCard: FlatListItem = { type: "user-card", id: "user-card" };
        const addFriendsCard: FlatListItem = { type: "add-friends" };

        expect(isFriend(userCard)).toBe(false);
        expect(isFriend(addFriendsCard)).toBe(false);
    });

    it('should not identify objects missing contact_name property as friends', () => {
        const invalidFriend = {
            id: 'friend-1',
            // Missing contact_name
            phone_number: '+1234567890',
            weather_temp: 75,
            weather_condition: 'Clear',
            weather_icon: '01d',
            weather_updated_at: '2024-01-01T00:00:00Z',
            latitude: 40.7128,
            longitude: -74.0060,
            selfie_urls: null,
            points: 500,
            city_name: 'New York',
        };

        expect(isFriend(invalidFriend as any)).toBe(false);
    });

    it('should not identify objects missing id property as friends', () => {
        const invalidFriend = {
            // Missing id
            contact_name: 'John Doe',
            phone_number: '+1234567890',
            weather_temp: 75,
            weather_condition: 'Clear',
            weather_icon: '01d',
            weather_updated_at: '2024-01-01T00:00:00Z',
            latitude: 40.7128,
            longitude: -74.0060,
            selfie_urls: null,
            points: 500,
            city_name: 'New York',
        };

        expect(isFriend(invalidFriend as any)).toBe(false);
    });

    it('should not identify objects with both type and contact_name properties as friends', () => {
        const mixedObject = {
            type: "user-card",
            id: 'friend-1',
            contact_name: 'John Doe',
            phone_number: '+1234567890',
            weather_temp: 75,
            weather_condition: 'Clear',
            weather_icon: '01d',
            weather_updated_at: '2024-01-01T00:00:00Z',
            latitude: 40.7128,
            longitude: -74.0060,
            selfie_urls: null,
            points: 500,
            city_name: 'New York',
        };

        expect(isFriend(mixedObject as any)).toBe(false);
    });

    it('should identify Friend objects with all required properties', () => {
        const completeFriend: Friend = {
            id: 'friend-2',
            contact_name: 'Jane Smith',
            phone_number: '+0987654321',
            weather_temp: 80,
            weather_condition: 'Clouds',
            weather_icon: '02d',
            weather_updated_at: '2024-01-01T00:00:00Z',
            latitude: 40.7128,
            longitude: -74.0060,
            selfie_urls: null,
            points: 750,
            city_name: 'New York',
        };

        expect(isFriend(completeFriend)).toBe(true);
    });

    it('should handle edge cases with empty strings', () => {
        const friendWithEmptyName: Friend = {
            id: 'friend-3',
            contact_name: '', // Empty string
            phone_number: '+1234567890',
            weather_temp: 75,
            weather_condition: 'Clear',
            weather_icon: '01d',
            weather_updated_at: '2024-01-01T00:00:00Z',
            latitude: 40.7128,
            longitude: -74.0060,
            selfie_urls: null,
            points: 500,
            city_name: 'New York',
        };

        // Should still be identified as a friend (empty string is still a string)
        expect(isFriend(friendWithEmptyName)).toBe(true);
    });

    it('should handle null and undefined values', () => {
        expect(isFriend(null as any)).toBe(false);
        expect(isFriend(undefined as any)).toBe(false);
    });
}); 