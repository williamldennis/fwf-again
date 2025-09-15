import { supabase } from "../utils/supabase";

export interface GardenActivity {
  id: string;
  garden_owner_id: string;
  actor_id: string;
  activity_type: 'planted' | 'harvested';
  plant_id: string;
  planted_plant_id?: string;
  plant_name: string;
  actor_name: string;
  garden_owner_name?: string;
  created_at: string;
}

export interface ActivityLogResponse {
  success: boolean;
  activities?: GardenActivity[];
  error?: string;
  hasMore?: boolean;
}

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
      console.log(`[ActivityService] 📝 Logging ${activityType} activity:`, {
        gardenOwnerId,
        actorId,
        plantName,
        actorName,
      });

      const { data, error } = await supabase.rpc('log_garden_activity', {
        p_garden_owner_id: gardenOwnerId,
        p_actor_id: actorId,
        p_activity_type: activityType,
        p_plant_id: plantId,
        p_plant_name: plantName,
        p_actor_name: actorName,
        p_planted_plant_id: plantedPlantId,
      });

      if (error) {
        console.error('[ActivityService] ❌ Error logging activity:', error);
        return false;
      }

      console.log(`[ActivityService] ✅ Activity logged successfully: ${activityType}`);
      return true;
    } catch (error) {
      console.error('[ActivityService] ❌ Exception logging activity:', error);
      return false;
    }
  }

  static async getLatestActivityTimestamp(gardenOwnerId: string): Promise<string | null> {
    try {
      console.log(`[ActivityService] ⏱️ Fetching latest activity timestamp for garden:`, {
        gardenOwnerId,
      });

      const { data, error } = await supabase
        .from('garden_activities')
        .select('created_at')
        .eq('garden_owner_id', gardenOwnerId)
        .neq('actor_id', gardenOwnerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`[ActivityService] ℹ️ No activities found for user ${gardenOwnerId}`);
          return null;
        }
        console.error('[ActivityService] ❌ Error fetching latest activity timestamp:', error);
        return null;
      }

      console.log(`[ActivityService] ✅ Latest activity timestamp fetched:`, data?.created_at);
      return data?.created_at || null;
    } catch (error) {
      console.error('[ActivityService] ❌ Exception fetching latest activity timestamp:', error);
      return null;
    }
  }

  static async setLastCheckedActivityAt(userId: string): Promise<void> {
    try {
      console.log(`[ActivityService] ⏱️ Setting last_checked_activity_at for user: ${userId}`);
      const { error } = await supabase
        .from('profiles')
        .update({ last_checked_activity_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('[ActivityService] ❌ Error setting last_checked_activity_at:', error);
        throw new Error(`Failed to set last_checked_activity_at: ${error.message}`);
      }

      console.log(`[ActivityService] ✅ last_checked_activity_at set successfully for user: ${userId}`);
    } catch (error) {
      console.error('[ActivityService] ❌ Exception setting last_checked_activity_at:', error);
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
      console.log(`[ActivityService] 📋 Fetching activities for garden:`, {
        gardenOwnerId,
        page,
        limit,
      });

      const offset = page * limit;

      // First get the activities - both in user's garden and activities they performed in other gardens
      const { data: activities, error: activitiesError, count } = await supabase
        .from('garden_activities')
        .select('*', { count: 'exact' })
        .or(`garden_owner_id.eq.${gardenOwnerId},actor_id.eq.${gardenOwnerId}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (activitiesError) {
        // Handle the specific case where there are no activities
        if (activitiesError.code === 'PGRST103' && activitiesError.message.includes('Requested range not satisfiable')) {
          console.log('[ActivityService] ℹ️ No activities found for user');
          return {
            success: true,
            activities: [],
            hasMore: false,
          };
        }

        console.error('[ActivityService] ❌ Error fetching activities:', activitiesError);
        return {
          success: false,
          error: activitiesError.message,
        };
      }

      if (!activities || activities.length === 0) {
        return {
          success: true,
          activities: [],
          hasMore: false,
        };
      }

      // Get unique garden owner IDs (for activities in friend's gardens)
      const gardenOwnerIds = [...new Set(activities.map(a => a.garden_owner_id))];

      // Fetch garden owner names from profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', gardenOwnerIds);

      if (profilesError) {
        console.error('[ActivityService] ❌ Error fetching profiles:', profilesError);
        // Continue without garden owner names
      }

      // Create a map of garden owner ID to name
      const gardenOwnerNames = new Map<string, string>();
      if (profiles) {
        profiles.forEach(profile => {
          gardenOwnerNames.set(profile.id, profile.full_name || 'Unknown');
        });
      }

      // Add garden owner names to activities
      const activitiesWithNames = activities.map(activity => ({
        ...activity,
        garden_owner_name: gardenOwnerNames.get(activity.garden_owner_id) || 'Unknown'
      }));

      const hasMore = count ? offset + limit < count : false;

      console.log(`[ActivityService] ✅ Fetched ${activitiesWithNames.length} activities, hasMore: ${hasMore}`);

      return {
        success: true,
        activities: activitiesWithNames,
        hasMore,
      };
    } catch (error) {
      console.error('[ActivityService] ❌ Exception fetching activities:', error);
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
    console.log(`[ActivityService] 🔔 Subscribing to activities for user: ${gardenOwnerId}`);

    return supabase
      .channel(`garden_activities_${gardenOwnerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'garden_activities',
          filter: `garden_owner_id=eq.${gardenOwnerId}`,
        },
        (payload) => {
          console.log('[ActivityService] 🔔 New activity in user garden received:', payload.new);
          onActivity(payload.new as GardenActivity);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'garden_activities',
          filter: `actor_id=eq.${gardenOwnerId}`,
        },
        (payload) => {
          console.log('[ActivityService] 🔔 New activity by user received:', payload.new);
          onActivity(payload.new as GardenActivity);
        }
      )
      .subscribe();
  }

  /**
   * Unsubscribe from real-time updates
   */
  static unsubscribeFromActivities(gardenOwnerId: string) {
    console.log(`[ActivityService] 🔕 Unsubscribing from activities for garden: ${gardenOwnerId}`);
    supabase.channel(`garden_activities_${gardenOwnerId}`).unsubscribe();
  }
} 