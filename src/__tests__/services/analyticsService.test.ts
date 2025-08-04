import { analytics } from '../../services/analyticsService';

// Mock PostHog
jest.mock('posthog-react-native', () => {
  return jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    identify: jest.fn(),
    screen: jest.fn(),
    setPersonProperties: jest.fn(),
    reset: jest.fn(),
    flush: jest.fn(),
  }));
});

describe('AnalyticsService', () => {
  let mockPostHog: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get the mocked PostHog instance
    const PostHog = require('posthog-react-native');
    mockPostHog = {
      capture: jest.fn(),
      identify: jest.fn(),
      screen: jest.fn(),
      setPersonProperties: jest.fn(),
      reset: jest.fn(),
      flush: jest.fn(),
    };
    
    // Mock the PostHog constructor
    PostHog.mockImplementation(() => mockPostHog);
    
    // Set up environment variables
    process.env.EXPO_PUBLIC_POSTHOG_API_KEY = 'test-api-key';
    process.env.EXPO_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
    delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
  });

  describe('initialize', () => {
    it('should initialize PostHog with correct configuration', async () => {
      await analytics.initialize();
      
      const PostHog = require('posthog-react-native');
      expect(PostHog).toHaveBeenCalledWith('test-api-key', {
        host: 'https://test.posthog.com',
        captureAppLifecycleEvents: true,
        captureDeepLinks: true,
        recordScreenViews: true,
      });
    });

    it('should handle missing API key gracefully', async () => {
      delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      await analytics.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith('PostHog API key not found. Analytics will be disabled.');
      consoleSpy.mockRestore();
    });
  });

  describe('track', () => {
    it('should track events with properties', async () => {
      await analytics.initialize();
      
      analytics.track('test_event', { property: 'value' });
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('test_event', { property: 'value' });
    });

    it('should handle tracking without properties', async () => {
      await analytics.initialize();
      
      analytics.track('test_event');
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('test_event', undefined);
    });
  });

  describe('identify', () => {
    it('should identify users with properties', async () => {
      await analytics.initialize();
      
      analytics.identify('user123', { email: 'test@example.com' });
      
      expect(mockPostHog.identify).toHaveBeenCalledWith('user123', { email: 'test@example.com' });
    });
  });

  describe('screen', () => {
    it('should track screen views', async () => {
      await analytics.initialize();
      
      analytics.screen('Home', { property: 'value' });
      
      expect(mockPostHog.screen).toHaveBeenCalledWith('Home', { property: 'value' });
    });
  });

  describe('error handling', () => {
    it('should handle tracking errors gracefully', async () => {
      await analytics.initialize();
      mockPostHog.capture.mockImplementation(() => {
        throw new Error('Network error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      analytics.track('test_event');
      
      expect(consoleSpy).toHaveBeenCalledWith('PostHog track error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});