import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import * as Location from 'expo-location';

export interface UserProfile {
  selfieUrls: Record<string, string> | null;
  points: number;
  latitude: number | null;
  longitude: number | null;
  lastCheckedActivityAt?: string | null;
}

export interface UseUserProfileResult {
  profile: UserProfile | null;
  // Separate loading states for better UX
  weatherLoading: boolean;
  profileLoading: boolean;
  updatePoints: () => Promise<number>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useUserProfile(userId: string | null): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fast location fetch for weather (highest priority)
  const fetchLocationForWeather = useCallback(async (userId: string) => {
    console.log("[Profile] 🚀 Fast location fetch for weather...");
    setWeatherLoading(true);

    try {
      // Always get fresh current location
      console.log("[Profile] 📍 Getting fresh current location for weather...");
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
        });

        const latitude = location.coords.latitude;
        const longitude = location.coords.longitude;

        console.log(`[Profile] ✅ Got fresh current location: ${latitude}, ${longitude}`);

        // Don't update database here - let weather service handle it
        // This prevents the race condition with fetchFullProfile

        setWeatherLoading(false);
        return { latitude, longitude };
      } else {
        console.log("[Profile] ⚠️ Location permission not granted");
        setWeatherLoading(false);
        return { latitude: null, longitude: null };
      }
    } catch (err) {
      console.warn("[Profile] ❌ Location fetch error:", err);
      setWeatherLoading(false);
      return { latitude: null, longitude: null };
    }
  }, []);

  // Full profile fetch (background, lower priority)
  const fetchFullProfile = useCallback(async (userId: string) => {
    console.log("[Profile] 👤 Fetching full profile (background)...");
    setProfileLoading(true);

    try {
      // Get complete profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("latitude,longitude,selfie_urls,points,last_checked_activity_at")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("[Profile] ❌ Profile error:", profileError);
        throw new Error(`Profile error: ${profileError.message}`);
      }

      console.log(`[Profile] ✅ Full profile loaded: points=${profileData?.points || 0}`);

      // Set the complete profile data, but preserve fresh location if available
      setProfile(prev => {
        const userProfile: UserProfile = {
          selfieUrls: profileData.selfie_urls || null,
          points: profileData.points || 0,
          // Preserve fresh location if we have it, otherwise use database location
          latitude: prev?.latitude || profileData.latitude,
          longitude: prev?.longitude || profileData.longitude,
          lastCheckedActivityAt: profileData.last_checked_activity_at || null,
        };
        return userProfile;
      });

      setProfileLoading(false);
    } catch (err) {
      console.error("[Profile] ❌ Full profile fetch error:", err);
      setProfileLoading(false);
      // Don't throw - this is background loading
    }
  }, []);

  // Update user points (used after harvesting)
  const updatePoints = useCallback(async (): Promise<number> => {
    if (!userId) {
      throw new Error("No user ID provided");
    }

    console.log("[Profile] 💰 Updating user points...");

    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("[Profile] ❌ Error fetching updated points:", error);
        throw new Error(`Failed to update points: ${error.message}`);
      }

      const newPoints = profileData?.points || 0;
      console.log(`[Profile] ✅ Points updated: ${newPoints}`);

      // Update local state
      setProfile(prev => prev ? { ...prev, points: newPoints } : null);

      return newPoints;
    } catch (err) {
      console.error("[Profile] ❌ Points update error:", err);
      throw err;
    }
  }, [userId]);

  // Update profile data
  const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<void> => {
    if (!userId) {
      throw new Error("No user ID provided");
    }

    console.log("[Profile] 🔄 Updating profile...", updates);

    try {
      const updateData: any = {};

      if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
      if (updates.longitude !== undefined) updateData.longitude = updates.longitude;
      if (updates.selfieUrls !== undefined) updateData.selfie_urls = updates.selfieUrls;
      if (updates.points !== undefined) updateData.points = updates.points;

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (error) {
        console.error("[Profile] ❌ Profile update error:", error);
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);

      console.log("[Profile] ✅ Profile updated successfully");
    } catch (err) {
      console.error("[Profile] ❌ Profile update error:", err);
      throw err;
    }
  }, [userId]);

  // Refresh profile data
  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!userId) return;

    console.log("[Profile] 🔄 Refreshing profile...");
    setLoading(true);
    setError(null);

    try {
      // First get fresh location
      await fetchLocationForWeather(userId);

      // Then fetch full profile (will preserve fresh location)
      await fetchFullProfile(userId);

      console.log("[Profile] ✅ Profile refresh completed!");
    } catch (err) {
      console.error("[Profile] ❌ Profile refresh error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Profile refresh failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [userId, fetchLocationForWeather, fetchFullProfile]);

  // Initial profile fetch with prioritized loading
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setWeatherLoading(false);
      setProfileLoading(false);
      setError(null);
      return;
    }

    console.log("[Profile] 🚀 Initial profile fetch with priority loading...");
    setLoading(true);
    setError(null);

    // Start with fast location fetch for weather
    fetchLocationForWeather(userId)
      .then(({ latitude, longitude }) => {
        // Set minimal profile for weather loading
        if (latitude && longitude) {
          setProfile(prev => ({
            selfieUrls: null,
            points: 0,
            latitude,
            longitude,
            ...prev
          }));
        }

        // Then fetch full profile in background
        return fetchFullProfile(userId);
      })
      .then(() => {
        // Ensure fresh location is preserved after full profile fetch
        console.log("[Profile] ✅ Initial profile fetch completed");
      })
      .catch((err) => {
        console.error("[Profile] ❌ Initial profile fetch error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(`Profile fetch failed: ${errorMessage}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId, fetchLocationForWeather, fetchFullProfile]);

  return {
    profile,
    weatherLoading,
    profileLoading,
    updatePoints,
    updateProfile,
    refreshProfile,
    loading,
    error,
  };
}

export default useUserProfile; 