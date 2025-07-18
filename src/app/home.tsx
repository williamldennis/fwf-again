import { useEffect, useState, useMemo, useRef } from "react";
import {
    View,
    Text,
    Alert,
    TouchableOpacity,
    FlatList,
    Dimensions,
    Share,
    Image,
    AppState,
} from "react-native";
import { Stack, router } from "expo-router";
import React from "react";
import { supabase } from "../utils/supabase";
import { useHeaderHeight } from "@react-navigation/elements";

// Import our custom hooks
import { useAuth } from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import { useFriends } from "../hooks/useFriends";
import { useGardenData } from "../hooks/useGardenData";
import { useAvailablePlants } from "../hooks/useAvailablePlants";
import { useXP } from "../hooks/useXP";
import { useWeatherData } from "../hooks/useWeatherData";
import { XPService } from "../services/xpService";
import XPToast from "../components/XPToast";
import AchievementToast from "../components/AchievementToast";

import GardenArea from "../components/GardenArea";
import PlantPicker from "../components/PlantPicker";
import PlantDetailsModal from "../components/PlantDetailsModal";
import UserCard from "../components/UserCard";
import FriendCard from "../components/FriendCard";
import AddFriendsCard from "../components/AddFriendsCard";
import CardStack from "../components/CardStack";
import DropdownMenu from "../components/DropdownMenu";
import HeaderBar from "../components/HeaderBar";
import SkeletonCard from "../components/SkeletonCard";
import AchievementDrawer from "../components/AchievementDrawer";
import { Plant } from "../types/garden";
import { GrowthService } from "../services/growthService";
import { TimeCalculationService } from "../services/timeCalculationService";
import { WeatherService } from "../services/weatherService";
import { ContactsService } from "../services/contactsService";
import { Friend } from "../services/contactsService";
import FiveDayForecast from "../components/FiveDayForecast";
import { GardenService } from "../services/gardenService";
import { AchievementService } from "../services/achievementService";

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

const WEATHER_CARD_HEIGHT = 540; // adjust as needed for your weather card height

// Utility to aggregate 3-hourly forecast to 5 daily objects
function aggregateToFiveDay(forecastList: any[]): any[] {
    return WeatherService.aggregateToFiveDay(forecastList);
}

