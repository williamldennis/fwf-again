import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../utils/supabase';
import { GardenService } from '../services/gardenService';
import { ContactsService } from '../services/contactsService';

export interface UseGardenDataResult {
  plantedPlants: Record<string, any[]>;
  updateSingleGarden: (gardenOwnerId: string) => Promise<void>;
  updateAllGardens: () => Promise<void>;
  updateGrowth: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useGardenData(userId: string | null, friends: { id: string }[] = []): UseGardenDataResult {
  const [plantedPlants, setPlantedPlants] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  // Helper to get all relevant user IDs
  const getAllUserIds = useCallback(() => {
    if (!userId) return [];
    const friendIds = friends.map(f => f.id);
    return [userId, ...friendIds];
  }, [userId, friends]);

  // Fetch all gardens (user + friends)
  const fetchAllGardens = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const allUserIds = getAllUserIds();
      const data = await GardenService.fetchAllPlantedPlantsBatch(allUserIds);
      setPlantedPlants(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch gardens: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [userId, getAllUserIds]);

  // Fetch a single garden
  const updateSingleGarden = useCallback(async (gardenOwnerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const plants = await GardenService.fetchPlantedPlants(gardenOwnerId);
      setPlantedPlants(prev => ({ ...prev, [gardenOwnerId]: plants }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to update garden: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update all gardens
  const updateAllGardens = useCallback(async () => {
    await fetchAllGardens();
  }, [fetchAllGardens]);

  // Update plant growth
  const updateGrowth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await GardenService.updatePlantGrowth();
      await fetchAllGardens();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to update growth: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [fetchAllGardens]);

  // Robust real-time subscription with reconnection logic
  const setupSubscription = useCallback(() => {
    if (!userId) return;

    const allUserIds = getAllUserIds();
    if (allUserIds.length === 0) return;

    // Clean up previous subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Subscribe to changes in planted_plants for all users (no filter needed due to permissive RLS)
    const channel = supabase
      .channel(`garden-updates-${userId}-${Date.now()}`) // Unique channel name to avoid conflicts
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planted_plants'
        },
        async (payload) => {
          const realtimeNewGardenOwnerId =
            payload.new && typeof payload.new === 'object' && 'garden_owner_id' in payload.new
              ? payload.new.garden_owner_id
              : undefined;
          const realtimeOldGardenOwnerId =
            payload.old && typeof payload.old === 'object' && 'garden_owner_id' in payload.old
              ? payload.old.garden_owner_id
              : undefined;
          const realtimeGardenOwnerId =
            realtimeNewGardenOwnerId || realtimeOldGardenOwnerId;

          if (!realtimeGardenOwnerId || typeof realtimeGardenOwnerId !== 'string') {
            return;
          }

          // Only update if it's a garden we care about
          if (allUserIds.includes(realtimeGardenOwnerId)) {
            try {
              await updateSingleGarden(realtimeGardenOwnerId);
              // Reset retry count on successful update
              retryCountRef.current = 0;
            } catch (error) {
              console.error('[Real-time] Error updating garden:', error);
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Real-time] Subscription status:', status, err);

        if (status === 'SUBSCRIBED') {
          retryCountRef.current = 0; // Reset retry count on successful connection
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          handleReconnect();
        }
      });

    subscriptionRef.current = channel;
  }, [userId, getAllUserIds, updateSingleGarden]);

  // Handle reconnection with exponential backoff
  const handleReconnect = useCallback(() => {
    if (retryCountRef.current >= maxRetries) {
      console.log('[Real-time] Max retries reached, giving up');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000); // Max 30 seconds
    retryCountRef.current += 1;

    console.log(`[Real-time] Reconnecting in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('[Real-time] Attempting reconnection...');
      setupSubscription();
    }, delay);
  }, [setupSubscription]);

  // Set up subscription
  useEffect(() => {
    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        console.log('[Real-time] Cleaning up subscription');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [setupSubscription]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log('[Real-time] App state changed to:', nextAppState);

      if (nextAppState === 'active') {
        // App came to foreground, ensure subscription is active
        console.log('[Real-time] App became active, checking subscription');
        if (!subscriptionRef.current || subscriptionRef.current.state !== 'joined') {
          console.log('[Real-time] Subscription inactive, reconnecting...');
          setupSubscription();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [setupSubscription]);

  // Initial fetch
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setPlantedPlants({});
      return;
    }
    fetchAllGardens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, friends]);

  return {
    plantedPlants,
    updateSingleGarden,
    updateAllGardens,
    updateGrowth,
    loading,
    error,
  };
}

export default useGardenData; 