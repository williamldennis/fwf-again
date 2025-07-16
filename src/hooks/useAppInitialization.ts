import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../utils/supabase";
import { GardenService } from "../services/gardenService";
import { WeatherService } from "../services/weatherService";
import { ContactsService } from "../services/contactsService";
import * as Location from "expo-location";
// @ts-ignore
import tzlookup from "tz-lookup";
// @ts-ignore
import { DateTime } from "luxon";

export interface AppInitializationState {
    currentUserId: string | null;
    availablePlants: any[];
    friendsData: any[];
    plantedPlants: Record<string, any[]>;
    userProfile: {
        selfieUrls: Record<string, string> | null;
        points: number;
        latitude: number | null;
        longitude: number | null;
    } | null;
    loading: boolean;
    error: string | null;
    isInitialized: boolean;
    // Progressive loading states
    friendsLoading: boolean;
    plantsLoading: boolean;
}

export interface AppInitializationActions {
    initializeApp: () => Promise<void>;
    refreshData: () => Promise<void>;
    clearError: () => void;
    resetInitialization: () => void;
}

export const useAppInitialization = (): AppInitializationState & AppInitializationActions => {
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [availablePlants, setAvailablePlants] = useState<any[]>([]);
    const [friendsData, setFriendsData] = useState<any[]>([]);
    const [plantedPlants, setPlantedPlants] = useState<Record<string, any[]>>({});
    const [userProfile, setUserProfile] = useState<{
        selfieUrls: Record<string, string> | null;
        points: number;
        latitude: number | null;
        longitude: number | null;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // Progressive loading states
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [plantsLoading, setPlantsLoading] = useState(false);
    
    // Guard against multiple initialization calls
    const [isInitializing, setIsInitializing] = useState(false);
    const hasInitialized = useRef(false);

    // Get current user ID
    const getCurrentUser = useCallback(async (): Promise<string | null> => {
        console.log("[App] 👤 Getting current user...");
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (user) {
            console.log(`[App] ✅ Current user: ${user.id}`);
            setCurrentUserId(user.id);
            return user.id;
        } else {
            console.log("[App] ❌ No authenticated user found");
            return null;
        }
    }, []);

    // Fetch user profile and location
    const fetchUserProfile = useCallback(async (userId: string) => {
        console.log("[App] 👤 Fetching user profile...");
        
        try {
            // Get current device location and update profile
            console.log("[App] 📍 Getting device location...");
            let updatedLatitude: number | null = null;
            let updatedLongitude: number | null = null;

            try {
                // Check if we have location permission
                console.log("[App] 🔐 Checking location permissions...");
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === "granted") {
                    console.log("[App] 📱 Getting current position...");
                    // Get current location
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 10000,
                    });

                    updatedLatitude = location.coords.latitude;
                    updatedLongitude = location.coords.longitude;

                    console.log(
                        `[App] ✅ Got current location: ${updatedLatitude}, ${updatedLongitude}`
                    );

                    // Update the profile with new coordinates
                    console.log("[App] 💾 Updating profile with new location...");
                    const { error: updateError } = await supabase
                        .from("profiles")
                        .update({
                            latitude: updatedLatitude,
                            longitude: updatedLongitude,
                        })
                        .eq("id", userId);

                    if (updateError) {
                        console.warn("[App] ⚠️ Could not update location:", updateError);
                    } else {
                        console.log("[App] ✅ Successfully updated user location");
                    }
                } else {
                    console.log("[App] ⚠️ Location permission not granted, using stored coordinates");
                }
            } catch (locationError) {
                console.warn("[App] ❌ Could not get current location:", locationError);
            }

            // Get profile (use updated coordinates if available, otherwise use stored)
            console.log("[App] 👤 Fetching user profile...");
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("latitude,longitude,selfie_urls,points")
                .eq("id", userId)
                .single();

            if (profileError) {
                console.error("[App] ❌ Profile error:", profileError);
                throw new Error(`Profile error: ${profileError.message}`);
            }

            console.log(`[App] ✅ Profile loaded: points=${profile?.points || 0}`);

            // Use updated coordinates if we got them, otherwise use stored coordinates
            const latitude = updatedLatitude ?? profile?.latitude;
            const longitude = updatedLongitude ?? profile?.longitude;

            if (!latitude || !longitude) {
                console.log("[App] ❌ No location coordinates found");
                throw new Error("Location not found.");
            }

            console.log(`[App] 📍 Using coordinates: ${latitude}, ${longitude}`);

            // Set the profile data immediately
            setUserProfile({
                selfieUrls: profile.selfie_urls || null,
                points: profile.points || 0,
                latitude,
                longitude,
            });

            return { latitude, longitude };
        } catch (err) {
            console.error("[App] ❌ Profile fetch error:", err);
            throw err;
        }
    }, []);

    // Weather data is now handled by useWeatherData hook
    // This function is kept for backward compatibility but does nothing
    const fetchWeatherData = useCallback(async (latitude: number, longitude: number) => {
        console.log("[App] 🌤️ Weather fetching moved to useWeatherData hook");
        // Weather is now handled by the useWeatherData hook in home.tsx
    }, []);

    // Fetch friends and plants data in background
    const fetchFriendsAndPlantsData = useCallback(async (userId: string) => {
        console.log("[App] 👥 Starting friends and plants fetch in background...");
        setFriendsLoading(true);
        setPlantsLoading(true);
        
        try {
            // Fetch user's contacts and find friends
            console.log("[App] 📞 Fetching user's contacts...");
            const allContacts = await ContactsService.fetchUserContacts(userId);
            console.log(`[App] ✅ Total contacts retrieved: ${allContacts.length}`);

            console.log("[App] 🔍 Processing contacts and finding friends...");
            const friendsWithNamesAndCities = await ContactsService.findFriendsFromContacts(
                allContacts,
                userId
            );
            console.log(`[App] ✅ Friends with cities loaded: ${friendsWithNamesAndCities.length}`);

            // Fetch planted plants for each friend and the current user
            console.log("[App] 🌱 Fetching planted plants...");

            // OPTIMIZATION: Batch fetch all plants instead of sequential queries
            const allUserIds = [userId, ...friendsWithNamesAndCities.map((friend) => friend.id)];
            console.log(
                `[App] 🚀 Batch fetching plants for ${allUserIds.length} users (${friendsWithNamesAndCities.length} friends + current user)`
            );

            const plantsData = await GardenService.fetchAllPlantedPlantsBatch(allUserIds);

            console.log(`[App] ✅ All plants loaded for ${Object.keys(plantsData).length} users`);

            // Set the consolidated data
            setFriendsData(friendsWithNamesAndCities);
            setPlantedPlants(plantsData);

            console.log("[App] ✅ Friends and plants data loaded successfully");
        } catch (err) {
            console.error("[App] ❌ Friends/plants fetch error:", err);
            // Don't throw - friends/plants failure shouldn't break the app
        } finally {
            setFriendsLoading(false);
            setPlantsLoading(false);
        }
    }, []);

    // Initialize app function with progressive loading
    const initializeApp = useCallback(async () => {
        // Prevent multiple initialization calls
        if (isInitializing || hasInitialized.current) {
            console.log("[App] ⚠️ App initialization already in progress or completed, skipping...");
            return;
        }
        
        console.log("[App] 🚀 App initialization started...");
        setIsInitializing(true);
        setLoading(true);
        setError(null);

        try {
            // Step 1: Get user auth (required for everything)
            const userId = await getCurrentUser();
            if (!userId) {
                setError("User not found.");
                setLoading(false);
                setIsInitializing(false);
                return;
            }

            // Step 2: Fetch profile and location (required for weather)
            const { latitude, longitude } = await fetchUserProfile(userId);

            // Step 3: Show app immediately with basic data
            console.log("[App] ✅ Core app ready - showing UI immediately");
            setIsInitialized(true);
            setLoading(false);

            // Step 4: Load heavy data in background (non-blocking)
            console.log("[App] 🔄 Starting background data loading...");
            
            // Load available plants (light operation)
            console.log("[App] 🌱 Fetching available plants...");
            const plants = await GardenService.fetchAvailablePlants();
            setAvailablePlants(plants);

            // Load friends/plants in background (weather is handled by useWeatherData hook)
            await fetchFriendsAndPlantsData(userId);

            // Step 5: Update plant growth (light operation)
            console.log("[App] 📈 Updating plant growth...");
            await GardenService.updatePlantGrowth();

            console.log("[App] ✅ All background data loaded!");
            
            // Mark as initialized to prevent future calls
            hasInitialized.current = true;
        } catch (err) {
            console.error("[App] ❌ App initialization error:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`App initialization failed: ${errorMessage}`);
            setLoading(false);
        } finally {
            setIsInitializing(false);
        }
    }, []); // Empty dependency array to prevent recreation

    // Refresh data function
    const refreshData = useCallback(async () => {
        if (!currentUserId) return;
        
        console.log("[App] 🔄 Refreshing app data...");
        setLoading(true);
        setError(null);

        try {
            await fetchUserProfile(currentUserId);
            await fetchFriendsAndPlantsData(currentUserId);
            
            console.log("[App] ✅ Data refresh completed!");
        } catch (err) {
            console.error("[App] ❌ Data refresh error:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`Data refresh failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }, [currentUserId, fetchUserProfile, fetchFriendsAndPlantsData]);

    // Clear error function
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Reset initialization function
    const resetInitialization = useCallback(() => {
        hasInitialized.current = false;
        setIsInitialized(false);
        setLoading(true);
        setError(null);
        setCurrentUserId(null);
        setAvailablePlants([]);
        setFriendsData([]);
        setPlantedPlants({});
        setUserProfile(null);
        setFriendsLoading(false);
        setPlantsLoading(false);
    }, []);

    // Set up background sync on mount
    useEffect(() => {
        console.log("[App] ⏰ Setting up periodic growth updates...");
        const growthInterval = setInterval(() => {
            console.log("[App] 🔄 Running periodic growth update...");
            GardenService.updatePlantGrowth();
        }, 5 * 60 * 1000); // 5 minutes

        // Subscribe to changes in planted_plants
        console.log("[App] 📡 Setting up real-time subscription...");
        const subscription = supabase
            .channel("public:planted_plants")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "planted_plants" },
                async (payload) => {
                    // Type guard for garden_owner_id
                    const realtimeNewGardenOwnerId =
                        payload.new &&
                        typeof payload.new === "object" &&
                        "garden_owner_id" in payload.new
                            ? payload.new.garden_owner_id
                            : undefined;
                    const realtimeOldGardenOwnerId =
                        payload.old &&
                        typeof payload.old === "object" &&
                        "garden_owner_id" in payload.old
                            ? payload.old.garden_owner_id
                            : undefined;
                    const realtimeGardenOwnerId =
                        realtimeNewGardenOwnerId || realtimeOldGardenOwnerId;
                    if (
                        !realtimeGardenOwnerId ||
                        typeof realtimeGardenOwnerId !== "string"
                    )
                        return;
                    console.log(
                        "[Realtime] Change in garden:",
                        realtimeGardenOwnerId,
                        payload.eventType
                    );
                    // Only fetch the affected garden's plants
                    const updatedPlants = await GardenService.fetchPlantedPlants(
                        realtimeGardenOwnerId
                    );
                    // Note: This would need to be handled by the parent component
                    // We'll emit an event or use a callback pattern
                }
            )
            .subscribe();

        return () => {
            console.log("[App] 🧹 Cleaning up app resources...");
            clearInterval(growthInterval);
            supabase.removeChannel(subscription);
        };
    }, []);

    return {
        // State
        currentUserId,
        availablePlants,
        friendsData,
        plantedPlants,
        userProfile,
        loading,
        error,
        isInitialized,
        
        // Progressive loading states
        friendsLoading,
        plantsLoading,
        
        // Actions
        initializeApp,
        refreshData,
        clearError,
        resetInitialization,
    };
}; 