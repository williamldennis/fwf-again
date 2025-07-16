import { useEffect, useState, useCallback } from "react";
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
}

export interface AppInitializationActions {
    initializeApp: () => Promise<void>;
    refreshData: () => Promise<void>;
    clearError: () => void;
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

    // Main data fetching function
    const fetchProfileAndWeather = useCallback(async (userId: string) => {
        console.log("[Loading] 🚀 Starting fetchProfileAndWeather...");
        setLoading(true);
        setError(null);
        
        try {
            // Get current device location and update profile
            console.log("[Loading] 📍 Step 2: Getting device location...");
            let updatedLatitude: number | null = null;
            let updatedLongitude: number | null = null;

            try {
                // Check if we have location permission
                console.log("[Loading] 🔐 Checking location permissions...");
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === "granted") {
                    console.log("[Loading] 📱 Getting current position...");
                    // Get current location
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 10000,
                    });

                    updatedLatitude = location.coords.latitude;
                    updatedLongitude = location.coords.longitude;

                    console.log(
                        `[Loading] ✅ Got current location: ${updatedLatitude}, ${updatedLongitude}`
                    );

                    // Update the profile with new coordinates
                    console.log("[Loading] 💾 Updating profile with new location...");
                    const { error: updateError } = await supabase
                        .from("profiles")
                        .update({
                            latitude: updatedLatitude,
                            longitude: updatedLongitude,
                        })
                        .eq("id", userId);

                    if (updateError) {
                        console.warn("[Loading] ⚠️ Could not update location:", updateError);
                    } else {
                        console.log("[Loading] ✅ Successfully updated user location");
                    }
                } else {
                    console.log("[Loading] ⚠️ Location permission not granted, using stored coordinates");
                }
            } catch (locationError) {
                console.warn("[Loading] ❌ Could not get current location:", locationError);
            }

            // Get profile (use updated coordinates if available, otherwise use stored)
            console.log("[Loading] 👤 Step 3: Fetching user profile...");
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("latitude,longitude,selfie_urls,points")
                .eq("id", userId)
                .single();

            if (profileError) {
                console.error("[Loading] ❌ Profile error:", profileError);
                throw new Error(`Profile error: ${profileError.message}`);
            }

            console.log(`[Loading] ✅ Profile loaded: points=${profile?.points || 0}`);

            // Use updated coordinates if we got them, otherwise use stored coordinates
            const latitude = updatedLatitude ?? profile?.latitude;
            const longitude = updatedLongitude ?? profile?.longitude;

            if (!latitude || !longitude) {
                console.log("[Loading] ❌ No location coordinates found");
                throw new Error("Location not found.");
            }

            console.log(`[Loading] 📍 Using coordinates: ${latitude}, ${longitude}`);

            // Get user's timezone and local hour
            console.log("[Loading] 🕐 Step 4: Calculating timezone and local time...");
            let localHour = 12;
            try {
                const timezone = tzlookup(latitude, longitude);
                const localTime = DateTime.now().setZone(timezone);
                localHour = localTime.hour;
                console.log(`[Loading] ✅ Timezone: ${timezone}, Local hour: ${localHour}`);
            } catch (e) {
                console.warn("[Loading] ⚠️ Could not determine timezone from lat/lon", e);
            }

            // Fetch weather and forecast data
            console.log("[Loading] 🌤️ Step 5: Fetching weather and forecast data...");
            const weatherData = await WeatherService.fetchWeatherData(latitude, longitude);

            console.log("[Loading] ✅ Weather and forecast loaded in single request");

            // Update user's weather in Supabase
            console.log("[Loading] 💾 Step 7: Updating user's weather in database...");
            await WeatherService.updateUserWeatherInDatabase(userId, weatherData);

            // Fetch user's contacts and find friends
            console.log("[Loading] 📞 Step 6: Fetching user's contacts...");
            const allContacts = await ContactsService.fetchUserContacts(userId);
            console.log(`[Loading] ✅ Total contacts retrieved: ${allContacts.length}`);

            console.log("[Loading] 🔍 Step 7: Processing contacts and finding friends...");
            const friendsWithNamesAndCities = await ContactsService.findFriendsFromContacts(
                allContacts,
                userId
            );
            console.log(`[Loading] ✅ Friends with cities loaded: ${friendsWithNamesAndCities.length}`);

            // Fetch planted plants for each friend and the current user
            console.log("[Loading] 🌱 Step 9: Fetching planted plants...");

            // OPTIMIZATION: Batch fetch all plants instead of sequential queries
            const allUserIds = [userId, ...friendsWithNamesAndCities.map((friend) => friend.id)];
            console.log(
                `[Loading] 🚀 Batch fetching plants for ${allUserIds.length} users (${friendsWithNamesAndCities.length} friends + current user)`
            );

            const plantsData = await GardenService.fetchAllPlantedPlantsBatch(allUserIds);

            console.log(`[Loading] ✅ All plants loaded for ${Object.keys(plantsData).length} users`);

            // Set the consolidated data
            setFriendsData(friendsWithNamesAndCities);
            setPlantedPlants(plantsData);
            setUserProfile({
                selfieUrls: profile.selfie_urls || null,
                points: profile.points || 0,
                latitude,
                longitude,
            });

            console.log("[Loading] 🎉 Loading process completed!");
            setIsInitialized(true);
        } catch (err) {
            console.error("[Loading] ❌ Weather fetch error:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`Failed to fetch weather: ${errorMessage}`);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Initialize app function
    const initializeApp = useCallback(async () => {
        console.log("[App] 🚀 App initialization started...");
        setLoading(true);
        setError(null);

        try {
            const userId = await getCurrentUser();
            if (!userId) {
                setError("User not found.");
                setLoading(false);
                return;
            }

            console.log("[App] 🌱 Fetching available plants...");
            const plants = await GardenService.fetchAvailablePlants();
            setAvailablePlants(plants);

            console.log("[App] 🌤️ Starting main data fetch...");
            await fetchProfileAndWeather(userId);

            console.log("[App] 📈 Updating plant growth...");
            await GardenService.updatePlantGrowth(); // Update plant growth on app load

            console.log("[App] ✅ App initialization completed!");
        } catch (err) {
            console.error("[App] ❌ App initialization error:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`App initialization failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }, [getCurrentUser, fetchProfileAndWeather]);

    // Refresh data function
    const refreshData = useCallback(async () => {
        if (!currentUserId) return;
        
        console.log("[App] 🔄 Refreshing app data...");
        setLoading(true);
        setError(null);

        try {
            await fetchProfileAndWeather(currentUserId);
            console.log("[App] ✅ Data refresh completed!");
        } catch (err) {
            console.error("[App] ❌ Data refresh error:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`Data refresh failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }, [currentUserId, fetchProfileAndWeather]);

    // Clear error function
    const clearError = useCallback(() => {
        setError(null);
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
        
        // Actions
        initializeApp,
        refreshData,
        clearError,
    };
}; 