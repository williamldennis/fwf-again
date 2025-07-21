import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Initialize Sentry
export const initSentry = () => {
  const sentryDsn = Constants.expoConfig?.extra?.sentryDsn || process.env.EXPO_PUBLIC_SENTRY_DSN;
  
  if (!sentryDsn || sentryDsn === 'YOUR_SENTRY_DSN_HERE') {
    console.warn('Sentry DSN not configured. Skipping Sentry initialization.');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    
    // Enable performance monitoring
    tracesSampleRate: 1.0,
    
    // Enable session tracking
    autoSessionTracking: true,
    
    // Enable debug mode in development
    debug: __DEV__,
    
    // Set environment
    environment: __DEV__ ? 'development' : 'production',
    
    // Configure which errors to capture
    beforeSend(event) {
      // Don't send errors in development
      if (__DEV__) {
        console.log('Sentry would send:', event);
        return null;
      }
      return event;
    },
    
    // Configure which breadcrumbs to capture
    beforeBreadcrumb(breadcrumb) {
      // Don't send breadcrumbs in development
      if (__DEV__) {
        console.log('Sentry breadcrumb:', breadcrumb);
        return null;
      }
      return breadcrumb;
    },
  });
};

// Helper function to log messages
export const logMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) => {
  if (__DEV__) {
    console.log(`[Sentry] ${level.toUpperCase()}:`, message, context);
  }
  
  Sentry.captureMessage(message, {
    level,
    contexts: context ? { custom: context } : undefined,
  });
};

// Helper function to log errors
export const logError = (error: Error, context?: Record<string, any>) => {
  if (__DEV__) {
    console.error('[Sentry] ERROR:', error, context);
  }
  
  Sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
};

// Helper function to set user context
export const setUserContext = (userId: string, userData?: Record<string, any>) => {
  Sentry.setUser({
    id: userId,
    ...userData,
  });
};

// Helper function to add breadcrumb
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

// Test function to verify Sentry is working
export const testSentry = () => {
  console.log('Testing Sentry integration...');
  logMessage('Sentry test message', 'info', { test: true, timestamp: new Date().toISOString() });
  addBreadcrumb('Sentry test breadcrumb', 'test', { test: true });
  
  // Test error logging
  try {
    throw new Error('Test error for Sentry');
  } catch (error) {
    logError(error as Error, { test: true, operation: 'testSentry' });
  }
  
  console.log('Sentry test completed. Check your Sentry dashboard for these test events.');
}; 