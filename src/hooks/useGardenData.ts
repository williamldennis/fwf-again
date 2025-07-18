import { useEffect, useState, useCallback, useRef } from 'react';
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

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;
    // Clean up previous subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    // Subscribe to changes in planted_plants
    const channel = supabase
      .channel('public:planted_plants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'planted_plants' },
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
          if (!realtimeGardenOwnerId || typeof realtimeGardenOwnerId !== 'string') return;
          // Only fetch the affected garden's plants
          await updateSingleGarden(realtimeGardenOwnerId);
        }
      )
      .subscribe();
    subscriptionRef.current = channel;
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [userId, updateSingleGarden]);

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