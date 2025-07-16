import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import * as Location from 'expo-location';

export interface UserProfile {
  selfieUrls: Record<string, string> | null;
  points: number;
  latitude: number | null;
  longitude: number | null;
}

export interface UseUserProfileResult {
  profile: UserProfile | null;
  updatePoints: () => Promise<number>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useUserProfile(userId: string | null): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile and location
  const fetchUserProfile = useCallback(async (userId: string) => {
    console.log("[Profile] 👤 Fetching user profile...");
    
    try {
      // Get current device location and update profile
      console.log("[Profile] 📍 Getting device location...");
      let updatedLatitude: number | null = null;
      let updatedLongitude: number | null = null;

      try {
        // Check if we have location permission
        console.log("[Profile] 🔐 Checking location permissions...");
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          console.log("[Profile] 📱 Getting current position...");
          // Get current location
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,
          });

          updatedLatitude = location.coords.latitude;
          updatedLongitude = location.coords.longitude;

          console.log(
            `[Profile] ✅ Got current location: ${updatedLatitude}, ${updatedLongitude}`
          );

          // Update the profile with new coordinates
          console.log("[Profile] 💾 Updating profile with new location...");
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              latitude: updatedLatitude,
              longitude: updatedLongitude,
            })
            .eq("id", userId);

          if (updateError) {
            console.warn("[Profile] ⚠️ Could not update location:", updateError);
          } else {
            console.log("[Profile] ✅ Successfully updated user location");
          }
        } else {
          console.log("[Profile] ⚠️ Location permission not granted, using stored coordinates");
        }
      } catch (locationError) {
        console.warn("[Profile] ❌ Could not get current location:", locationError);
      }

      // Get profile (use updated coordinates if available, otherwise use stored)
      console.log("[Profile] 👤 Fetching user profile...");
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("latitude,longitude,selfie_urls,points")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("[Profile] ❌ Profile error:", profileError);
        throw new Error(`Profile error: ${profileError.message}`);
      }

      console.log(`[Profile] ✅ Profile loaded: points=${profileData?.points || 0}`);

      // Use updated coordinates if we got them, otherwise use stored coordinates
      const latitude = updatedLatitude ?? profileData?.latitude;
      const longitude = updatedLongitude ?? profileData?.longitude;

      if (!latitude || !longitude) {
        console.log("[Profile] ❌ No location coordinates found");
        throw new Error("Location not found.");
      }

      console.log(`[Profile] 📍 Using coordinates: ${latitude}, ${longitude}`);

      // Set the profile data
      const userProfile: UserProfile = {
        selfieUrls: profileData.selfie_urls || null,
        points: profileData.points || 0,
        latitude,
        longitude,
      };

      setProfile(userProfile);
      return { latitude, longitude };
    } catch (err) {
      console.error("[Profile] ❌ Profile fetch error:", err);
      throw err;
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
      await fetchUserProfile(userId);
      console.log("[Profile] ✅ Profile refresh completed!");
    } catch (err) {
      console.error("[Profile] ❌ Profile refresh error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Profile refresh failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [userId, fetchUserProfile]);

  // Initial profile fetch
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    console.log("[Profile] 🚀 Initial profile fetch...");
    setLoading(true);
    setError(null);

    fetchUserProfile(userId)
      .then(() => {
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
  }, [userId, fetchUserProfile]);

  return {
    profile,
    updatePoints,
    updateProfile,
    refreshProfile,
    loading,
    error,
  };
}

export default useUserProfile; 