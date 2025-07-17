import { useState, useEffect, useCallback } from 'react';
import { XPService, UserXPSummary } from '../services/xpService';

interface UseXPReturn {
  xpData: UserXPSummary | null;
  loading: boolean;
  error: string | null;
  refreshXP: () => Promise<void>;
}

export const useXP = (userId: string | null): UseXPReturn => {
  const [xpData, setXpData] = useState<UserXPSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchXP = useCallback(async () => {
    if (!userId) {
      setXpData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await XPService.getUserXP(userId);
      setXpData(data);
    } catch (err) {
      console.error('[useXP] Error fetching XP data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch XP data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refreshXP = useCallback(async () => {
    await fetchXP();
  }, [fetchXP]);

  useEffect(() => {
    fetchXP();
  }, [fetchXP]);

  return {
    xpData,
    loading,
    error,
    refreshXP,
  };
};

export default useXP; 