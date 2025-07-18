import { useState, useEffect, useCallback } from 'react';
import { AchievementService, Achievement, AchievementProgress } from '../services/achievementService';

interface UseAchievementsReturn {
    achievements: Achievement[];
    userProgress: Record<string, AchievementProgress>;
    categoryStats: Record<string, { total: number; completed: number }>;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export const useAchievements = (userId: string | null): UseAchievementsReturn => {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [userProgress, setUserProgress] = useState<Record<string, AchievementProgress>>({});
    const [categoryStats, setCategoryStats] = useState<Record<string, { total: number; completed: number }>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAchievements = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            console.log('[useAchievements] 🌟 Fetching achievements for user:', userId);

            // Fetch all achievements
            const allAchievements = await AchievementService.getAllAchievements();
            console.log('[useAchievements] 📊 Found', allAchievements.length, 'achievements');

            // Get user's unlocked achievements
            const userAchievements = await AchievementService.getUserAchievements(userId);
            const unlockedAchievementIds = new Set(userAchievements.map(ua => ua.achievement_id));

            // Create progress map by properly calculating progress for each achievement
            const progressMap: Record<string, AchievementProgress> = {};
            
            // Calculate progress for each achievement
            for (const achievement of allAchievements) {
                try {
                    const progress = await AchievementService.calculateAchievementProgress(
                        userId,
                        achievement,
                        {}
                    );
                    progressMap[achievement.id] = progress;
                } catch (error) {
                    console.error(`[useAchievements] Error calculating progress for ${achievement.id}:`, error);
                    // Fallback to basic progress calculation
                    const isUnlocked = unlockedAchievementIds.has(achievement.id);
                    progressMap[achievement.id] = {
                        achievementId: achievement.id,
                        currentProgress: isUnlocked ? achievement.requirements.target : 0,
                        maxProgress: achievement.requirements.target,
                        isUnlocked: isUnlocked,
                        unlockedAt: userAchievements.find(ua => ua.achievement_id === achievement.id)?.unlocked_at,
                    };
                }
            }

            // Calculate category statistics
            const stats: Record<string, { total: number; completed: number }> = {};
            allAchievements.forEach((achievement) => {
                const category = achievement.category;
                if (!stats[category]) {
                    stats[category] = { total: 0, completed: 0 };
                }
                stats[category].total += 1;
                if (progressMap[achievement.id]?.isUnlocked) {
                    stats[category].completed += 1;
                }
            });

            console.log('[useAchievements] ✅ Achievements loaded successfully');
            console.log('[useAchievements] 📈 Category stats:', stats);
            console.log('[useAchievements] 📊 Progress map:', progressMap);

            setAchievements(allAchievements);
            setUserProgress(progressMap);
            setCategoryStats(stats);

        } catch (err) {
            console.error('[useAchievements] ❌ Error fetching achievements:', err);
            setError(err instanceof Error ? err.message : 'Failed to load achievements');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const refresh = useCallback(async () => {
        await fetchAchievements();
    }, [fetchAchievements]);

    // Initial fetch
    useEffect(() => {
        fetchAchievements();
    }, [fetchAchievements]);

    // Auto-refresh when userId changes
    useEffect(() => {
        if (userId) {
            fetchAchievements();
        }
    }, [userId, fetchAchievements]);

    return {
        achievements,
        userProgress,
        categoryStats,
        loading,
        error,
        refresh,
    };
};

export default useAchievements; 