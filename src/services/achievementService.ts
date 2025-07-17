import { supabase } from "../utils/supabase";
import { XPService } from "./xpService";

// Types for achievement system
export interface Achievement {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  category: 'daily' | 'milestones' | 'weather' | 'social' | 'collection';
  requirements: AchievementRequirement;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface AchievementRequirement {
  type: 'count' | 'unique' | 'streak' | 'combination';
  action: string;
  target: number;
  conditions?: Record<string, any>;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress_data: Record<string, any>;
  created_at: string;
}

export interface AchievementProgress {
  achievementId: string;
  currentProgress: number;
  maxProgress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export interface AchievementCheckResult {
  unlocked: string[];
  progress: AchievementProgress[];
  xpAwarded: number;
}

export class AchievementService {
  // Achievement definitions - will be expanded in Task 1.6
  private static readonly ACHIEVEMENTS: Record<string, Achievement> = {
    // Daily achievements
    'daily_use': {
      id: 'daily_use',
      name: 'Daily Gardener',
      description: 'Use the app for 7 consecutive days',
      xpReward: 50,
      category: 'daily',
      requirements: {
        type: 'streak',
        action: 'daily_use',
        target: 7
      }
    },

    // Planting milestones
    'first_seed': {
      id: 'first_seed',
      name: 'First Steps',
      description: 'Plant your first seed',
      xpReward: 50,
      category: 'milestones',
      requirements: {
        type: 'count',
        action: 'plant_seed',
        target: 1
      }
    },

    'plant_10_seeds': {
      id: 'plant_10_seeds',
      name: 'Getting the Hang of It',
      description: 'Plant 10 total seeds',
      xpReward: 100,
      category: 'milestones',
      requirements: {
        type: 'count',
        action: 'plant_seed',
        target: 10
      }
    },

    'plant_all_types': {
      id: 'plant_all_types',
      name: 'Plant Variety Master',
      description: 'Plant all 6 plant types',
      xpReward: 300,
      category: 'collection',
      requirements: {
        type: 'unique',
        action: 'plant_seed',
        target: 6,
        conditions: { unique_plants: true }
      }
    },

    // Harvesting milestones
    'first_harvest': {
      id: 'first_harvest',
      name: 'First Harvest',
      description: 'Harvest your first mature plant',
      xpReward: 150,
      category: 'milestones',
      requirements: {
        type: 'count',
        action: 'harvest_plant',
        target: 1
      }
    },

    'harvest_25_plants': {
      id: 'harvest_25_plants',
      name: 'Dedicated Harvester',
      description: 'Harvest 25 total plants',
      xpReward: 400,
      category: 'milestones',
      requirements: {
        type: 'count',
        action: 'harvest_plant',
        target: 25
      }
    },

    // Social achievements
    'friend_garden_visit': {
      id: 'friend_garden_visit',
      name: 'Social Butterfly',
      description: 'Plant in your first friend\'s garden',
      xpReward: 200,
      category: 'social',
      requirements: {
        type: 'unique',
        action: 'plant_seed',
        target: 1,
        conditions: { friend_garden: true }
      }
    },

    'plant_3_friend_gardens': {
      id: 'plant_3_friend_gardens',
      name: 'Community Gardener',
      description: 'Plant in 3 different friend gardens',
      xpReward: 300,
      category: 'social',
      requirements: {
        type: 'unique',
        action: 'plant_seed',
        target: 3,
        conditions: { friend_gardens: true }
      }
    },

    // Weather achievements
    'sunny_planting': {
      id: 'sunny_planting',
      name: 'Sun Seeker',
      description: 'Plant in sunny weather',
      xpReward: 50,
      category: 'weather',
      requirements: {
        type: 'count',
        action: 'plant_seed',
        target: 1,
        conditions: { weather: 'sunny' }
      }
    },

    'rainy_planting': {
      id: 'rainy_planting',
      name: 'Rain Lover',
      description: 'Plant in rainy weather',
      xpReward: 50,
      category: 'weather',
      requirements: {
        type: 'count',
        action: 'plant_seed',
        target: 1,
        conditions: { weather: 'rainy' }
      }
    },

    'cloudy_planting': {
      id: 'cloudy_planting',
      name: 'Cloud Watcher',
      description: 'Plant in cloudy weather',
      xpReward: 50,
      category: 'weather',
      requirements: {
        type: 'count',
        action: 'plant_seed',
        target: 1,
        conditions: { weather: 'cloudy' }
      }
    }
  };

