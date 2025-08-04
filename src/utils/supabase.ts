import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseKey = Constants.expoConfig?.extra?.supabaseKey;

export const supabase = createClient(supabaseUrl!, supabaseKey!, {
  auth: {
    // Enable session persistence
    persistSession: true,
    // Use AsyncStorage for session storage
    storage: AsyncStorage,
    // Auto-refresh tokens
    autoRefreshToken: true,
    // Detect session in URL (for web, not needed for mobile but good practice)
    detectSessionInUrl: false,
  },
  realtime: {
    // Enable real-time for the client
    params: {
      eventsPerSecond: 10,
    },
  },
});
