import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

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
    supabase.auth.getUser()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setError(error.message);
          setUser(null);
          setCurrentUserId(null);
        } else if (data && data.user) {
          setUser(data.user);
          setCurrentUserId(data.user.id);
        } else {
          setUser(null);
          setCurrentUserId(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Unknown error');
        setUser(null);
        setCurrentUserId(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
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