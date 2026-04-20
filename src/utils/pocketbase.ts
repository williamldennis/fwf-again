import PocketBase from 'pocketbase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const pocketbaseUrl = Constants.expoConfig?.extra?.pocketbaseUrl;

// Create PocketBase instance
export const pb = new PocketBase(pocketbaseUrl);

// Flag to prevent clearing auth during initialization
let isInitializing = false;

// Set up auth persistence - only after user actions, not during init
pb.authStore.onChange(async (token, model) => {
    // Don't persist during initialization to avoid race conditions
    if (isInitializing) {
        console.log('[PocketBase] Skipping auth persist during init');
        return;
    }

    try {
        if (token && model) {
            // Save auth data when it changes
            const data = JSON.stringify({ token, model });
            await AsyncStorage.setItem('pb_auth', data);
            console.log('[PocketBase] Auth saved for user:', model.id);
        } else if (!token) {
            // Only clear if explicitly logged out (no token)
            await AsyncStorage.removeItem('pb_auth');
            console.log('[PocketBase] Auth cleared');
        }
    } catch (error) {
        console.error('[PocketBase] Error persisting auth:', error);
    }
});

/**
 * Initialize auth from AsyncStorage on app startup
 * Call this in your app's root component or _layout.tsx
 */
export async function initAuth(): Promise<boolean> {
    isInitializing = true;
    try {
        const saved = await AsyncStorage.getItem('pb_auth');
        console.log('[PocketBase] Checking saved auth:', !!saved);

        if (saved) {
            const { token, model } = JSON.parse(saved);
            console.log('[PocketBase] Restoring auth for:', model?.id);
            pb.authStore.save(token, model);

            // Verify the token is still valid
            if (pb.authStore.isValid) {
                try {
                    await pb.collection('users').authRefresh();
                    console.log('[PocketBase] Auth refreshed successfully');
                    isInitializing = false;
                    return true;
                } catch (err) {
                    console.log('[PocketBase] Auth refresh failed, clearing:', err);
                    // Token expired or invalid, clear it
                    pb.authStore.clear();
                    await AsyncStorage.removeItem('pb_auth');
                    isInitializing = false;
                    return false;
                }
            }
        }
        isInitializing = false;
        return false;
    } catch (error) {
        console.error('[PocketBase] Error initializing auth:', error);
        isInitializing = false;
        return false;
    }
}

/**
 * Clear auth state (for logout)
 */
export async function clearAuth(): Promise<void> {
    pb.authStore.clear();
    await AsyncStorage.removeItem('pb_auth');
}

/**
 * Get the current authenticated user ID
 */
export function getCurrentUserId(): string | null {
    return pb.authStore.model?.id || null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    return pb.authStore.isValid;
}

// Re-export types that will be commonly used
export type { RecordModel, RecordSubscription } from 'pocketbase';
