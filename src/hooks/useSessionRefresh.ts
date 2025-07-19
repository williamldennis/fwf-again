import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../utils/supabase';

export function useSessionRefresh() {
  useEffect(() => {
    console.log('[Session] 🚀 Initializing session refresh hook...');
    
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('[Session] 📱 App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        console.log('[Session] 📱 App came to foreground, checking session...');
        
        try {
          // Get current session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.log('[Session] ❌ Session error:', error.message);
            return;
          }
          
          if (!session) {
            console.log('[Session] ℹ️  No active session found');
            return;
          }
          
          console.log('[Session] ✅ Session found for user:', session.user.id);
          
          // Check if access token is expired or about to expire (within 5 minutes)
          const now = Math.floor(Date.now() / 1000);
          const tokenExp = session.expires_at ? Math.floor(session.expires_at / 1000) : 0;
          const timeUntilExpiry = tokenExp - now;
          
          console.log(`[Session] 🔑 Token expires in ${Math.floor(timeUntilExpiry / 60)} minutes`);
          
          // Refresh token if it expires within 5 minutes
          if (timeUntilExpiry < 300) { // 5 minutes
            console.log('[Session] 🔄 Refreshing session...');
            const { data, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.log('[Session] ❌ Session refresh failed:', refreshError.message);
            } else if (data.session) {
              console.log('[Session] ✅ Session refreshed successfully');
            }
          } else {
            console.log('[Session] ✅ Session is still valid');
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