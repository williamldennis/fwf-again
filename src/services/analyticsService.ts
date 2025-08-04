import PostHog from 'posthog-react-native';

class AnalyticsService {
  private static instance: AnalyticsService;
  private posthog: PostHog | null = null;

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async initialize() {
    try {
      const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
      const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

      if (!apiKey) {
        console.warn('PostHog API key not found. Analytics will be disabled.');
        return;
      }

      this.posthog = new PostHog(apiKey, {
        host,
        captureAppLifecycleEvents: true,
        captureDeepLinks: true,
        recordScreenViews: true,
      });

      console.log('PostHog initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PostHog:', error);
    }
  }

  identify(userId: string, properties?: Record<string, any>) {
    if (!this.posthog) return;
    
    try {
      this.posthog.identify(userId, properties);
    } catch (error) {
      console.error('PostHog identify error:', error);
    }
  }

  track(event: string, properties?: Record<string, any>) {
    if (!this.posthog) return;
    
    try {
      this.posthog.capture(event, properties);
    } catch (error) {
      console.error('PostHog track error:', error);
    }
  }

  screen(screenName: string, properties?: Record<string, any>) {
    if (!this.posthog) return;
    
    try {
      this.posthog.screen(screenName, properties);
    } catch (error) {
      console.error('PostHog screen error:', error);
    }
  }

  setUserProperties(properties: Record<string, any>) {
    if (!this.posthog) return;
    
    try {
      // Use identify with properties instead of setPersonProperties
      this.posthog.identify(undefined, properties);
    } catch (error) {
      console.error('PostHog setUserProperties error:', error);
    }
  }

  reset() {
    if (!this.posthog) return;
    
    try {
      this.posthog.reset();
    } catch (error) {
      console.error('PostHog reset error:', error);
    }
  }

  flush() {
    if (!this.posthog) return;
    
    try {
      this.posthog.flush();
    } catch (error) {
      console.error('PostHog flush error:', error);
    }
  }

  // Test function for manual verification
  sendTestEvent() {
    this.track('test_event', {
      test_property: 'test_value',
      timestamp: new Date().toISOString(),
      source: 'manual_test'
    });
    console.log('🧪 Test event sent to PostHog!');
  }
}

export const analytics = AnalyticsService.getInstance();