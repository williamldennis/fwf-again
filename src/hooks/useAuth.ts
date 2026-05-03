import { useEffect, useState, useCallback, useRef } from 'react';
import { pb, initAuth, clearAuth, getCurrentUserId, isAuthenticated as checkIsAuthenticated } from '../utils/pocketbase';
import { analytics } from '../services/analyticsService';
import type { RecordModel } from 'pocketbase';

export interface UseAuthResult {
  user: RecordModel | null;
  currentUserId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, userData?: Record<string, any>) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<RecordModel | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs to track current values and avoid duplicate state updates
  const currentUserIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    // Helper to update user state only if changed
    const updateUserState = (model: RecordModel | null, source: string) => {
      const newUserId = model?.id ?? null;

      // Skip if same user (debounce duplicate updates)
      if (newUserId === currentUserIdRef.current && hasInitializedRef.current) {
        console.log(`[Auth] ⏭️ Skipping duplicate update from ${source}`);
        return false;
      }

      currentUserIdRef.current = newUserId;
      hasInitializedRef.current = true;

      if (model) {
        console.log(`[Auth] ✅ User authenticated (${source}):`, model.id);
        setUser(model);
        setCurrentUserId(model.id);
        setError(null);

        // Identify user in analytics (only once per user)
        analytics.identify(model.id, {
          email: model.email,
          phone: model.phone_number,
        });
      } else {
        console.log(`[Auth] 👋 User signed out (${source})`);
        setUser(null);
        setCurrentUserId(null);
        setError(null);
        analytics.reset();
      }

      return true;
    };

    // Initial session check
    const initializeAuth = async () => {
      console.log('[Auth] 🚀 Starting auth initialization...');
      try {
        const isValid = await initAuth();

        if (!isMounted) return;

        if (isValid && pb.authStore.model) {
          updateUserState(pb.authStore.model, 'init');
        } else {
          console.log('[Auth] ℹ️  No user found');
          updateUserState(null, 'init');
        }
      } catch (err) {
        console.log('[Auth] ❌ Auth exception:', err);
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        updateUserState(null, 'error');
      } finally {
        if (isMounted) {
          console.log('[Auth] ✅ Auth initialization complete');
          setLoading(false);
        }
      }
    };

    // Set up auth state change listener
    console.log('[Auth] 🔄 Setting up auth state change listener...');
    const unsubscribe = pb.authStore.onChange((token, model) => {
      if (!isMounted) return;

      // Only update if actually changed (debounce)
      if (updateUserState(token && model ? model : null, 'onChange')) {
        setLoading(false);
      }
    });

    // Initialize auth state
    initializeAuth();

    // Cleanup function
    return () => {
      console.log('[Auth] 🧹 Cleaning up auth hook');
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await pb.collection('users').authWithPassword(email, password);
      analytics.track('user_signed_in');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    userData: Record<string, any> = {}
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Create user with initial profile data
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        points: 0,
        total_xp: 0,
        current_level: 1,
        xp_to_next_level: 100,
        ...userData,
      });

      // Automatically sign in after signup
      await pb.collection('users').authWithPassword(email, password);
      analytics.track('user_signed_up');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      analytics.track('user_signed_out');
      await clearAuth();
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    currentUserId,
    isAuthenticated: !!user && checkIsAuthenticated(),
    loading,
    error,
    signIn,
    signUp,
    signOut,
  };
}

export default useAuth;
