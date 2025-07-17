import { supabase } from "../utils/supabase";

// Types for XP system
export interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  action_type: string;
  description: string;
  context_data: Record<string, any>;
  created_at: string;
}

export interface UserXPSummary {
  total_xp: number;
  current_level: number;
  xp_to_next_level: number;
  xp_progress: number;
}

export interface XPAwardResult {
  success: boolean;
  newTotalXP?: number;
  newLevel?: number;
  leveledUp?: boolean;
  error?: string;
}

export class XPService {
  /**
   * Award XP to a user and update their profile
   * @param userId - The user's UUID
   * @param amount - Amount of XP to award
   * @param actionType - Type of action that earned XP (e.g., 'plant_seed', 'harvest_plant')
   * @param description - Human-readable description of the action
   * @param context - Additional context data (optional)
   * @returns Promise<XPAwardResult>
   */
  static async awardXP(
    userId: string,
    amount: number,
    actionType: string,
    description: string,
    context: Record<string, any> = {}
  ): Promise<XPAwardResult> {
    try {
      // Validate inputs
      if (!userId || !amount || amount <= 0 || !actionType || !description) {
        return {
          success: false,
          error: "Invalid parameters for XP award"
        };
      }

      // Call the database function to award XP
      const { data, error } = await supabase.rpc('award_xp', {
        user_uuid: userId,
        xp_amount: amount,
        action_type: actionType,
        description: description,
        context_data: context
      });

      if (error) {
        console.error("[XPService] Error awarding XP:", error);
        return {
          success: false,
          error: error.message
        };
      }

      // Get the updated user XP summary to check for level up
      const summary = await this.getUserXP(userId);
      if (!summary) {
        return {
          success: false,
          error: "Failed to retrieve updated XP summary"
        };
      }

      // Check if user leveled up by comparing with previous level
      const previousSummary = await this.getUserXP(userId);
      const leveledUp = previousSummary ? summary.current_level > previousSummary.current_level : false;

      return {
        success: true,
        newTotalXP: summary.total_xp,
        newLevel: summary.current_level,
        leveledUp: leveledUp
      };

    } catch (error) {
      console.error("[XPService] Exception in awardXP:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get user's XP summary including level and progress
   * @param userId - The user's UUID
   * @returns Promise<UserXPSummary | null>
   */
  static async getUserXP(userId: string): Promise<UserXPSummary | null> {
    try {
      if (!userId) {
        console.error("[XPService] No userId provided for getUserXP");
        return null;
      }

      // Call the database function to get XP summary
      const { data, error } = await supabase.rpc('get_user_xp_summary', {
        user_uuid: userId
      });

      if (error) {
        console.error("[XPService] Error getting user XP:", error);
        return null;
      }

      if (!data || data.length === 0) {
        console.warn("[XPService] No XP data found for user:", userId);
        return null;
      }

      const summary = data[0];
      return {
        total_xp: summary.total_xp || 0,
        current_level: summary.current_level || 1,
        xp_to_next_level: summary.xp_to_next_level || 100,
        xp_progress: summary.xp_progress || 0
      };

    } catch (error) {
      console.error("[XPService] Exception in getUserXP:", error);
      return null;
    }
  }

  /**
   * Calculate level from total XP
   * @param totalXP - Total XP amount
   * @returns Promise<number>
   */
  static async calculateLevel(totalXP: number): Promise<number> {
    try {
      if (totalXP < 0) return 1;

      const { data, error } = await supabase.rpc('calculate_level_from_xp', {
        total_xp: totalXP
      });

      if (error) {
        console.error("[XPService] Error calculating level:", error);
        return 1;
      }

      return data || 1;

    } catch (error) {
      console.error("[XPService] Exception in calculateLevel:", error);
      return 1;
    }
  }

  /**
   * Get XP required to reach next level
   * @param currentLevel - Current user level
   * @returns Promise<number>
   */
  static async getXPToNextLevel(currentLevel: number): Promise<number> {
    try {
      if (currentLevel < 1 || currentLevel > 50) return 0;

      const { data, error } = await supabase.rpc('calculate_xp_to_next_level', {
        current_level: currentLevel
      });

      if (error) {
        console.error("[XPService] Error getting XP to next level:", error);
        return 100;
      }

      return data || 100;

    } catch (error) {
      console.error("[XPService] Exception in getXPToNextLevel:", error);
      return 100;
    }
  }

  /**
   * Get user's XP transaction history
   * @param userId - The user's UUID
   * @param limit - Number of transactions to return (default: 50)
   * @param offset - Number of transactions to skip (default: 0)
   * @returns Promise<XPTransaction[]>
   */
  static async getXPHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<XPTransaction[]> {
    try {
      if (!userId) {
        console.error("[XPService] No userId provided for getXPHistory");
        return [];
      }

      const { data, error } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("[XPService] Error getting XP history:", error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error("[XPService] Exception in getXPHistory:", error);
      return [];
    }
  }

  /**
   * Get total XP earned for a specific action type
   * @param userId - The user's UUID
   * @param actionType - Type of action to sum
   * @returns Promise<number>
   */
  static async getTotalXPForAction(userId: string, actionType: string): Promise<number> {
    try {
      if (!userId || !actionType) {
        return 0;
      }

      const { data, error } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('action_type', actionType);

      if (error) {
        console.error("[XPService] Error getting total XP for action:", error);
        return 0;
      }

      return data?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;

    } catch (error) {
      console.error("[XPService] Exception in getTotalXPForAction:", error);
      return 0;
    }
  }

  /**
   * Get user's XP statistics
   * @param userId - The user's UUID
   * @returns Promise<Record<string, number>>
   */
  static async getXPStatistics(userId: string): Promise<Record<string, number>> {
    try {
      if (!userId) {
        return {};
      }

      const { data, error } = await supabase
        .from('xp_transactions')
        .select('action_type, amount')
        .eq('user_id', userId);

      if (error) {
        console.error("[XPService] Error getting XP statistics:", error);
        return {};
      }

      const stats: Record<string, number> = {};
      data?.forEach(transaction => {
        if (!stats[transaction.action_type]) {
          stats[transaction.action_type] = 0;
        }
        stats[transaction.action_type] += transaction.amount;
      });

      return stats;

    } catch (error) {
      console.error("[XPService] Exception in getXPStatistics:", error);
      return {};
    }
  }

  /**
   * Check if user can receive daily XP (hasn't received it today)
   * @param userId - The user's UUID
   * @returns Promise<boolean>
   */
  static async canReceiveDailyXP(userId: string): Promise<boolean> {
    try {
      if (!userId) return false;

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('xp_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('action_type', 'daily_use')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .limit(1);

      if (error) {
        console.error("[XPService] Error checking daily XP eligibility:", error);
        return false;
      }

      // Return true if no daily XP transaction found today
      return !data || data.length === 0;

    } catch (error) {
      console.error("[XPService] Exception in canReceiveDailyXP:", error);
      return false;
    }
  }

  /**
   * Award daily XP to user (if eligible)
   * @param userId - The user's UUID
   * @returns Promise<XPAwardResult>
   */
  static async awardDailyXP(userId: string): Promise<XPAwardResult> {
    try {
      if (!userId) {
        return {
          success: false,
          error: "No userId provided"
        };
      }

      // Check if user already received daily XP today
      const canReceive = await this.canReceiveDailyXP(userId);
      if (!canReceive) {
        return {
          success: false,
          error: "Daily XP already awarded today"
        };
      }

      // Award daily XP
      return await this.awardXP(
        userId,
        5, // Daily XP amount
        'daily_use',
        'Daily app usage reward',
        { date: new Date().toISOString().split('T')[0] }
      );

    } catch (error) {
      console.error("[XPService] Exception in awardDailyXP:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get level benefits for a specific level
   * @param level - The level to get benefits for
   * @returns Promise<Record<string, any>>
   */
  static async getLevelBenefits(level: number): Promise<Record<string, any>> {
    // This will be expanded in future tasks
    // For now, return basic level information
    const benefits: Record<string, any> = {
      level: level,
      description: `Level ${level} benefits`,
      unlocked_features: []
    };

    // Add specific benefits based on level
    if (level >= 5) {
      benefits.unlocked_features.push('4 planting slots');
    }
    if (level >= 10) {
      benefits.unlocked_features.push('5 planting slots');
    }
    if (level >= 15) {
      benefits.unlocked_features.push('Premium plants');
    }
    if (level >= 20) {
      benefits.unlocked_features.push('Garden themes');
    }
    if (level >= 25) {
      benefits.unlocked_features.push('Plant boosters');
    }
    if (level >= 30) {
      benefits.unlocked_features.push('Special events');
    }
    if (level >= 35) {
      benefits.unlocked_features.push('Garden sharing');
    }
    if (level >= 40) {
      benefits.unlocked_features.push('Weather control');
    }
    if (level >= 45) {
      benefits.unlocked_features.push('Plant breeding');
    }
    if (level >= 50) {
      benefits.unlocked_features.push('Master Gardener status');
    }

    return benefits;
  }
}

export default XPService; 