export default function Home() {
    // Use our custom hooks
    const { user, currentUserId } = useAuth();
    const { profile: userProfile, updatePoints } =
        useUserProfile(currentUserId);
    const { friends, refreshFriends } = useFriends(currentUserId);
    const {
        plantedPlants,
        updateSingleGarden,
        updateAllGardens,
        updateGrowth,
    } = useGardenData(currentUserId, friends);
    const {
        availablePlants,
        fetchPlants,
        refreshPlants,
        loading: availablePlantsLoading,
    } = useAvailablePlants();
    const {
        weather,
        forecast,
        cityName,
        backgroundColor,
        loading: weatherLoading,
        error: weatherError,
        lastUpdated,
        fetchWeatherData,
        refreshWeather,
        clearError: clearWeatherError,
    } = useWeatherData(
        userProfile?.latitude,
        userProfile?.longitude,
        currentUserId
    );

    // XP data hook
    const {
        xpData,
        loading: xpLoading,
        error: xpError,
        refreshXP,
    } = useXP(currentUserId);

    // Daily XP award function
    const awardDailyXP = async () => {
        if (!currentUserId) {
            console.log("[XP] ❌ No currentUserId available for daily XP");
            return;
        }

        console.log("[XP] 🌅 Starting daily XP check for user:", currentUserId);

        try {
            console.log("[XP] 🌅 Checking daily XP eligibility...");
            const result = await XPService.awardDailyXP(currentUserId);

            console.log("[XP] 📊 Daily XP result:", result);

            if (result.success) {
                console.log("[XP] ✅ Daily XP awarded:", result.newTotalXP);
                // Refresh XP data to update the display
                await refreshXP();

                // Show toast notification
                setXpToastMessage("Daily Reward!");
                setXpToastSubtitle("You opened the app today!");
                setXpToastAmount(5);
                setShowXPToast(true);

                console.log("[XP] 🎉 +5 XP Daily Reward!");
            } else {
                console.log(
                    "[XP] ⏰ Daily XP already awarded today or failed:",
                    result.error
                );
            }
        } catch (error) {
            console.error("[XP] ❌ Error awarding daily XP:", error);
        }
    };

    // Planting XP award function
    const awardPlantingXP = async (
        plantId: string,
        plantName: string,
        weatherCondition: string,
        friendId: string
    ) => {
        if (!currentUserId) {
            console.log("[XP] ❌ No currentUserId available for planting XP");
            return;
        }

        console.log(
            "[XP] 🌱 Starting planting XP award for user:",
            currentUserId,
            {
                plantId,
                plantName,
                weatherCondition,
                friendId,
                isOwnGarden: friendId === currentUserId,
            }
        );

        try {
            let totalXP = 0;
            let xpBreakdown: string[] = [];
            let errors: string[] = [];

            // 1. Award base XP for planting (10 XP)
            try {
                const baseXP = 10;
                const baseResult = await XPService.awardXP(
                    currentUserId,
                    baseXP,
                    "plant_seed",
                    `Planted ${plantName}`,
                    { plant_id: plantId, plant_name: plantName }
                );

                if (baseResult.success) {
                    totalXP += baseXP;
                    xpBreakdown.push(`+${baseXP} XP for planting`);
                    console.log("[XP] ✅ Base planting XP awarded:", baseXP);
                } else {
                    const errorMsg = `Base XP failed: ${baseResult.error}`;
                    errors.push(errorMsg);
                    console.error(
                        "[XP] ❌ Failed to award base planting XP:",
                        baseResult.error
                    );
                }
            } catch (error) {
                const errorMsg = `Base XP exception: ${error instanceof Error ? error.message : "Unknown error"}`;
                errors.push(errorMsg);
                console.error(
                    "[XP] ❌ Exception awarding base planting XP:",
                    error
                );
            }

            // 2. Check for weather bonus XP
            try {
                const selectedPlant = availablePlants.find(
                    (p) => p.id === plantId
                );
                if (selectedPlant) {
                    const weatherBonus = GrowthService.getWeatherBonus(
                        selectedPlant,
                        weatherCondition
                    );

                    // Log weather bonus calculation for debugging
                    console.log(`[XP] 🌤️ Weather bonus calculation:`, {
                        plant: plantName,
                        weather_condition: weatherCondition,
                        weather_bonus: weatherBonus,
                        plant_weather_prefs: selectedPlant.weather_bonus,
                    });

                    // Consider 1.5x or higher as optimal weather for bonus XP
                    const isOptimalWeather = weatherBonus >= 1.5;

                    if (isOptimalWeather) {
                        try {
                            const weatherBonusXP = 5;
                            const weatherResult = await XPService.awardXP(
                                currentUserId,
                                weatherBonusXP,
                                "weather_bonus_planting",
                                `Planted ${plantName} in optimal weather (${weatherCondition})`,
                                {
                                    plant_id: plantId,
                                    plant_name: plantName,
                                    weather_condition: weatherCondition,
                                    weather_bonus: weatherBonus,
                                    is_optimal: true,
                                }
                            );

                            if (weatherResult.success) {
                                totalXP += weatherBonusXP;
                                xpBreakdown.push(
                                    `+${weatherBonusXP} XP optimal weather`
                                );
                                console.log(
                                    "[XP] ✅ Weather bonus XP awarded:",
                                    weatherBonusXP,
                                    `(${plantName} in ${weatherCondition} - ${weatherBonus}x bonus)`
                                );
                            } else {
                                const errorMsg = `Weather bonus XP failed: ${weatherResult.error}`;
                                errors.push(errorMsg);
                                console.error(
                                    "[XP] ❌ Failed to award weather bonus XP:",
                                    weatherResult.error
                                );
                            }
                        } catch (error) {
                            const errorMsg = `Weather bonus XP exception: ${error instanceof Error ? error.message : "Unknown error"}`;
                            errors.push(errorMsg);
                            console.error(
                                "[XP] ❌ Exception awarding weather bonus XP:",
                                error
                            );
                        }
                    } else {
                        console.log(
                            `[XP] ℹ️ No weather bonus XP - ${plantName} in ${weatherCondition} (${weatherBonus}x bonus, need 1.5x+)`
                        );
                    }
                } else {
                    const errorMsg = `Plant not found for XP calculation: ${plantId}`;
                    errors.push(errorMsg);
                    console.warn(
                        `[XP] ⚠️ Plant not found for XP calculation:`,
                        plantId
                    );
                }
            } catch (error) {
                const errorMsg = `Weather bonus calculation exception: ${error instanceof Error ? error.message : "Unknown error"}`;
                errors.push(errorMsg);
                console.error(
                    "[XP] ❌ Exception in weather bonus calculation:",
                    error
                );
            }

            // 3. Award social XP for planting in friend gardens (25 XP)
            try {
                const isFriendGarden = friendId !== currentUserId;

                if (isFriendGarden) {
                    const socialXP = 25;
                    const socialResult = await XPService.awardXP(
                        currentUserId,
                        socialXP,
                        "social_planting",
                        `Planted ${plantName} in friend's garden`,
                        {
                            plant_id: plantId,
                            plant_name: plantName,
                            garden_owner_id: friendId,
                            planter_id: currentUserId,
                            is_friend_garden: true,
                        }
                    );

                    if (socialResult.success) {
                        totalXP += socialXP;
                        xpBreakdown.push(`+${socialXP} XP social planting`);
                        console.log(
                            "[XP] ✅ Social XP awarded:",
                            socialXP,
                            `(${plantName} in friend's garden)`
                        );
                    } else {
                        const errorMsg = `Social XP failed: ${socialResult.error}`;
                        errors.push(errorMsg);
                        console.error(
                            "[XP] ❌ Failed to award social XP:",
                            socialResult.error
                        );
                    }
                } else {
                    console.log(
                        "[XP] ℹ️ No social XP - planting in own garden"
                    );
                }
            } catch (error) {
                const errorMsg = `Social XP exception: ${error instanceof Error ? error.message : "Unknown error"}`;
                errors.push(errorMsg);
                console.error("[XP] ❌ Exception awarding social XP:", error);
            }

            // 4. Check and award achievements
            let achievementResult = { xpAwarded: 0, unlocked: [] as string[] };
            try {
                const isFriendGarden = friendId !== currentUserId;
                const selectedPlant = availablePlants.find(
                    (p) => p.id === plantId
                );
                const weatherBonus = selectedPlant
                    ? GrowthService.getWeatherBonus(
                          selectedPlant,
                          weatherCondition
                      )
                    : 1.0;

                // Enhanced achievement context with all relevant data
                const achievementContext = {
                    // Plant information
                    plant_type: plantId,
                    plant_name: plantName,
                    plant_id: plantId,

                    // Weather information
                    weather_condition: weatherCondition,
                    weather_bonus: weatherBonus,
                    is_optimal_weather: weatherBonus >= 1.5,

                    // Social information
                    friend_garden: isFriendGarden,
                    garden_owner_id: friendId,
                    planter_id: currentUserId,

                    // Achievement tracking data
                    action_type: "plant_seed",
                    action_count: 1, // This will be calculated by the service

                    // Additional context for specific achievements
                    unique_plants: true, // For collection achievements
                    friend_gardens: isFriendGarden ? [friendId] : [], // For social achievements
                    weather_mastery: {
                        plant: plantName,
                        weather: weatherCondition,
                        bonus: weatherBonus,
                        is_optimal: weatherBonus >= 1.5,
                    },
                };

                console.log(
                    "[XP] 🏆 Checking achievements with enhanced context:",
                    achievementContext
                );

                achievementResult =
                    await AchievementService.checkAndAwardAchievements(
                        currentUserId,
                        "plant_seed",
                        achievementContext
                    );

                if (achievementResult.xpAwarded > 0) {
                    totalXP += achievementResult.xpAwarded;
                    xpBreakdown.push(
                        `+${achievementResult.xpAwarded} XP achievements`
                    );
                    console.log(
                        "[XP] 🏆 Achievement XP awarded:",
                        achievementResult.xpAwarded
                    );
                    console.log(
                        "[XP] 🏆 Unlocked achievements:",
                        achievementResult.unlocked
                    );
                }
            } catch (error) {
                const errorMsg = `Achievement check exception: ${error instanceof Error ? error.message : "Unknown error"}`;
                errors.push(errorMsg);
                console.error(
                    "[XP] ❌ Exception checking achievements:",
                    error
                );
            }

            // 5. Refresh XP data and show toast
            try {
                if (totalXP > 0) {
                    await refreshXP();

                    // Enhanced toast notification with better messaging
                    let toastMessage: string;
                    let toastSubtitle: string | undefined;

                    if (xpBreakdown.length === 1) {
                        // Single XP source
                        toastMessage = "Planting Reward!";
                        toastSubtitle = xpBreakdown[0];
                    } else if (xpBreakdown.length === 2) {
                        // Two XP sources (e.g., base + weather bonus)
                        toastMessage = "Planting Reward!";
                        toastSubtitle = xpBreakdown.join(" + ");
                    } else {
                        // Multiple XP sources (base + weather + social + achievements)
                        const baseAndWeather = xpBreakdown.filter(
                            (x) =>
                                x.includes("planting") ||
                                x.includes("optimal weather")
                        );
                        const socialXP = xpBreakdown.filter((x) =>
                            x.includes("social planting")
                        );
                        const achievementXP = xpBreakdown.filter((x) =>
                            x.includes("achievements")
                        );

                        if (achievementXP.length > 0) {
                            toastMessage = "Planting Reward + Achievements!";
                            const baseWeatherSocial = [
                                ...baseAndWeather,
                                ...socialXP,
                            ];
                            toastSubtitle = `${baseWeatherSocial.join(" + ")} + ${achievementXP.join(" + ")}`;
                        } else if (socialXP.length > 0) {
                            toastMessage = "Planting Reward!";
                            toastSubtitle = xpBreakdown.join(" + ");
                        } else {
                            toastMessage = "Planting Reward!";
                            toastSubtitle = xpBreakdown.join(" + ");
                        }
                    }

                    // Set toast with enhanced information
                    setXpToastMessage(toastMessage);
                    setXpToastSubtitle(toastSubtitle);
                    setXpToastAmount(totalXP);
                    setShowXPToast(true);

                    // Log detailed XP breakdown
                    console.log("[XP] 🎉 Planting XP Breakdown:", {
                        total: totalXP,
                        breakdown: xpBreakdown,
                        message: toastMessage,
                        subtitle: toastSubtitle,
                    });

                    // Log achievement details if any were unlocked
                    if (achievementResult.unlocked.length > 0) {
                        console.log(
                            "[XP] 🏆 New achievements unlocked:",
                            achievementResult.unlocked
                        );

                        // Show achievement toast
                        const achievementDetails =
                            AchievementService.getAchievementsByIds(
                                achievementResult.unlocked
                            );
                        setAchievementToastData({
                            achievements: achievementDetails,
                            totalXPAwarded: achievementResult.xpAwarded,
                        });
                        setShowAchievementToast(true);
                    }
                } else {
                    console.log("[XP] ℹ️ No XP awarded for planting");
                }
            } catch (error) {
                const errorMsg = `Toast/refresh exception: ${error instanceof Error ? error.message : "Unknown error"}`;
                errors.push(errorMsg);
                console.error("[XP] ❌ Exception in toast/refresh:", error);
            }

            // 6. Log final summary with any errors
            if (errors.length > 0) {
                console.warn("[XP] ⚠️ Planting XP completed with errors:", {
                    totalXP,
                    errors,
                    plantName,
                    weatherCondition,
                });
            } else {
                console.log("[XP] ✅ Planting XP completed successfully:", {
                    totalXP,
                    plantName,
                    weatherCondition,
                });
            }
        } catch (error) {
            console.error("[XP] ❌ Error awarding planting XP:", error);
            // Don't throw - XP failures shouldn't break planting
        }
    };

    // Local state for UI interactions
    const [showMenu, setShowMenu] = useState(false);
    const [refreshingContacts, setRefreshingContacts] = useState(false);
    const headerHeight = useHeaderHeight();
    const screenHeight = Dimensions.get("window").height;
    const screenWidth = Dimensions.get("window").width;
    const cardWidth = screenWidth; // Full width for TikTok-style scroll
    const [forecastSummary, setForecastSummary] = useState<string>("");
    const [showPlantPicker, setShowPlantPicker] = useState(false);
    const [showPlantDetails, setShowPlantDetails] = useState(false);
    const [selectedFriendId, setSelectedFriendId] = useState<string | null>(
        null
    );
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [selectedPlant, setSelectedPlant] = useState<any>(null);
    const [selectedPlanterName, setSelectedPlanterName] =
        useState<string>("Unknown");

    // XP Toast state
    const [showXPToast, setShowXPToast] = useState(false);
    const [xpToastMessage, setXpToastMessage] = useState("");
    const [xpToastSubtitle, setXpToastSubtitle] = useState<string | undefined>(
        undefined
    );
    const [xpToastAmount, setXpToastAmount] = useState<number | undefined>(
        undefined
    );

    // Achievement Toast state
    const [showAchievementToast, setShowAchievementToast] = useState(false);
    const [achievementToastData, setAchievementToastData] = useState<{
        achievements: any[];
        totalXPAwarded: number;
    }>({ achievements: [], totalXPAwarded: 0 });

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

    // Achievement drawer state
    const [showAchievementDrawer, setShowAchievementDrawer] = useState(false);

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
            await refreshFriends();
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

    // Initialize app on mount and set up periodic growth updates
    const hasInitialized = useRef(false);
    useEffect(() => {
        if (!hasInitialized.current) {
            console.log("[App] 🚀 Starting app initialization...");
            hasInitialized.current = true;

            // Initial growth update on app load
            updateGrowth();

            // Award daily XP on app launch
            console.log(
                "[App] 🎯 Attempting daily XP award, currentUserId:",
                currentUserId
            );
            if (currentUserId) {
                console.log("[App] 🎯 Calling awardDailyXP...");
                awardDailyXP();
            } else {
                console.log("[App] ⏳ No currentUserId yet, skipping daily XP");
            }
        }

        // Set up periodic growth updates (every 5 minutes)
        console.log("[App] ⏰ Setting up periodic growth updates...");
        const growthInterval = setInterval(
            () => {
                console.log("[App] 🔄 Running periodic growth update...");
                updateGrowth();
            },
            5 * 60 * 1000
        ); // 5 minutes

        // Cleanup interval on unmount
        return () => {
            console.log("[App] 🧹 Cleaning up growth interval...");
            clearInterval(growthInterval);
        };
    }, [updateGrowth]); // Include updateGrowth in dependencies

    // Handle app state changes (foreground/background)
    useEffect(() => {
        const handleAppStateChange = (nextAppState: string) => {
            if (nextAppState === "active") {
                console.log(
                    "[App] 📱 App came to foreground, updating growth..."
                );
                updateGrowth();

                // Check for daily XP when app comes to foreground
                if (currentUserId) {
                    awardDailyXP();
                }
            }
        };

        const subscription = AppState.addEventListener(
            "change",
            handleAppStateChange
        );

        return () => {
            subscription?.remove();
        };
    }, [updateGrowth, currentUserId]);

    // Award daily XP when currentUserId becomes available (if not already done)
    useEffect(() => {
        if (currentUserId && hasInitialized.current) {
            console.log(
                "[App] 🎯 currentUserId became available, checking daily XP..."
            );
            awardDailyXP();
        }
    }, [currentUserId]);

    // Set forecast summary when weather data is available
    useEffect(() => {
        if (forecast.length > 0) {
            setForecastSummary(
                forecast[0]?.weather?.[0]?.description
                    ? forecast[0].weather[0].description
                          .charAt(0)
                          .toUpperCase() +
                          forecast[0].weather[0].description.slice(1)
                    : ""
            );
        }
    }, [forecast]);

    // Combined loading state - only show loading for initial app setup
    // Removed isLoading variable - no longer needed

    // Combined error state
    const error = weatherError;

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
                // Update growth after planting to ensure new plants start correctly
                await updateGrowth();
                // Only update the specific garden that was planted in
                await updateSingleGarden(friendId);

                // Get the friend's weather condition for XP calculation
                let friendWeatherCondition = "clear"; // Default fallback
                try {
                    if (friendId === currentUserId) {
                        // Planting in own garden - use user's weather
                        friendWeatherCondition =
                            weather?.weather?.[0]?.main || "clear";
                    } else {
                        // Planting in friend's garden - get friend's weather
                        const { data: friendProfile } = await supabase
                            .from("profiles")
                            .select("weather_condition")
                            .eq("id", friendId)
                            .single();
                        friendWeatherCondition =
                            friendProfile?.weather_condition || "clear";
                    }
                } catch (error) {
                    console.warn(
                        "[XP] Could not get friend weather, using default:",
                        error
                    );
                }

                // Award XP for planting (non-blocking)
                awardPlantingXP(
                    plantId,
                    newPlant.plant?.name || "Unknown Plant",
                    friendWeatherCondition,
                    friendId
                ).catch((error) => {
                    console.error(
                        "[XP] Error in planting XP (non-blocking):",
                        error
                    );
                });
            }
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
        console.log("handlePlantHarvested called - updating points...");

        // Update user points after harvest
        if (currentUserId) {
            try {
                await updatePoints();
                console.log("✅ Points updated successfully after harvest");
            } catch (error) {
                console.error("❌ Error updating points after harvest:", error);
            }
        }

        // Real-time subscription will handle garden updates automatically
    };

    const handleRefreshGrowth = async () => {
        console.log("Manual growth refresh triggered");
        await GardenService.updatePlantGrowth();

        // Refresh all data
        await refreshPlants();
        await updateAllGardens();
        await updateGrowth();

        Alert.alert("Growth Updated", "Plant growth has been refreshed!");
    };

    const handleClosePlantPicker = () => {
        setShowPlantPicker(false);
    };

    // Achievement drawer handlers
    const openAchievementDrawer = () => {
        setShowAchievementDrawer(true);
    };

    const closeAchievementDrawer = () => {
        setShowAchievementDrawer(false);
    };

    // Fetch available plants when PlantPicker is opened and not already loaded
    useEffect(() => {
        if (showPlantPicker && availablePlants.length === 0) {
            fetchPlants();
        }
    }, [showPlantPicker, availablePlants.length, fetchPlants]);

    // Show skeleton loading for initial app setup
    // This provides a better user experience than a blank loading screen
    const showSkeletonLoading = weatherLoading || (!userProfile && !weather);

    // TEMPORARY: Force skeleton loading for testing (remove this later)
    const forceSkeletonForTesting = false; // Set to false to disable
    const finalShowSkeleton = showSkeletonLoading || forceSkeletonForTesting;

    // Debug logging for loading states
    console.log("[Home] 🔍 Loading Debug:", {
        weatherLoading,
        userProfile: !!userProfile,
        weather: !!weather,
        showSkeletonLoading,
        finalShowSkeleton,
        friendsCount: friends.length,
    });

    // Show error state
    if (error) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 20,
                }}
            >
                <Text
                    style={{
                        color: "red",
                        textAlign: "center",
                        marginBottom: 20,
                    }}
                >
                    {error}
                </Text>
                <TouchableOpacity
                    onPress={() => {
                        // clearAppError(); // No longer needed
                        clearWeatherError();
                        // initializeApp(); // No longer needed
                    }}
                    style={{
                        backgroundColor: "#007AFF",
                        padding: 15,
                        borderRadius: 8,
                    }}
                >
                    <Text style={{ color: "white", textAlign: "center" }}>
                        Retry
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <>
            <View style={{ flex: 1, backgroundColor }}>
                {/* Custom Header Bar - Absolute positioned for TikTok-style */}
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                    }}
                >
                    <HeaderBar
                        points={userProfile?.points || 0}
                        onMenuPress={() => setShowMenu(true)}
                        onXPPress={openAchievementDrawer}
                        xpData={xpData}
                    />
                </View>
                {/* Progressive Loading Indicators */}
                {(weatherLoading || availablePlantsLoading) &&
                    !finalShowSkeleton && (
                        <View
                            style={{
                                position: "absolute",
                                top: 140, // Adjusted for absolute header
                                right: 20,
                                zIndex: 10,
                                backgroundColor: "rgba(0,0,0,0.8)",
                                borderRadius: 12,
                                padding: 12,
                                flexDirection: "row",
                                alignItems: "center",
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.25,
                                shadowRadius: 4,
                                elevation: 5,
                            }}
                        >
                            <View
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: 6,
                                    borderWidth: 2,
                                    borderColor: "#fff",
                                    borderTopColor: "transparent",
                                    marginRight: 8,
                                }}
                            />
                            <Text
                                style={{
                                    color: "white",
                                    fontSize: 14,
                                    fontWeight: "500",
                                }}
                            >
                                {weatherLoading && "🌤️ Loading weather..."}
                                {availablePlantsLoading &&
                                    "🌱 Loading plants..."}
                            </Text>
                        </View>
                    )}

                {/* Show skeleton loading or actual content */}
                {finalShowSkeleton ? (
                    <View style={{ flex: 1 }}>
                        {/* User card skeleton */}
                        <SkeletonCard width={cardWidth} height={screenHeight} />
                        {/* Friend card skeletons */}
                        {[1, 2, 3].map((i) => (
                            <SkeletonCard
                                key={i}
                                width={cardWidth}
                                height={screenHeight}
                            />
                        ))}
                    </View>
                ) : (
                    <CardStack
                        weather={weather}
                        selfieUrls={userProfile?.selfieUrls || null}
                        userPoints={userProfile?.points || 0}
                        currentUserId={currentUserId}
                        plantedPlants={plantedPlants}
                        onPlantPress={handlePlantPress}
                        onPlantDetailsPress={handlePlantDetailsPress}
                        forecastData={userFiveDayData}
                        loading={weatherLoading}
                        error={weatherError}
                        cardWidth={cardWidth}
                        friends={friends}
                        friendForecasts={friendForecasts}
                        onFetchForecast={fetchFriendForecast}
                        onShare={async () => {
                            await Share.share({
                                message:
                                    "I want to be your Fair Weather Friend\nhttp://willdennis.com",
                            });
                        }}
                    />
                )}
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
                loading={availablePlantsLoading}
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
                onShowXPToast={async (
                    message: string,
                    subtitle: string,
                    amount: number,
                    achievements?: string[]
                ) => {
                    // Add a small delay to ensure modal is fully closed before showing toast
                    setTimeout(() => {
                        setXpToastMessage(message);
                        setXpToastSubtitle(subtitle);
                        setXpToastAmount(amount);
                        setShowXPToast(true);

                        // Show achievement toast if achievements were unlocked
                        if (achievements && achievements.length > 0) {
                            const achievementDetails =
                                AchievementService.getAchievementsByIds(
                                    achievements
                                );
                            setAchievementToastData({
                                achievements: achievementDetails,
                                totalXPAwarded: achievementDetails.reduce(
                                    (total, achievement) =>
                                        total + achievement.xpReward,
                                    0
                                ),
                            });
                            setShowAchievementToast(true);
                        }
                    }, 300); // Increased delay to ensure modal is fully closed
                    await refreshXP();
                }}
            />

            {/* XP TOAST NOTIFICATION */}
            <XPToast
                visible={showXPToast}
                message={xpToastMessage}
                subtitle={xpToastSubtitle}
                xpAmount={xpToastAmount}
                onHide={() => setShowXPToast(false)}
            />

            {/* ACHIEVEMENT TOAST NOTIFICATION */}
            <AchievementToast
                visible={showAchievementToast}
                achievements={achievementToastData.achievements}
                totalXPAwarded={achievementToastData.totalXPAwarded}
                onHide={() => setShowAchievementToast(false)}
            />

            {/* ACHIEVEMENT DRAWER */}
            <AchievementDrawer
                visible={showAchievementDrawer}
                onClose={closeAchievementDrawer}
                userId={currentUserId}
                xpData={xpData}
            />
        </>
    );
}
