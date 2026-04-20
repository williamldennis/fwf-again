import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { pb, isAuthenticated } from '../utils/pocketbase';

export function useSessionRefresh() {
  useEffect(() => {
    console.log('[Session] 🚀 Initializing session refresh hook...');

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('[Session] 📱 App state changed to:', nextAppState);

      if (nextAppState === 'active') {
        console.log('[Session] 📱 App came to foreground, checking session...');

        try {
          // Check if we have a valid session
          if (!isAuthenticated()) {
            console.log('[Session] ℹ️  No active session found');
            return;
          }

          console.log('[Session] ✅ Session found for user:', pb.authStore.model?.id);

          // PocketBase tokens are valid for a long time by default
          // but we can still refresh to ensure validity
          if (pb.authStore.isValid) {
            console.log('[Session] 🔄 Refreshing session...');
            try {
              await pb.collection('users').authRefresh();
              console.log('[Session] ✅ Session refreshed successfully');
            } catch (refreshError) {
              console.log('[Session] ❌ Session refresh failed:', refreshError);
              // Token might be expired, auth will be cleared automatically
            }
          } else {
            console.log('[Session] ⚠️ Session is invalid, clearing...');
            pb.authStore.clear();
          }
        } catch (err) {
          console.log('[Session] ❌ Session check error:', err);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    console.log('[Session] ✅ Session refresh hook initialized');

    return () => {
      console.log('[Session] 🧹 Cleaning up session refresh hook');
      subscription?.remove();
    };
  }, []);
}
