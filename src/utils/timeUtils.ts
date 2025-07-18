import { DateTime } from 'luxon';

/**
 * Format a timestamp to show relative time (e.g., "2 min ago", "1 hour ago")
 * @param timestamp - ISO timestamp string
 * @returns Formatted relative time string
 */
export const formatRelativeTime = (timestamp: string): string => {
  try {
    const now = DateTime.now();
    
    // Parse the timestamp, assuming it's in UTC if no timezone is specified
    let time = DateTime.fromISO(timestamp);
    
    // If the timestamp doesn't have timezone info, assume it's UTC
    if (!time.isValid && timestamp.includes('T')) {
      time = DateTime.fromISO(timestamp + 'Z');
    }
    
    if (!time.isValid) {
      return 'Unknown time';
    }

    const diff = now.diff(time, ['minutes', 'hours', 'days']);

    if (diff.minutes < 1) {
      return 'Just now';
    } else if (diff.minutes < 60) {
      return `${Math.round(diff.minutes)} min ago`;
    } else if (diff.hours < 24) {
      return `${Math.round(diff.hours)} hour${Math.round(diff.hours) === 1 ? '' : 's'} ago`;
    } else {
      return `${Math.round(diff.days)} day${Math.round(diff.days) === 1 ? '' : 's'} ago`;
    }
  } catch (error) {
    return 'Unknown time';
  }
};

/**
 * Get emoji for action type
 * @param actionType - The action type from XP transaction
 * @returns Emoji string
 */
export const getActionEmoji = (actionType: string): string => {
  switch (actionType) {
    case 'daily_use':
      return '🌱';
    case 'plant_seed':
      return '🌱';
    case 'harvest_plant':
      return '🌾';
    case 'friend_garden_visit':
      return '👥';
    case 'achievement_unlock':
      return '🏆';
    case 'weather_mastery':
      return '🌤️';
    case 'collection_complete':
      return '📚';
    default:
      return '🌱';
  }
}; 