import { useState, useEffect, useCallback } from 'react';
import { XPService, XPTransaction } from '../services/xpService';

interface UseXPHistoryReturn {
  transactions: XPTransaction[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useXPHistory = (userId: string | null, limit: number = 10): UseXPHistoryReturn => {
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!userId) {
      setTransactions([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await XPService.getXPHistory(userId, limit);
      setTransactions(data);
    } catch (err) {
      console.error('[useXPHistory] Error fetching XP history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch XP history');
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  const refresh = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    transactions,
    loading,
    error,
    refresh,
  };
};

export default useXPHistory; 