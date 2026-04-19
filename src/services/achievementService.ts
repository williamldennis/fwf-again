import { pb } from "../utils/pocketbase";
import { XPService } from "./xpService";
import { areWeatherConditionsEquivalent } from "../utils/weatherUtils";

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
  user: string;
  achievement_id: string;
  unlocked_at: string;
  progress_data: Record<string, any>;
  created: string;
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
  // Achievement definitions
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
        const shouldCheckAchievement =
          achievement.requirements.action === actionType ||
          (achievement.category === 'social' && actionType === 'social_planting');

        if (shouldCheckAchievement) {
          const progress = await this.calculateAchievementProgress(
            userId,
            achievement,
            context
          );

          result.progress.push(progress);

          // Check if achievement should be unlocked
          if (!unlockedAchievementIds.has(achievementId) && progress.isUnlocked) {
            console.log(`[AchievementService] Unlocking achievement ${achievementId}`);
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
   */
  static async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      if (!userId) {
        console.error("[AchievementService] No userId provided for getUserAchievements");
        return [];
      }

      const result = await pb.collection('user_achievements').getFullList({
        filter: `user = "${userId}"`,
        sort: '-unlocked_at'
      });

      return result.map(item => ({
        id: item.id,
        user: item.user,
        achievement_id: item.achievement_id,
        unlocked_at: item.unlocked_at,
        progress_data: item.progress_data || {},
        created: item.created
      }));

    } catch (error) {
      console.error("[AchievementService] Exception in getUserAchievements:", error);
      return [];
    }
  }

  /**
   * Get all available achievements
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

      // Find existing achievement record
      const existing = await pb.collection('user_achievements').getList(1, 1, {
        filter: `user = "${userId}" && achievement_id = "${achievementId}"`
      });

      if (existing.items.length > 0) {
        await pb.collection('user_achievements').update(existing.items[0].id, {
          progress_data: progress
        });
        return true;
      }

      return false;

    } catch (error) {
      console.error("[AchievementService] Exception in updateProgress:", error);
      return false;
    }
  }

  /**
   * Check if user has unlocked a specific achievement
   */
  static async hasAchievement(userId: string, achievementId: string): Promise<boolean> {
    try {
      if (!userId || !achievementId) {
        return false;
      }

      const result = await pb.collection('user_achievements').getList(1, 1, {
        filter: `user = "${userId}" && achievement_id = "${achievementId}"`
      });

      return result.totalItems > 0;

    } catch (error) {
      console.error("[AchievementService] Exception in hasAchievement:", error);
      return false;
    }
  }

  /**
   * Unlock an achievement for a user
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

      await pb.collection('user_achievements').create({
        user: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString(),
        progress_data: { progress: progress.currentProgress }
      });

      return true;

    } catch (error) {
      console.error("[AchievementService] Exception in unlockAchievement:", error);
      return false;
    }
  }

  /**
   * Calculate progress for a specific achievement
   */
  static async calculateAchievementProgress(
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
          const countMergedContext = {
            ...context,
            ...achievement.requirements.conditions
          };
          currentProgress = await this.getActionCount(userId, achievement.requirements.action, countMergedContext);
          break;

        case 'unique':
          const uniqueMergedContext = {
            ...context,
            ...achievement.requirements.conditions
          };

          if (achievement.category === 'social' || uniqueMergedContext.friend_garden || uniqueMergedContext.friend_gardens) {
            currentProgress = await this.getUniqueFriendGardenCount(userId, achievement.requirements.action, uniqueMergedContext);
          } else if (achievement.category === 'collection' || uniqueMergedContext.unique_plants) {
            currentProgress = await this.getUniquePlantCount(userId, achievement.requirements.action);
          } else {
            currentProgress = await this.getUniqueActionCount(userId, achievement.requirements.action, uniqueMergedContext);
          }
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
   */
  private static async getActionCount(
    userId: string,
    actionType: string,
    context: Record<string, any>
  ): Promise<number> {
    try {
      // For weather achievements, filter by stored weather conditions
      if (context.weather) {
        const result = await pb.collection('xp_transactions').getFullList({
          filter: `user = "${userId}" && action_type = "${actionType}"`
        });

        let weatherMatchCount = 0;
        result.forEach(transaction => {
          if (transaction.context_data && transaction.context_data.weather_condition) {
            const storedWeather = transaction.context_data.weather_condition;
            const requiredWeather = context.weather;

            if (areWeatherConditionsEquivalent(storedWeather, requiredWeather)) {
              weatherMatchCount++;
            }
          }
        });

        return weatherMatchCount;
      }

      // For non-weather achievements, use simple count
      const result = await pb.collection('xp_transactions').getList(1, 1, {
        filter: `user = "${userId}" && action_type = "${actionType}"`
      });

      let count = result.totalItems;

      // For social achievements, check if current action qualifies
      if ((context.friend_garden || context.friend_gardens) && context.garden_owner_id) {
        if (context.garden_owner_id !== userId) {
          count += 1;
        }
      }

      return count;

    } catch (error) {
      console.error("[AchievementService] Exception in getActionCount:", error);
      return 0;
    }
  }

  /**
   * Get unique count of plants planted (for collection achievements)
   */
  private static async getUniquePlantCount(
    userId: string,
    actionType: string
  ): Promise<number> {
    try {
      const result = await pb.collection('xp_transactions').getFullList({
        filter: `user = "${userId}" && action_type = "${actionType}"`
      });

      const uniquePlants = new Set();
      result.forEach(transaction => {
        if (transaction.context_data) {
          const plantId = transaction.context_data.plantId || transaction.context_data.plant_id;
          if (plantId) {
            uniquePlants.add(plantId);
          }
        }
      });

      return uniquePlants.size;

    } catch (error) {
      console.error("[AchievementService] Exception in getUniquePlantCount:", error);
      return 0;
    }
  }

  /**
   * Get unique count of friend gardens visited (for social achievements)
   */
  private static async getUniqueFriendGardenCount(
    userId: string,
    actionType: string,
    context: Record<string, any>
  ): Promise<number> {
    try {
      // Query for both plant_seed and social_planting actions
      const result = await pb.collection('xp_transactions').getFullList({
        filter: `user = "${userId}" && (action_type = "plant_seed" || action_type = "social_planting")`
      });

      const uniqueFriendGardens = new Set();

      result.forEach(transaction => {
        if (transaction.context_data && transaction.context_data.garden_owner_id) {
          const gardenOwnerId = transaction.context_data.garden_owner_id;
          if (gardenOwnerId !== userId) {
            uniqueFriendGardens.add(gardenOwnerId);
          }
        }
      });

      // Check if current action qualifies
      if (context.garden_owner_id && context.garden_owner_id !== userId) {
        uniqueFriendGardens.add(context.garden_owner_id);
      }

      return uniqueFriendGardens.size;

    } catch (error) {
      console.error("[AchievementService] Exception in getUniqueFriendGardenCount:", error);
      return 0;
    }
  }

  /**
   * Get unique count of actions
   */
  private static async getUniqueActionCount(
    userId: string,
    actionType: string,
    context: Record<string, any>
  ): Promise<number> {
    try {
      if (context.unique_plants) {
        return await this.getUniquePlantCount(userId, actionType);
      }

      if (context.friend_garden || context.friend_gardens) {
        return await this.getUniqueFriendGardenCount(userId, actionType, context);
      }

      const result = await pb.collection('xp_transactions').getFullList({
        filter: `user = "${userId}" && action_type = "${actionType}"`
      });

      return result.length;

    } catch (error) {
      console.error("[AchievementService] Exception in getUniqueActionCount:", error);
      return 0;
    }
  }

  /**
   * Get current streak for an action
   */
  private static async getActionStreak(
    userId: string,
    actionType: string
  ): Promise<number> {
    try {
      const result = await pb.collection('xp_transactions').getFullList({
        filter: `user = "${userId}" && action_type = "${actionType}"`,
        sort: '-created'
      });

      if (!result || result.length === 0) {
        return 0;
      }

      // Calculate consecutive day streak
      let currentStreak = 0;
      const today = new Date();
      const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

      // Group transactions by day
      const transactionsByDay = new Map<string, boolean>();
      result.forEach(transaction => {
        const transactionDate = new Date(transaction.created);
        const dayKey = transactionDate.toISOString().split('T')[0];
        transactionsByDay.set(dayKey, true);
      });

      // Check consecutive days starting from today
      let checkDate = new Date(todayStart);
      while (true) {
        const dayKey = checkDate.toISOString().split('T')[0];

        if (transactionsByDay.has(dayKey)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      return currentStreak;

    } catch (error) {
      console.error("[AchievementService] Exception in getActionStreak:", error);
      return 0;
    }
  }

  /**
   * Get progress for combination achievements
   */
  private static async getCombinationProgress(
    userId: string,
    requirements: AchievementRequirement,
    context: Record<string, any>
  ): Promise<number> {
    return 0;
  }

  /**
   * Get achievements by category
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
   * Get achievement details by IDs
   */
  static getAchievementsByIds(achievementIds: string[]): Achievement[] {
    try {
      return achievementIds
        .map(id => this.ACHIEVEMENTS[id])
        .filter(achievement => achievement !== undefined);
    } catch (error) {
      console.error("[AchievementService] Exception in getAchievementsByIds:", error);
      return [];
    }
  }

  /**
   * Get user's achievement statistics
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
