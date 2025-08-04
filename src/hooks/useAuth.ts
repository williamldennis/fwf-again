import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { analytics } from '../services/analyticsService';

export interface UseAuthResult {
  user: any | null;
  currentUserId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<any | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    // Initial session check
    const initializeAuth = async () => {
      console.log('[Auth] 🚀 Starting auth initialization...');
      try {
        const { data, error } = await supabase.auth.getUser();
        console.log('[Auth] getUser result:', { data: !!data?.user, error: error?.message });
        
        if (!isMounted) return;
        
        if (error) {
          console.log('[Auth] ❌ Auth error:', error.message);
          setError(error.message);
          setUser(null);
          setCurrentUserId(null);
        } else if (data && data.user) {
          console.log('[Auth] ✅ User authenticated:', data.user.id);
          setUser(data.user);
          setCurrentUserId(data.user.id);
          
          // Identify user in analytics
          analytics.identify(data.user.id, {
            email: data.user.email,
            phone: data.user.phone,
          });
        } else {
          console.log('[Auth] ℹ️  No user found');
          setUser(null);
          setCurrentUserId(null);
        }
      } catch (err) {
        console.log('[Auth] ❌ Auth exception:', err);
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setUser(null);
        setCurrentUserId(null);
      } finally {
        if (isMounted) {
          console.log('[Auth] ✅ Auth initialization complete');
          setLoading(false);
        }
      }
    };

    // Set up auth state change listener
    console.log('[Auth] 🔄 Setting up auth state change listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] 🔄 Auth state changed:', event, session?.user?.id);
        
        if (!isMounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            console.log('[Auth] ✅ User signed in/refreshed:', session.user.id);
            setUser(session.user);
            setCurrentUserId(session.user.id);
            setError(null);
            
            // Track sign in and identify user
            if (event === 'SIGNED_IN') {
              analytics.track('user_signed_in');
            }
            analytics.identify(session.user.id, {
              email: session.user.email,
              phone: session.user.phone,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[Auth] 👋 User signed out');
          setUser(null);
          setCurrentUserId(null);
          setError(null);
          
          // Track sign out and reset analytics
          analytics.track('user_signed_out');
          analytics.reset();
        } else if (event === 'USER_UPDATED') {
          if (session?.user) {
            console.log('[Auth] 🔄 User updated:', session.user.id);
            setUser(session.user);
            setCurrentUserId(session.user.id);
          }
        } else if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            console.log('[Auth] 🎯 Initial session restored:', session.user.id);
            setUser(session.user);
            setCurrentUserId(session.user.id);
            setError(null);
          } else {
            console.log('[Auth] ℹ️  No initial session found');
          }
        }

        setLoading(false);
      }
    );

    // Initialize auth state
    initializeAuth();

    // Cleanup function
    return () => {
      console.log('[Auth] 🧹 Cleaning up auth hook');
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return {
    user,
    currentUserId,
    isAuthenticated: !!user,
    loading,
    error,
  };
}

export default useAuth; 