  /**
   * Check and award achievements for a specific action
   * @param userId - The user's UUID
   * @param actionType - Type of action performed
   * @param context - Additional context about the action
   * @returns Promise<AchievementCheckResult>
   */
  static async checkAndAwardAchievements(
    userId: string,
    actionType: string,
    context: Record<string, any> = {}
  ): Promise<AchievementCheckResult> {
    try {
      if (!userId || !actionType) {
        return { unlocked: [], progress: [], xpAwarded: 0 };
      }

      const result: AchievementCheckResult = {
        unlocked: [],
        progress: [],
        xpAwarded: 0
      };

      // Get user's current achievements
      const userAchievements = await this.getUserAchievements(userId);
      const unlockedAchievementIds = new Set(
        userAchievements.map(ua => ua.achievement_id)
      );

      // Check each achievement that matches the action type
      for (const [achievementId, achievement] of Object.entries(this.ACHIEVEMENTS)) {
        if (achievement.requirements.action === actionType) {
          const progress = await this.calculateAchievementProgress(
            userId,
            achievement,
            context
          );

          // Add to progress list
          result.progress.push(progress);

          // Check if achievement should be unlocked
          if (!unlockedAchievementIds.has(achievementId) && progress.isUnlocked) {
            const unlockResult = await this.unlockAchievement(
              userId,
              achievementId,
              progress
            );

            if (unlockResult) {
              result.unlocked.push(achievementId);
              result.xpAwarded += achievement.xpReward;

              // Award XP for the achievement
              await XPService.awardXP(
                userId,
                achievement.xpReward,
                'achievement_unlock',
                `Achievement unlocked: ${achievement.name}`,
                { achievementId, achievementName: achievement.name }
              );
            }
          }
        }
      }

      return result;

    } catch (error) {
      console.error("[AchievementService] Error checking achievements:", error);
      return { unlocked: [], progress: [], xpAwarded: 0 };
    }
  }

  /**
   * Get all achievements for a user (unlocked and progress)
   * @param userId - The user's UUID
   * @returns Promise<UserAchievement[]>
   */
  static async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      if (!userId) {
        console.error("[AchievementService] No userId provided for getUserAchievements");
        return [];
      }

      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) {
        console.error("[AchievementService] Error getting user achievements:", error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error("[AchievementService] Exception in getUserAchievements:", error);
      return [];
    }
  }

  /**
   * Get all available achievements
   * @returns Promise<Achievement[]>
   */
  static async getAllAchievements(): Promise<Achievement[]> {
    try {
      return Object.values(this.ACHIEVEMENTS);
    } catch (error) {
      console.error("[AchievementService] Exception in getAllAchievements:", error);
      return [];
    }
  }

  /**
   * Update progress for a specific achievement
   * @param userId - The user's UUID
   * @param achievementId - The achievement ID
   * @param progress - Progress data
   * @returns Promise<boolean>
   */
  static async updateProgress(
    userId: string,
    achievementId: string,
    progress: Record<string, any>
  ): Promise<boolean> {
    try {
      if (!userId || !achievementId) {
        return false;
      }

      const { data, error } = await supabase.rpc('update_achievement_progress', {
        user_uuid: userId,
        achievement_id: achievementId,
        progress_data: progress
      });

      if (error) {
        console.error("[AchievementService] Error updating achievement progress:", error);
        return false;
      }

      return data || false;

    } catch (error) {
      console.error("[AchievementService] Exception in updateProgress:", error);
      return false;
    }
  }

