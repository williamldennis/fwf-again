import { useState, useCallback } from 'react';
import { GardenService } from '../services/gardenService';

export interface UseAvailablePlantsResult {
  availablePlants: any[];
  fetchPlants: () => Promise<void>;
  refreshPlants: () => Promise<void>;
  loading: boolean;
  error: string | null;
  hasLoaded: boolean;
}

export function useAvailablePlants(): UseAvailablePlantsResult {
  const [availablePlants, setAvailablePlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch plants (lazy load - only when called)
  const fetchPlants = useCallback(async () => {
    // If already loaded, don't fetch again
    if (hasLoaded && availablePlants.length > 0) {
      console.log("[AvailablePlants] 🌱 Using cached plants");
      return;
    }

    console.log("[AvailablePlants] 🌱 Fetching available plants...");
    setLoading(true);
    setError(null);

    try {
      const plants = await GardenService.fetchAvailablePlants();
      setAvailablePlants(plants);
      setHasLoaded(true);
      console.log(`[AvailablePlants] ✅ Fetched ${plants.length} available plants`);
    } catch (err) {
      console.error("[AvailablePlants] ❌ Error fetching plants:", err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch plants: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [hasLoaded, availablePlants.length]);

  // Refresh plants (force reload)
  const refreshPlants = useCallback(async () => {
    console.log("[AvailablePlants] 🔄 Refreshing available plants...");
    setLoading(true);
    setError(null);

    try {
      const plants = await GardenService.fetchAvailablePlants();
      setAvailablePlants(plants);
      setHasLoaded(true);
      console.log(`[AvailablePlants] ✅ Refreshed ${plants.length} available plants`);
    } catch (err) {
      console.error("[AvailablePlants] ❌ Error refreshing plants:", err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to refresh plants: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    availablePlants,
    fetchPlants,
    refreshPlants,
    loading,
    error,
    hasLoaded,
  };
}

export default useAvailablePlants; 