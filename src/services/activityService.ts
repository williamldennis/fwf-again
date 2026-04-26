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

      // Use native fetch to bypass PocketBase SDK issues in React Native
      // Hardcode URL for testing
      const url = 'https://fwf-pocketbase-production.up.railway.app/api/collections/garden_activities/records?perPage=50';
      console.log('[ActivityService] 🔍 Fetching URL:', url);

      // Note: These collections are public, no auth needed
      const response = await fetch(url);

      console.log('[ActivityService] 📡 Response status:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ActivityService] ❌ Fetch failed:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      console.log('[ActivityService] ✅ Data received, items count:', data.items?.length || 0);

      // Sort in JS instead
      const items = (data.items || []).sort((a: any, b: any) =>
        new Date(b.created).getTime() - new Date(a.created).getTime()
      );

      // Filter in JavaScript for this garden owner, excluding self-actions
      const relevantActivities = items.filter(
        (item: any) => item.garden_owner === gardenOwnerId && item.actor !== gardenOwnerId
      );

      if (relevantActivities.length === 0) {
        console.log(`[ActivityService] No activities from other users found for ${gardenOwnerId}`);
        return null;
      }

      const timestamp = relevantActivities[0].created;
      console.log(`[ActivityService] Latest activity timestamp fetched:`, timestamp);
      return timestamp;
    } catch (error: any) {
      // Log more details about the error
      console.error('[ActivityService] Exception fetching latest activity timestamp:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        originalError: error
      });
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

      // Use native fetch to bypass PocketBase SDK issues in React Native
      const url = 'https://fwf-pocketbase-production.up.railway.app/api/collections/garden_activities/records?perPage=100';
      console.log('[ActivityService] 🔍 Fetching garden activities URL:', url);

      const response = await fetch(url);

      console.log('[ActivityService] 📡 getGardenActivities response status:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ActivityService] ❌ getGardenActivities fetch failed:', response.status, errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          activities: [],
        };
      }

      const data = await response.json();
      const allItems = data.items || [];

      // Sort by created date descending in JS
      const sortedItems = allItems.sort((a: any, b: any) =>
        new Date(b.created).getTime() - new Date(a.created).getTime()
      );

      // Filter for activities where user is garden owner OR actor
      const relevantItems = sortedItems.filter(
        (item: any) => item.garden_owner === gardenOwnerId || item.actor === gardenOwnerId
      );

      // Apply pagination to filtered results
      const startIdx = page * limit;
      const endIdx = Math.min(startIdx + limit, relevantItems.length);
      const paginatedItems = relevantItems.slice(startIdx, endIdx);

      // Create a mock result object for compatibility
      const result = {
        items: paginatedItems,
        totalPages: Math.ceil(relevantItems.length / limit),
        totalItems: relevantItems.length
      };

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
          // Use native fetch to get user profiles
          const usersUrl = 'https://fwf-pocketbase-production.up.railway.app/api/collections/users/records?perPage=100';
          const usersResponse = await fetch(usersUrl);

          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            const allUsers = usersData.items || [];

            // Filter to only the garden owner IDs we need
            const relevantUsers = allUsers.filter((user: any) => gardenOwnerIds.includes(user.id));
            relevantUsers.forEach((user: any) => {
              gardenOwnerNames.set(user.id, user.full_name || 'Unknown');
            });
          }
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

      const hasMore = result.totalPages > (page + 1);

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
   * Note: PocketBase real-time uses EventSource (SSE) which isn't available in React Native
   * We disable subscriptions to avoid errors - users can pull-to-refresh instead
   */
  static subscribeToActivities(
    gardenOwnerId: string,
    onActivity: (activity: GardenActivity) => void
  ) {
    // Skip real-time subscriptions in React Native (EventSource not supported)
    if (typeof EventSource === 'undefined') {
      console.log(`[ActivityService] Skipping subscription - EventSource not available in React Native`);
      return {
        unsubscribe: () => {} // No-op
      };
    }

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
    // Skip if EventSource not available (React Native)
    if (typeof EventSource === 'undefined') {
      return;
    }

    console.log(`[ActivityService] Unsubscribing from activities for garden: ${gardenOwnerId}`);

    const cleanup = activeSubscriptions.get(gardenOwnerId);
    if (cleanup) {
      cleanup();
      activeSubscriptions.delete(gardenOwnerId);
    }
  }
}
