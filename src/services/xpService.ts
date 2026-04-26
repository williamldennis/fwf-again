import { pb } from "../utils/pocketbase";

// Types for XP system
export interface XPTransaction {
  id: string;
  user: string;
  amount: number;
  action_type: string;
  description: string;
  context_data: Record<string, any>;
  created: string;
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

// XP thresholds per level (from XP_LEVELS_SPEC.md)
const XP_THRESHOLDS = [
  0,     // Level 1
  100,   // Level 2
  250,   // Level 3
  450,   // Level 4
  700,   // Level 5
  1000,  // Level 6
  1350,  // Level 7
  1750,  // Level 8
  2200,  // Level 9
  2700,  // Level 10
  3300,  // Level 11
  4000,  // Level 12
  4800,  // Level 13
  5700,  // Level 14
  6700,  // Level 15
  7800,  // Level 16
  9000,  // Level 17
  10300, // Level 18
  11700, // Level 19
  13200, // Level 20
  14800, // Level 21
  16500, // Level 22
  18300, // Level 23
  20200, // Level 24
  22200, // Level 25
  24300, // Level 26
  26500, // Level 27
  28800, // Level 28
  31200, // Level 29
  33700, // Level 30
  36300, // Level 31
  39000, // Level 32
  41800, // Level 33
  44700, // Level 34
  47700, // Level 35
  50800, // Level 36
  54000, // Level 37
  57300, // Level 38
  60700, // Level 39
  64200, // Level 40
  67800, // Level 41
  71500, // Level 42
  75300, // Level 43
  79200, // Level 44
  83200, // Level 45
  87300, // Level 46
  91500, // Level 47
  95800, // Level 48
  100200, // Level 49
  104700, // Level 50 (max)
];

export class XPService {
  /**
   * Calculate level from total XP (client-side pure function)
   */
  static calculateLevelFromXP(totalXP: number): number {
    if (totalXP < 0) return 1;

    for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalXP >= XP_THRESHOLDS[i]) {
        return Math.min(i + 1, 50);
      }
    }
    return 1;
  }

  /**
   * Calculate XP needed to reach next level (client-side pure function)
   */
  static calculateXPToNextLevel(currentLevel: number): number {
    if (currentLevel >= 50) return 0;
    if (currentLevel < 1) return XP_THRESHOLDS[1];

    const nextLevelIndex = Math.min(currentLevel, XP_THRESHOLDS.length - 1);
    const currentLevelIndex = currentLevel - 1;

    return XP_THRESHOLDS[nextLevelIndex] - XP_THRESHOLDS[currentLevelIndex];
  }

  /**
   * Award XP to a user and update their profile
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

      // Get current user XP
      const user = await pb.collection('users').getOne(userId);
      const previousLevel = user.current_level || 1;
      const previousXP = user.total_xp || 0;
      const newTotalXP = previousXP + amount;

      // Calculate new level
      const newLevel = this.calculateLevelFromXP(newTotalXP);
      const xpToNextLevel = this.calculateXPToNextLevel(newLevel);

      // Insert XP transaction
      await pb.collection('xp_transactions').create({
        user: userId,
        amount,
        action_type: actionType,
        description,
        context_data: context
      });

      // Update user profile
      await pb.collection('users').update(userId, {
        total_xp: newTotalXP,
        current_level: newLevel,
        xp_to_next_level: xpToNextLevel
      });

      return {
        success: true,
        newTotalXP,
        newLevel,
        leveledUp: newLevel > previousLevel
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
   */
  static async getUserXP(userId: string): Promise<UserXPSummary | null> {
    try {
      if (!userId) {
        console.error("[XPService] No userId provided for getUserXP");
        return null;
      }

      const user = await pb.collection('users').getOne(userId);

      const totalXP = user.total_xp || 0;
      const currentLevel = user.current_level || 1;
      const xpToNextLevel = user.xp_to_next_level || 100;

      // Calculate progress percentage
      const currentLevelXP = XP_THRESHOLDS[currentLevel - 1] || 0;
      const nextLevelXP = XP_THRESHOLDS[currentLevel] || currentLevelXP + 100;
      const xpInCurrentLevel = totalXP - currentLevelXP;
      const xpNeededForLevel = nextLevelXP - currentLevelXP;
      const xpProgress = xpNeededForLevel > 0
        ? Math.min(100, Math.round((xpInCurrentLevel / xpNeededForLevel) * 100))
        : 100;

      return {
        total_xp: totalXP,
        current_level: currentLevel,
        xp_to_next_level: xpToNextLevel,
        xp_progress: xpProgress
      };

    } catch (error) {
      console.error("[XPService] Exception in getUserXP:", error);
      return null;
    }
  }

  /**
   * Calculate level from total XP (async wrapper for compatibility)
   */
  static async calculateLevel(totalXP: number): Promise<number> {
    return this.calculateLevelFromXP(totalXP);
  }

  /**
   * Get XP required to reach next level (async wrapper for compatibility)
   */
  static async getXPToNextLevel(currentLevel: number): Promise<number> {
    return this.calculateXPToNextLevel(currentLevel);
  }

  /**
   * Get user's XP transaction history
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

      // Use native fetch to bypass PocketBase SDK issues in React Native
      const url = 'https://fwf-pocketbase-production.up.railway.app/api/collections/xp_transactions/records?perPage=200';
      console.log('[XPService] 🔍 Fetching XP history URL:', url);

      const response = await fetch(url);

      console.log('[XPService] 📡 getXPHistory response status:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[XPService] ❌ getXPHistory fetch failed:", response.status, errorText);
        return [];
      }

      const data = await response.json();
      const allTransactions = data.items || [];

      // Sort by created date descending in JS
      const sortedTransactions = allTransactions.sort((a: any, b: any) =>
        new Date(b.created).getTime() - new Date(a.created).getTime()
      );

      // Filter for this user
      const userTransactions = sortedTransactions.filter((item: any) => item.user === userId);

      // Apply pagination
      const startIdx = offset;
      const endIdx = Math.min(startIdx + limit, userTransactions.length);
      const paginatedTransactions = userTransactions.slice(startIdx, endIdx);

      return paginatedTransactions.map((item: any) => ({
        id: item.id,
        user: item.user,
        amount: item.amount,
        action_type: item.action_type,
        description: item.description,
        context_data: item.context_data || {},
        created: item.created
      }));

    } catch (error) {
      console.error("[XPService] Exception in getXPHistory:", error);
      return [];
    }
  }

  /**
   * Get total XP earned for a specific action type
   */
  static async getTotalXPForAction(userId: string, actionType: string): Promise<number> {
    try {
      if (!userId || !actionType) {
        return 0;
      }

      // Use native fetch to bypass PocketBase SDK issues in React Native
      const url = 'https://fwf-pocketbase-production.up.railway.app/api/collections/xp_transactions/records?perPage=200';
      console.log('[XPService] 🔍 Fetching XP for action URL:', url);

      const response = await fetch(url);

      console.log('[XPService] 📡 getTotalXPForAction response status:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[XPService] ❌ getTotalXPForAction fetch failed:", response.status, errorText);
        return 0;
      }

      const data = await response.json();
      const allTransactions = data.items || [];

      // Filter for this user and action type
      const result = allTransactions.filter(
        (item: any) => item.user === userId && item.action_type === actionType
      );

      return result.reduce((sum: number, transaction: any) => sum + (transaction.amount || 0), 0);

    } catch (error) {
      console.error("[XPService] Exception in getTotalXPForAction:", error);
      return 0;
    }
  }

  /**
   * Get user's XP statistics
   */
  static async getXPStatistics(userId: string): Promise<Record<string, number>> {
    try {
      if (!userId) {
        return {};
      }

      // Use native fetch to bypass PocketBase SDK issues in React Native
      const url = 'https://fwf-pocketbase-production.up.railway.app/api/collections/xp_transactions/records?perPage=200';
      console.log('[XPService] 🔍 Fetching XP statistics URL:', url);

      const response = await fetch(url);

      console.log('[XPService] 📡 getXPStatistics response status:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[XPService] ❌ getXPStatistics fetch failed:", response.status, errorText);
        return {};
      }

      const data = await response.json();
      const allTransactions = data.items || [];

      // Filter for this user
      const result = allTransactions.filter((item: any) => item.user === userId);

      const stats: Record<string, number> = {};
      result.forEach((transaction: any) => {
        const actionType = transaction.action_type;
        if (!stats[actionType]) {
          stats[actionType] = 0;
        }
        stats[actionType] += transaction.amount || 0;
      });

      return stats;

    } catch (error) {
      console.error("[XPService] Exception in getXPStatistics:", error);
      return {};
    }
  }

  /**
   * Check if user can receive daily XP (hasn't received it today)
   */
  static async canReceiveDailyXP(userId: string): Promise<boolean> {
    try {
      if (!userId) return false;

      // Use native fetch to bypass PocketBase SDK issues in React Native
      // Hardcode URL for testing
      const url = 'https://fwf-pocketbase-production.up.railway.app/api/collections/xp_transactions/records?perPage=100';
      console.log('[XPService] 🔍 Fetching URL:', url);

      const response = await fetch(url);

      console.log('[XPService] 📡 Response status:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[XPService] ❌ Fetch failed:", response.status, errorText);
        return false;
      }

      const data = await response.json();
      console.log('[XPService] ✅ Data received, items count:', data.items?.length || 0);
      const items = data.items || [];

      // Filter for this user's daily_use transactions in JS
      const userDailyTransactions = items.filter(
        (item: any) => item.user === userId && item.action_type === 'daily_use'
      );

      if (userDailyTransactions.length === 0) {
        return true; // No daily XP transactions ever
      }

      // Check if any transaction is from today
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const hasTodayTransaction = userDailyTransactions.some((item: any) => {
        const transactionDate = new Date(item.created);
        return transactionDate >= todayStart && transactionDate <= todayEnd;
      });

      // Return true if no daily XP transaction found today
      return !hasTodayTransaction;

    } catch (error) {
      console.error("[XPService] Exception in canReceiveDailyXP:", error);
      return false;
    }
  }

  /**
   * Award daily XP to user (if eligible)
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
   */
  static async getLevelBenefits(level: number): Promise<Record<string, any>> {
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
