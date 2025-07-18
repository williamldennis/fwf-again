import { useState, useEffect, useCallback } from 'react';
import { XPService } from '../services/xpService';

interface LevelBenefits {
  level: number;
  description: string;
  unlocked_features: string[];
}

interface UseLevelBenefitsReturn {
  currentBenefits: LevelBenefits | null;
  nextLevelBenefits: LevelBenefits | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useLevelBenefits = (currentLevel: number | null): UseLevelBenefitsReturn => {
  const [currentBenefits, setCurrentBenefits] = useState<LevelBenefits | null>(null);
  const [nextLevelBenefits, setNextLevelBenefits] = useState<LevelBenefits | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBenefits = useCallback(async () => {
    if (!currentLevel) {
      setCurrentBenefits(null);
      setNextLevelBenefits(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current level benefits
      const current = await XPService.getLevelBenefits(currentLevel);
      setCurrentBenefits(current as LevelBenefits);

      // Get next level benefits (if not at max level)
      if (currentLevel < 50) {
        const next = await XPService.getLevelBenefits(currentLevel + 1);
        setNextLevelBenefits(next as LevelBenefits);
      } else {
        setNextLevelBenefits(null);
      }
    } catch (err) {
      console.error('[useLevelBenefits] Error fetching level benefits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch level benefits');
    } finally {
      setLoading(false);
    }
  }, [currentLevel]);

  const refresh = useCallback(async () => {
    await fetchBenefits();
  }, [fetchBenefits]);

  useEffect(() => {
    fetchBenefits();
  }, [fetchBenefits]);

  return {
    currentBenefits,
    nextLevelBenefits,
    loading,
    error,
    refresh,
  };
};

export default useLevelBenefits; 