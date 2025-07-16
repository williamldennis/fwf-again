import { useEffect, useState, useMemo } from "react";
import {
    View,
    Text,
    Alert,
    TouchableOpacity,
    FlatList,
    Dimensions,
    Share,
    Image,
} from "react-native";
import { Stack, router } from "expo-router";
import React from "react";
import { supabase } from "../utils/supabase";
import { useHeaderHeight } from "@react-navigation/elements";
// @ts-ignore
import tzlookup from "tz-lookup";
// @ts-ignore
import { DateTime } from "luxon";
import * as Contacts from "expo-contacts";
import * as Location from "expo-location";

import GardenArea from "../components/GardenArea";
import PlantPicker from "../components/PlantPicker";
import PlantDetailsModal from "../components/PlantDetailsModal";
import UserCard from "../components/UserCard";
import FriendCard from "../components/FriendCard";
import AddFriendsCard from "../components/AddFriendsCard";
import DropdownMenu from "../components/DropdownMenu";
import { Plant } from "../types/garden";
import { GrowthService } from "../services/growthService";
import { TimeCalculationService } from "../services/timeCalculationService";
import { WeatherService } from "../services/weatherService";
import { ContactsService } from "../services/contactsService";
import FiveDayForecast from "../components/FiveDayForecast";
import { GardenService } from "../services/gardenService";

const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

const getWeatherGradient = (weatherCondition: string) => {
    switch (weatherCondition?.toLowerCase()) {
        case "clear":
            return ["#FFD700", "#FFA500"]; // Yellow to orange
        case "clouds":
            return ["#E8E8E8", "#B0B0B0"]; // Light gray to darker gray
        case "rain":
            return ["#4A90E2", "#7B68EE"]; // Blue to purple
        case "snow":
            return ["#F0F8FF", "#E6E6FA"]; // Light blue to lavender
        case "thunderstorm":
            return ["#2C3E50", "#34495E"]; // Dark blue-gray
        case "drizzle":
            return ["#87CEEB", "#4682B4"]; // Sky blue to steel blue
        case "mist":
        case "fog":
            return ["#D3D3D3", "#A9A9A9"]; // Light gray to dark gray
        case "haze":
            return ["#F5F5DC", "#DEB887"]; // Beige to burlywood
        default:
            return ["#E8E8E8", "#B0B0B0"]; // Default gray
    }
};

const getInitials = (name: string) => {
    if (!name || name === "Unknown") return "?";
    return name
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2);
};

const Avatar = ({ name, size = 40 }: { name: string; size?: number }) => {
    const initials = getInitials(name);
    const backgroundColor = name === "Unknown" ? "#999" : "#007AFF";

    return (
        <View
            className="justify-center items-center mr-3"
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor,
            }}
        >
            <Text
                className="font-bold text-white"
                style={{
                    fontSize: size * 0.4,
                }}
            >
                {initials}
            </Text>
        </View>
    );
};

async function getCityFromCoords(lat: number, lon: number): Promise<string> {
    return WeatherService.getCityFromCoords(lat, lon);
}

function getBackgroundColor(hour: number) {
    if (hour >= 6 && hour < 9) return "#FFA500"; // Sunrise orange
    if (hour >= 9 && hour < 18) return "#87CEEB"; // Day blue
    if (hour >= 18 && hour < 21) return "#FF8C00"; // Sunset orange
    return "#191970"; // Night blue
}

const WEATHER_CARD_HEIGHT = 540; // adjust as needed for your weather card height

// Utility to aggregate 3-hourly forecast to 5 daily objects
function aggregateToFiveDay(forecastList: any[]): any[] {
    return WeatherService.aggregateToFiveDay(forecastList);
}