  /**
   * Check if user has unlocked a specific achievement
   * @param userId - The user's UUID
   * @param achievementId - The achievement ID
   * @returns Promise<boolean>
   */
  static async hasAchievement(userId: string, achievementId: string): Promise<boolean> {
    try {
      if (!userId || !achievementId) {
        return false;
      }

      const { data, error } = await supabase.rpc('has_achievement', {
        user_uuid: userId,
        achievement_id: achievementId
      });

      if (error) {
        console.error("[AchievementService] Error checking achievement:", error);
        return false;
      }

      return data || false;

    } catch (error) {
      console.error("[AchievementService] Exception in hasAchievement:", error);
      return false;
    }
  }

  /**
   * Unlock an achievement for a user
   * @param userId - The user's UUID
   * @param achievementId - The achievement ID
   * @param progress - Current progress data
   * @returns Promise<boolean>
   */
  static async unlockAchievement(
    userId: string,
    achievementId: string,
    progress: AchievementProgress
  ): Promise<boolean> {
    try {
      if (!userId || !achievementId) {
        return false;
      }

      // Check if already unlocked
      const alreadyUnlocked = await this.hasAchievement(userId, achievementId);
      if (alreadyUnlocked) {
        return false;
      }

      const { data, error } = await supabase.rpc('unlock_achievement', {
        user_uuid: userId,
        achievement_id: achievementId,
        progress_data: { progress: progress.currentProgress }
      });

      if (error) {
        console.error("[AchievementService] Error unlocking achievement:", error);
        return false;
      }

      return data || false;

    } catch (error) {
      console.error("[AchievementService] Exception in unlockAchievement:", error);
      return false;
    }
  }

  /**
   * Calculate progress for a specific achievement
   * @param userId - The user's UUID
   * @param achievement - The achievement definition
   * @param context - Action context
   * @returns Promise<AchievementProgress>
   */
  private static async calculateAchievementProgress(
    userId: string,
    achievement: Achievement,
    context: Record<string, any>
  ): Promise<AchievementProgress> {
    try {
      const isUnlocked = await this.hasAchievement(userId, achievement.id);
      
      if (isUnlocked) {
        return {
          achievementId: achievement.id,
          currentProgress: achievement.requirements.target,
          maxProgress: achievement.requirements.target,
          isUnlocked: true
        };
      }

      let currentProgress = 0;

      switch (achievement.requirements.type) {
        case 'count':
          currentProgress = await this.getActionCount(userId, achievement.requirements.action, context);
          break;

        case 'unique':
          currentProgress = await this.getUniqueActionCount(userId, achievement.requirements.action, context);
          break;

        case 'streak':
          currentProgress = await this.getActionStreak(userId, achievement.requirements.action);
          break;

        case 'combination':
          currentProgress = await this.getCombinationProgress(userId, achievement.requirements, context);
          break;

        default:
          currentProgress = 0;
      }

      const isUnlockedNow = currentProgress >= achievement.requirements.target;

      return {
        achievementId: achievement.id,
        currentProgress: Math.min(currentProgress, achievement.requirements.target),
        maxProgress: achievement.requirements.target,
        isUnlocked: isUnlockedNow
      };

    } catch (error) {
      console.error("[AchievementService] Error calculating achievement progress:", error);
      return {
        achievementId: achievement.id,
        currentProgress: 0,
        maxProgress: achievement.requirements.target,
        isUnlocked: false
      };
    }
  }

  /**
   * Get count of actions for a user
   * @param userId - The user's UUID
   * @param actionType - The action type
   * @param context - Additional context
   * @returns Promise<number>
   */
  private static async getActionCount(
    userId: string,
    actionType: string,
    context: Record<string, any>
  ): Promise<number> {
    try {
      let query = supabase
        .from('xp_transactions')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('action_type', actionType);

      // Apply context filters if provided
      if (context.weather) {
        query = query.contains('context_data', { weather: context.weather });
      }

      const { count, error } = await query;

      if (error) {
        console.error("[AchievementService] Error getting action count:", error);
        return 0;
      }

      return count || 0;

    } catch (error) {
      console.error("[AchievementService] Exception in getActionCount:", error);
      return 0;
    }
  }

