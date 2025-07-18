import { formatRelativeTime, getActionEmoji } from '../../utils/timeUtils';

// Mock luxon
jest.mock('luxon', () => ({
  DateTime: {
    now: jest.fn(() => ({
      diff: jest.fn(() => ({
        minutes: 0,
        hours: 0,
        days: 0
      }))
    })),
    fromISO: jest.fn((timestamp) => {
      if (timestamp === 'invalid-timestamp') {
        return {
          isValid: false,
          diff: jest.fn(() => ({
            minutes: 0,
            hours: 0,
            days: 0
          }))
        };
      }
      return {
        isValid: true,
        diff: jest.fn(() => ({
          minutes: 0,
          hours: 0,
          days: 0
        }))
      };
    })
  }
}));

describe('timeUtils', () => {
  describe('formatRelativeTime', () => {
    it('should handle invalid timestamps', () => {
      const result = formatRelativeTime('invalid-timestamp');
      expect(result).toBe('Unknown time');
    });

    // Note: Testing the actual time formatting logic would require more complex mocking
    // For now, we'll test the basic functionality and edge cases
  });

  describe('getActionEmoji', () => {
    it('should return correct emoji for daily_use', () => {
      expect(getActionEmoji('daily_use')).toBe('🌱');
    });

    it('should return correct emoji for plant_seed', () => {
      expect(getActionEmoji('plant_seed')).toBe('🌱');
    });

    it('should return correct emoji for harvest_plant', () => {
      expect(getActionEmoji('harvest_plant')).toBe('🌾');
    });

    it('should return correct emoji for friend_garden_visit', () => {
      expect(getActionEmoji('friend_garden_visit')).toBe('👥');
    });

    it('should return correct emoji for achievement_unlock', () => {
      expect(getActionEmoji('achievement_unlock')).toBe('🏆');
    });

    it('should return correct emoji for weather_mastery', () => {
      expect(getActionEmoji('weather_mastery')).toBe('🌤️');
    });

    it('should return correct emoji for collection_complete', () => {
      expect(getActionEmoji('collection_complete')).toBe('📚');
    });

    it('should return default emoji for unknown action', () => {
      expect(getActionEmoji('unknown_action')).toBe('🌱');
    });
  });
}); 