export default function Home() {
    const [weather, setWeather] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [friendsWeather, setFriendsWeather] = useState<any[]>([]);
    const [selfieUrls, setSelfieUrls] = useState<Record<string, string> | null>(
        null
    );
    const [bgColor, setBgColor] = useState("#87CEEB");
    const [showMenu, setShowMenu] = useState(false);
    const [refreshingContacts, setRefreshingContacts] = useState(false);
    const headerHeight = useHeaderHeight();
    const cardWidth = Dimensions.get("window").width - 32; // 16px margin on each side
    const [forecast, setForecast] = useState<any[]>([]);
    const [forecastSummary, setForecastSummary] = useState<string>("");
    const [showPlantPicker, setShowPlantPicker] = useState(false);
    const [showPlantDetails, setShowPlantDetails] = useState(false);
    const [selectedFriendId, setSelectedFriendId] = useState<string | null>(
        null
    );
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [selectedPlant, setSelectedPlant] = useState<any>(null);
    const [availablePlants, setAvailablePlants] = useState<Plant[]>([]);
    const [plantedPlants, setPlantedPlants] = useState<Record<string, any[]>>(
        {}
    );
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [selectedPlanterName, setSelectedPlanterName] =
        useState<string>("Unknown");
    const [userPoints, setUserPoints] = useState<number>(0);

    // User's 5-day forecast data
    const userFiveDayData = useMemo(() => {
        try {
            return aggregateToFiveDay(forecast);
        } catch (error) {
            console.warn("[Forecast] Error aggregating forecast data:", error);
            return [];
        }
    }, [forecast]);

    // Friend forecast cache
    const [friendForecasts, setFriendForecasts] = useState<
        Record<string, any[]>
    >({});

    // Helper to fetch and cache friend forecast
    const fetchFriendForecast = async (friend: any) => {
        if (!friend.latitude || !friend.longitude) return;
        if (friendForecasts[friend.id]) return; // Already cached
        try {
            const forecastData = await WeatherService.fetchFriendForecast(
                friend.latitude,
                friend.longitude
            );
            setFriendForecasts((prev) => ({
                ...prev,
                [friend.id]: forecastData,
            }));
        } catch (e) {
            // Ignore errors for now
        }
    };

    // Logout handler
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            Alert.alert("Logout failed", error.message);
        } else {
            router.replace("/login");
        }
    };

    // Refresh contacts handler
    const handleRefreshContacts = async () => {
        setRefreshingContacts(true);
        try {
            const result = await ContactsService.refreshContacts();

            if (!result.success) {
                Alert.alert(
                    "Error",
                    result.error || "Failed to refresh contacts"
                );
                return;
            }

            Alert.alert("Success", `Refreshed ${result.contactCount} contacts`);

            // Refresh the friends list
            fetchProfileAndWeather();
        } catch (error) {
            Alert.alert(
                "Error",
                "Failed to refresh contacts. Please try again."
            );
            console.error("Refresh contacts error:", error);
        } finally {
            setRefreshingContacts(false);
            setShowMenu(false);
        }
    };

    // Replace with GardenService usage:

    // In initializeApp:
    const initializeApp = async () => {
        await getCurrentUser();
        console.log("[App] 🌱 Fetching available plants...");
        await GardenService.fetchAvailablePlants().then(setAvailablePlants);
        console.log("[App] 🌤️ Starting main data fetch...");
        await fetchProfileAndWeather();
        console.log("[App] 📈 Updating plant growth...");
        await GardenService.updatePlantGrowth(); // Update plant growth on app load
        console.log("[App] ✅ App initialization completed!");
    };

    // In fetchProfileAndWeather:
    const fetchProfileAndWeather = async () => {
        console.log("[Loading] 🚀 Starting fetchProfileAndWeather...");
        setLoading(true);
        setError(null);
        try {
            console.log("[Loading] 📋 Step 1: Getting user session...");
            // Get user
            const {
                data: { session },
            } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) {
                console.log("[Loading] ❌ No user found in session");
                setError("User not found.");
                setLoading(false);
                return;
            }
            console.log(`[Loading] ✅ User authenticated: ${user.id}`);

            // Get current device location and update profile
            console.log("[Loading] 📍 Step 2: Getting device location...");
            let updatedLatitude: number | null = null;
            let updatedLongitude: number | null = null;

            try {
                // Check if we have location permission
                console.log("[Loading] 🔐 Checking location permissions...");
                const { status } =
                    await Location.getForegroundPermissionsAsync();
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
                    console.log(
                        "[Loading] 💾 Updating profile with new location..."
                    );
                    const { error: updateError } = await supabase
                        .from("profiles")
                        .update({
                            latitude: updatedLatitude,
                            longitude: updatedLongitude,
                        })
                        .eq("id", user.id);

                    if (updateError) {
                        console.warn(
                            "[Loading] ⚠️ Could not update location:",
                            updateError
                        );
                    } else {
                        console.log(
                            "[Loading] ✅ Successfully updated user location"
                        );
                    }
                } else {
                    console.log(
                        "[Loading] ⚠️ Location permission not granted, using stored coordinates"
                    );
                }
            } catch (locationError) {
                console.warn(
                    "[Loading] ❌ Could not get current location:",
                    locationError
                );
            }

            // Get profile (use updated coordinates if available, otherwise use stored)
            console.log("[Loading] 👤 Step 3: Fetching user profile...");
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("latitude,longitude,selfie_urls,points")
                .eq("id", user.id)
                .single();

            if (profileError) {
                console.error("[Loading] ❌ Profile error:", profileError);
                setError(`Profile error: ${profileError.message}`);
                setLoading(false);
                return;
            }

            console.log(
                `[Loading] ✅ Profile loaded: points=${profile?.points || 0}`
            );

            // Use updated coordinates if we got them, otherwise use stored coordinates
            const latitude = updatedLatitude ?? profile?.latitude;
            const longitude = updatedLongitude ?? profile?.longitude;

            if (!latitude || !longitude) {
                console.log("[Loading] ❌ No location coordinates found");
                setError("Location not found.");
                setLoading(false);
                return;
            }

            console.log(
                `[Loading] 📍 Using coordinates: ${latitude}, ${longitude}`
            );

            setSelfieUrls(profile.selfie_urls || null);
            setUserPoints(profile.points || 0);

            // Get user's timezone and local hour
            console.log(
                "[Loading] 🕐 Step 4: Calculating timezone and local time..."
            );
            let localHour = 12;
            try {
                const timezone = tzlookup(latitude, longitude);
                const localTime = DateTime.now().setZone(timezone);
                localHour = localTime.hour;
                console.log(
                    `[Loading] ✅ Timezone: ${timezone}, Local hour: ${localHour}`
                );
            } catch (e) {
                console.warn(
                    "[Loading] ⚠️ Could not determine timezone from lat/lon",
                    e
                );
            }
            setBgColor(getBackgroundColor(localHour));

            // OPTIMIZATION: Fetch weather and forecast in a single API call
            console.log(
                "[Loading] 🌤️ Step 5: Fetching weather and forecast data..."
            );
            let weatherData: any;
            try {
                weatherData = await WeatherService.fetchWeatherData(
                    latitude,
                    longitude
                );

                // Set current weather
                setWeather(weatherData.current);

                // Set forecast data
                setForecast(weatherData.forecast);

                // Set forecast summary
                setForecastSummary(
                    weatherData.forecast[0]?.weather?.[0]?.description
                        ? weatherData.forecast[0].weather[0].description
                              .charAt(0)
                              .toUpperCase() +
                              weatherData.forecast[0].weather[0].description.slice(
                                  1
                              )
                        : ""
                );

                console.log(
                    "[Loading] ✅ Weather and forecast loaded in single request"
                );

                // Update user's weather in Supabase
                console.log(
                    "[Loading] 💾 Step 7: Updating user's weather in database..."
                );
                await WeatherService.updateUserWeatherInDatabase(
                    user.id,
                    weatherData
                );
            } catch (error) {
                console.error(
                    "[Loading] ❌ Error fetching weather data:",
                    error
                );
                setError("Failed to fetch weather data.");
                setLoading(false);
                return;
            }
            // Fetch user's contacts and find friends
            console.log("[Loading] 📞 Step 6: Fetching user's contacts...");
            const allContacts = await ContactsService.fetchUserContacts(
                user.id
            );
            console.log(
                `[Loading] ✅ Total contacts retrieved: ${allContacts.length}`
            );

            console.log(
                "[Loading] 🔍 Step 7: Processing contacts and finding friends..."
            );
            const friendsWithNamesAndCities =
                await ContactsService.findFriendsFromContacts(
                    allContacts,
                    user.id
                );
            console.log(
                `[Loading] ✅ Friends with cities loaded: ${friendsWithNamesAndCities.length}`
            );
            setFriendsWeather(friendsWithNamesAndCities);

            // Fetch planted plants for each friend and the current user
            console.log("[Loading] 🌱 Step 9: Fetching planted plants...");

            // TEST: Direct query to check if Will's plants exist
            console.log(
                `[Loading] 🧪 Testing direct query for Will's plants...`
            );
            const { data: testPlants, error: testError } = await supabase
                .from("planted_plants")
                .select("id, garden_owner_id, planted_at")
                .eq("garden_owner_id", "35955916-f479-4721-86f8-54057258c8b4")
                .is("harvested_at", null);

            if (testError) {
                console.error(`[Loading] ❌ Test query error:`, testError);
            } else {
                console.log(
                    `[Loading] 🧪 Test query found ${testPlants?.length || 0} plants for Will`
                );
            }

            // OPTIMIZATION: Batch fetch all plants instead of sequential queries
            const allUserIds = [
                user.id,
                ...friendsWithNamesAndCities.map((friend) => friend.id),
            ];
            console.log(
                `[Loading] 🚀 Batch fetching plants for ${allUserIds.length} users (${friendsWithNamesAndCities.length} friends + current user)`
            );

            const plantsData =
                await GardenService.fetchAllPlantedPlantsBatch(allUserIds);

            console.log(
                `[Loading] ✅ All plants loaded for ${Object.keys(plantsData).length} users`
            );
            setPlantedPlants(plantsData);
        } catch (err) {
            console.error("[Loading] ❌ Weather fetch error:", err);
            setError(
                `Failed to fetch weather: ${err instanceof Error ? err.message : "Unknown error"}`
            );
        } finally {
            console.log("[Loading] 🎉 Loading process completed!");
            setLoading(false);
        }
    };

    // Get current user ID
    const getCurrentUser = async () => {
        console.log("[App] 👤 Getting current user...");
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (user) {
            console.log(`[App] ✅ Current user: ${user.id}`);
            setCurrentUserId(user.id);
        } else {
            console.log("[App] ❌ No authenticated user found");
        }
    };

    useEffect(() => {
        console.log("[App] 🚀 App initialization started...");

        initializeApp();

        // Set up periodic growth updates (every 5 minutes)
        console.log("[App] ⏰ Setting up periodic growth updates...");
        const growthInterval = setInterval(
            () => {
                console.log("[App] 🔄 Running periodic growth update...");
                GardenService.updatePlantGrowth();
            },
            5 * 60 * 1000
        ); // 5 minutes

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
                    const updatedPlants =
                        await GardenService.fetchPlantedPlants(
                            realtimeGardenOwnerId
                        );
                    setPlantedPlants((prev) => ({
                        ...prev,
                        [realtimeGardenOwnerId]: updatedPlants,
                    }));
                }
            )
            .subscribe();

        return () => {
            console.log("[App] 🧹 Cleaning up app resources...");
            clearInterval(growthInterval);
            supabase.removeChannel(subscription);
        };
    }, []);

    // Helper to format hour label
    function getHourLabel(dtTxt: string, idx: number) {
        if (idx === 0) return "Now";
        const date = new Date(dtTxt);
        let hour = date.getHours();
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12;
        if (hour === 0) hour = 12;
        return `${hour}${ampm}`;
    }

    // Forecast Section as a component
    function ForecastSection() {
        if (!forecast || forecast.length === 0) return null;
        return (
            <View
                style={{ marginTop: 10, marginHorizontal: 5, marginBottom: 10 }}
            >
                <View
                    style={{
                        backgroundColor: "#4A90E2",
                        borderRadius: 16,
                        padding: 20,
                        paddingRight: 0,
                        opacity: 1,
                    }}
                >
                    {/* Optionally add a summary here if you want */}
                    <FlatList
                        data={[
                            {
                                now: true,
                                ...weather,
                                dt_txt: new Date().toISOString(),
                                main: weather?.main,
                                weather: weather?.weather,
                            },
                        ].concat(forecast)}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item, idx) =>
                            item.dt_txt || idx.toString()
                        }
                        renderItem={({ item, index }) => {
                            const temp = item.main?.temp
                                ? Math.round(item.main.temp)
                                : "--";
                            const icon = item.weather?.[0]?.icon;
                            const iconUrl = icon
                                ? `https://openweathermap.org/img/wn/${icon}@2x.png`
                                : undefined;
                            return (
                                <View
                                    style={{
                                        alignItems: "center",
                                        marginRight: 16,
                                        minWidth: 60,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#fff",
                                            fontWeight: "bold",
                                            marginBottom: 4,
                                        }}
                                    >
                                        {getHourLabel(item.dt_txt, index)}
                                    </Text>
                                    {iconUrl && (
                                        <Image
                                            source={{ uri: iconUrl }}
                                            style={{
                                                width: 40,
                                                height: 40,
                                                marginBottom: 2,
                                            }}
                                        />
                                    )}
                                    <Text
                                        style={{
                                            color: "#fff",
                                            fontSize: 18,
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {temp}°
                                    </Text>
                                </View>
                            );
                        }}
                    />
                </View>
            </View>
        );
    }

    // Before rendering FlatList:
    const friendsData = [...friendsWeather, { type: "add-friends" }];

    // Handler for planting
    const handlePlantPress = (friendId: string, slotIdx: number) => {
        setSelectedFriendId(friendId);
        setSelectedSlot(slotIdx);
        setShowPlantPicker(true);
    };
    const handleSelectPlant = async (plantId: string) => {
        if (!selectedFriendId || selectedSlot === null) {
            console.error("[Plant] No friend or slot selected for planting");
            setShowPlantPicker(false);
            return;
        }

        // Close modal immediately for better UX
        setShowPlantPicker(false);
        const friendId = selectedFriendId;
        const slotIdx = selectedSlot;
        setSelectedFriendId(null);
        setSelectedSlot(null);

        try {
            // Get current user
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                console.error("[Plant] No authenticated user found");
                return;
            }

            // Check if slot is already occupied
            const { data: slotPlants, error: slotError } = await supabase
                .from("planted_plants")
                .select("id")
                .eq("garden_owner_id", friendId)
                .eq("slot", slotIdx)
                .is("harvested_at", null);
            if (slotError) {
                console.error(
                    "[Plant] Error checking slot occupancy:",
                    slotError
                );
                Alert.alert("Error", "Could not check slot occupancy");
                return;
            }
            if (slotPlants && slotPlants.length > 0) {
                Alert.alert("Slot Occupied", "This pot is already occupied");
                return;
            }

            // Plant the seed
            console.log(
                `[Plant] Planting new plant in garden ${friendId} slot ${slotIdx} (plantId: ${plantId})`
            );
            const newPlant = await GardenService.plantSeed({
                friendId: selectedFriendId,
                slotIdx: selectedSlot,
                plantId,
                userId: user.id,
                availablePlants,
            });

            if (newPlant) {
                setPlantedPlants((prev) => ({
                    ...prev,
                    [selectedFriendId]: [
                        ...(prev[selectedFriendId] || []),
                        newPlant,
                    ],
                }));
            }

            // Only update growth if needed (don't call updatePlantGrowth here)
            // The real-time subscription will handle any necessary updates
        } catch (error: any) {
            if (error.message === "Slot Occupied") {
                Alert.alert("Slot Occupied", "This pot is already occupied");
            } else {
                Alert.alert("Error", error.message || "Failed to plant seed");
            }
            return;
        }
    };
    const handlePlantDetailsPress = async (
        plant: any,
        friendWeather: string
    ) => {
        let planterName = "Unknown";
        if (plant.planter_id) {
            const { data: profile, error } = await supabase
                .from("profiles")
                .select("name")
                .eq("id", plant.planter_id)
                .single();
            if (profile && profile.name) {
                planterName = profile.name;
            }
        }
        setSelectedPlanterName(planterName);
        setSelectedPlant({ ...plant, friendWeather });
        setShowPlantDetails(true);
    };

    const handleClosePlantDetails = () => {
        setShowPlantDetails(false);
        setSelectedPlant(null);
    };

    const handlePlantHarvested = async () => {
        console.log("handlePlantHarvested called - refreshing plant data...");

        // Refresh user's points after harvest
        if (currentUserId) {
            try {
                const points =
                    await GardenService.refreshUserPoints(currentUserId);
                setUserPoints(points);
                console.log("Updated user points:", points);
            } catch (error) {
                console.error("Error refreshing user points:", error);
            }
        }

        // OPTIMIZATION: Use batch query to refresh all plants
        if (currentUserId && friendsWeather.length > 0) {
            const allUserIds = [
                currentUserId,
                ...friendsWeather.map((friend) => friend.id),
            ];
            console.log(
                `[Harvest] 🚀 Batch refreshing plants for ${allUserIds.length} users...`
            );

            const plantsData =
                await GardenService.fetchAllPlantedPlantsBatch(allUserIds);
            setPlantedPlants(plantsData);
            console.log("Plant data refresh completed");
        }
    };

    const handleRefreshGrowth = async () => {
        console.log("Manual growth refresh triggered");
        await GardenService.updatePlantGrowth();

        // OPTIMIZATION: Use batch query to refresh all plants
        if (currentUserId && friendsWeather.length > 0) {
            const allUserIds = [
                currentUserId,
                ...friendsWeather.map((friend) => friend.id),
            ];
            console.log(
                `[Growth] 🚀 Batch refreshing plants for ${allUserIds.length} users...`
            );

            const plantsData =
                await GardenService.fetchAllPlantedPlantsBatch(allUserIds);
            setPlantedPlants(plantsData);
        }

        Alert.alert("Growth Updated", "Plant growth has been refreshed!");
    };

    const handleClosePlantPicker = () => {
        setShowPlantPicker(false);
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => setShowMenu(true)}
                            className="p-2 ml-4"
                        >
                            <Text style={{ fontSize: 24, opacity: 0.5 }}>
                                ☰
                            </Text>
                        </TouchableOpacity>
                    ),
                }}
            />
            <View style={{ flex: 1, backgroundColor: bgColor }}>
                {/* Single FlatList containing both user card and friends */}
                <FlatList
                    data={[
                        { type: "user-card", id: "user-card" },
                        ...friendsData,
                    ]}
                    keyExtractor={(item, idx) =>
                        item.id || item.type || idx.toString()
                    }
                    style={{
                        flex: 1,
                    }}
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingBottom: 16,
                    }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, index }) => {
                        // User card as first item
                        if (item.type === "user-card") {
                            return (
                                <UserCard
                                    weather={weather}
                                    selfieUrls={selfieUrls}
                                    userPoints={userPoints}
                                    currentUserId={currentUserId}
                                    plantedPlants={plantedPlants}
                                    onPlantPress={handlePlantPress}
                                    onPlantDetailsPress={
                                        handlePlantDetailsPress
                                    }
                                    forecastData={userFiveDayData}
                                    loading={loading}
                                    error={error}
                                    cardWidth={cardWidth}
                                />
                            );
                        }

                        // Add friends card
                        if (item.type === "add-friends") {
                            return (
                                <AddFriendsCard
                                    onShare={async () => {
                                        await Share.share({
                                            message:
                                                "I want to be your Fair Weather Friend\nhttp://willdennis.com",
                                        });
                                    }}
                                    cardWidth={cardWidth}
                                />
                            );
                        }

                        // Friend cards
                        return (
                            <FriendCard
                                friend={item}
                                plantedPlants={plantedPlants}
                                onPlantPress={handlePlantPress}
                                onPlantDetailsPress={handlePlantDetailsPress}
                                forecastData={friendForecasts[item.id] || []}
                                cardWidth={cardWidth}
                                onFetchForecast={fetchFriendForecast}
                            />
                        );
                    }}
                    ListEmptyComponent={
                        <Text className="ml-4 text-gray-500">
                            No friends using the app yet.
                        </Text>
                    }
                />
            </View>

            {/* Dropdown Menu */}
            <DropdownMenu
                visible={showMenu}
                onClose={() => setShowMenu(false)}
                onRefreshContacts={handleRefreshContacts}
                onRefreshGrowth={handleRefreshGrowth}
                onLogout={handleLogout}
                refreshingContacts={refreshingContacts}
            />
            {/* PLANT PICKER MODAL */}
            <PlantPicker
                visible={showPlantPicker}
                onClose={handleClosePlantPicker}
                onSelectPlant={handleSelectPlant}
                weatherCondition={""}
                plants={availablePlants}
            />

            {/* PLANT DETAILS MODAL */}
            <PlantDetailsModal
                visible={showPlantDetails}
                onClose={handleClosePlantDetails}
                plant={selectedPlant}
                onHarvest={handlePlantHarvested}
                currentUserId={currentUserId || undefined}
                friendWeather={selectedPlant?.friendWeather}
                planterName={selectedPlanterName}
            />
        </>
    );
}