  /**
   * Get unique count of actions (e.g., unique plants, unique friends)
   * @param userId - The user's UUID
   * @param actionType - The action type
   * @param context - Additional context
   * @returns Promise<number>
   */
  private static async getUniqueActionCount(
    userId: string,
    actionType: string,
    context: Record<string, any>
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('context_data')
        .eq('user_id', userId)
        .eq('action_type', actionType);

      if (error) {
        console.error("[AchievementService] Error getting unique action count:", error);
        return 0;
      }

      if (!data) return 0;

      // Extract unique values based on context
      const uniqueValues = new Set();
      
      data.forEach(transaction => {
        if (transaction.context_data) {
          if (context.unique_plants && transaction.context_data.plantId) {
            uniqueValues.add(transaction.context_data.plantId);
          } else if (context.friend_gardens && transaction.context_data.friendId) {
            uniqueValues.add(transaction.context_data.friendId);
          }
        }
      });

      return uniqueValues.size;

    } catch (error) {
      console.error("[AchievementService] Exception in getUniqueActionCount:", error);
      return 0;
    }
  }

  /**
   * Get current streak for an action
   * @param userId - The user's UUID
   * @param actionType - The action type
   * @returns Promise<number>
   */
  private static async getActionStreak(
    userId: string,
    actionType: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('created_at')
        .eq('user_id', userId)
        .eq('action_type', actionType)
        .order('created_at', { ascending: false });

      if (error || !data) {
        return 0;
      }

      // Calculate streak logic here
      // For now, return the total count as a simple implementation
      return data.length;

    } catch (error) {
      console.error("[AchievementService] Exception in getActionStreak:", error);
      return 0;
    }
  }

  /**
   * Get progress for combination achievements
   * @param userId - The user's UUID
   * @param requirements - Achievement requirements
   * @param context - Action context
   * @returns Promise<number>
   */
  private static async getCombinationProgress(
    userId: string,
    requirements: AchievementRequirement,
    context: Record<string, any>
  ): Promise<number> {
    // This will be implemented for complex achievements
    // For now, return 0
    return 0;
  }

  /**
   * Get achievements by category
   * @param category - The achievement category
   * @returns Promise<Achievement[]>
   */
  static async getAchievementsByCategory(category: string): Promise<Achievement[]> {
    try {
      return Object.values(this.ACHIEVEMENTS).filter(
        achievement => achievement.category === category
      );
    } catch (error) {
      console.error("[AchievementService] Exception in getAchievementsByCategory:", error);
      return [];
    }
  }

  /**
   * Get user's achievement statistics
   * @param userId - The user's UUID
   * @returns Promise<Record<string, number>>
   */
  static async getAchievementStatistics(userId: string): Promise<Record<string, number>> {
    try {
      const userAchievements = await this.getUserAchievements(userId);
      const allAchievements = await this.getAllAchievements();

      const stats: Record<string, number> = {
        total: allAchievements.length,
        unlocked: userAchievements.length,
        remaining: allAchievements.length - userAchievements.length,
        completion_percentage: Math.round((userAchievements.length / allAchievements.length) * 100)
      };

      // Add category breakdown
      const categories = ['daily', 'milestones', 'weather', 'social', 'collection'];
      categories.forEach(category => {
        const categoryAchievements = allAchievements.filter(a => a.category === category);
        const unlockedInCategory = userAchievements.filter(ua => 
          categoryAchievements.some(a => a.id === ua.achievement_id)
        ).length;
        
        stats[`${category}_total`] = categoryAchievements.length;
        stats[`${category}_unlocked`] = unlockedInCategory;
      });

      return stats;

    } catch (error) {
      console.error("[AchievementService] Exception in getAchievementStatistics:", error);
      return {};
    }
  }
}

export default AchievementService; 