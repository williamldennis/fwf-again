import { pb } from "../utils/pocketbase";

export interface GardenActivity {
  id: string;
  garden_owner: string;
  actor: string;
  activity_type: 'planted' | 'harvested';
  plant: string;
  planted_plant?: string;
  plant_name: string;
  actor_name: string;
  garden_owner_name?: string;
  created: string;
}

export interface ActivityLogResponse {
  success: boolean;
  activities?: GardenActivity[];
  error?: string;
  hasMore?: boolean;
}

// Store active subscriptions for cleanup
const activeSubscriptions: Map<string, () => void> = new Map();

export class ActivityService {
  /**
   * Log a garden activity
   */
  static async logActivity(
    gardenOwnerId: string,
    actorId: string,
    activityType: 'planted' | 'harvested',
    plantId: string,
    plantName: string,
    actorName: string,
    plantedPlantId?: string
  ): Promise<boolean> {
    try {
      console.log(`[ActivityService] Logging ${activityType} activity:`, {
        gardenOwnerId,
        actorId,
        plantName,
        actorName,
      });

      await pb.collection('garden_activities').create({
        garden_owner: gardenOwnerId,
        actor: actorId,
        activity_type: activityType,
        plant: plantId,
        plant_name: plantName,
        actor_name: actorName,
        planted_plant: plantedPlantId || null,
      });

      console.log(`[ActivityService] Activity logged successfully: ${activityType}`);
      return true;
    } catch (error) {
      console.error('[ActivityService] Exception logging activity:', error);
      return false;
    }
  }

  static async getLatestActivityTimestamp(gardenOwnerId: string): Promise<string | null> {
    try {
      console.log(`[ActivityService] Fetching latest activity timestamp for garden:`, {
        gardenOwnerId,
      });

      const result = await pb.collection('garden_activities').getList(1, 1, {
        filter: `garden_owner = "${gardenOwnerId}" && actor != "${gardenOwnerId}"`,
        sort: '-created',
      });

      if (result.items.length === 0) {
        console.log(`[ActivityService] No activities found for user ${gardenOwnerId}`);
        return null;
      }

      const timestamp = result.items[0].created;
      console.log(`[ActivityService] Latest activity timestamp fetched:`, timestamp);
      return timestamp;
    } catch (error) {
      console.error('[ActivityService] Exception fetching latest activity timestamp:', error);
      return null;
    }
  }

  static async setLastCheckedActivityAt(userId: string): Promise<void> {
    try {
      console.log(`[ActivityService] Setting last_checked_activity_at for user: ${userId}`);

      await pb.collection('users').update(userId, {
        last_checked_activity_at: new Date().toISOString()
      });

      console.log(`[ActivityService] last_checked_activity_at set successfully for user: ${userId}`);
    } catch (error) {
      console.error('[ActivityService] Exception setting last_checked_activity_at:', error);
      throw error;
    }
  }

  /**
   * Get activities for a user's garden with pagination
   */
  static async getGardenActivities(
    gardenOwnerId: string,
    page: number = 0,
    limit: number = 25
  ): Promise<ActivityLogResponse> {
    try {
      console.log(`[ActivityService] Fetching activities for garden:`, {
        gardenOwnerId,
        page,
        limit,
      });

      // PocketBase uses 1-based pagination
      const pbPage = page + 1;

      // Fetch activities where user is garden owner OR actor
      const result = await pb.collection('garden_activities').getList(pbPage, limit, {
        filter: `garden_owner = "${gardenOwnerId}" || actor = "${gardenOwnerId}"`,
        sort: '-created',
      });

      if (result.items.length === 0) {
        return {
          success: true,
          activities: [],
          hasMore: false,
        };
      }

      // Get unique garden owner IDs (for activities in friend's gardens)
      const gardenOwnerIds = [...new Set(result.items.map(a => a.garden_owner))];

      // Fetch garden owner names from users collection
      let gardenOwnerNames = new Map<string, string>();

      if (gardenOwnerIds.length > 0) {
        try {
          // Build filter for multiple IDs
          const idFilters = gardenOwnerIds.map(id => `id = "${id}"`).join(' || ');
          const users = await pb.collection('users').getFullList({
            filter: idFilters,
          });

          users.forEach(user => {
            gardenOwnerNames.set(user.id, user.full_name || 'Unknown');
          });
        } catch (profilesError) {
          console.error('[ActivityService] Error fetching profiles:', profilesError);
          // Continue without garden owner names
        }
      }

      // Map activities to expected format
      const activities: GardenActivity[] = result.items.map(item => ({
        id: item.id,
        garden_owner: item.garden_owner,
        actor: item.actor,
        activity_type: item.activity_type,
        plant: item.plant,
        planted_plant: item.planted_plant,
        plant_name: item.plant_name,
        actor_name: item.actor_name,
        garden_owner_name: gardenOwnerNames.get(item.garden_owner) || 'Unknown',
        created: item.created,
      }));

      const hasMore = result.totalPages > pbPage;

      console.log(`[ActivityService] Fetched ${activities.length} activities, hasMore: ${hasMore}`);

      return {
        success: true,
        activities,
        hasMore,
      };
    } catch (error) {
      console.error('[ActivityService] Exception fetching activities:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Subscribe to real-time activity updates
   */
  static subscribeToActivities(
    gardenOwnerId: string,
    onActivity: (activity: GardenActivity) => void
  ) {
    console.log(`[ActivityService] Subscribing to activities for user: ${gardenOwnerId}`);

    // Unsubscribe from any existing subscription for this user
    this.unsubscribeFromActivities(gardenOwnerId);

    // Subscribe to all changes on garden_activities
    // PocketBase doesn't support filter-based subscriptions like Supabase,
    // so we filter on the client side
    pb.collection('garden_activities').subscribe('*', (e) => {
      if (e.action === 'create') {
        const record = e.record;

        // Filter: only process if this affects the user's garden or they're the actor
        if (record.garden_owner === gardenOwnerId || record.actor === gardenOwnerId) {
          console.log('[ActivityService] New activity received:', record);

          const activity: GardenActivity = {
            id: record.id,
            garden_owner: record.garden_owner,
            actor: record.actor,
            activity_type: record.activity_type,
            plant: record.plant,
            planted_plant: record.planted_plant,
            plant_name: record.plant_name,
            actor_name: record.actor_name,
            created: record.created,
          };

          onActivity(activity);
        }
      }
    });

    // Store the cleanup function
    activeSubscriptions.set(gardenOwnerId, () => {
      pb.collection('garden_activities').unsubscribe('*');
    });

    // Return a subscription-like object for compatibility
    return {
      unsubscribe: () => this.unsubscribeFromActivities(gardenOwnerId)
    };
  }

  /**
   * Unsubscribe from real-time updates
   */
  static unsubscribeFromActivities(gardenOwnerId: string) {
    console.log(`[ActivityService] Unsubscribing from activities for garden: ${gardenOwnerId}`);

    const cleanup = activeSubscriptions.get(gardenOwnerId);
    if (cleanup) {
      cleanup();
      activeSubscriptions.delete(gardenOwnerId);
    }
  }
}
