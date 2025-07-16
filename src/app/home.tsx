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

// Import our custom hooks
import { useAppInitialization } from "../hooks/useAppInitialization";
import { useWeatherData } from "../hooks/useWeatherData";

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
    const {
        currentUserId,
        availablePlants,
        friendsData,
        plantedPlants,
        userProfile,
        loading: appLoading,
        error: appError,
        isInitialized,
        initializeApp,
        refreshData,
        clearError: clearAppError,
    } = useAppInitialization();

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
    } = useWeatherData();

    // Local state for UI interactions
    const [showMenu, setShowMenu] = useState(false);
    const [refreshingContacts, setRefreshingContacts] = useState(false);
    const headerHeight = useHeaderHeight();
    const cardWidth = Dimensions.get("window").width - 32; // 16px margin on each side
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
            await refreshData();
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

    // Initialize app on mount
    useEffect(() => {
        console.log("[App] 🚀 Starting app initialization...");
        initializeApp();
    }, [initializeApp]);

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

    // Combined loading state
    const isLoading = appLoading || weatherLoading;

    // Combined error state
    const error = appError || weatherError;

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

    // Before rendering FlatList:
    const friendsListData = [...friendsData, { type: "add-friends" }];

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
                // Refresh data to get updated plants
                await refreshData();
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
        console.log("handlePlantHarvested called - refreshing plant data...");

        // Refresh all data after harvest
        await refreshData();
    };

    const handleRefreshGrowth = async () => {
        console.log("Manual growth refresh triggered");
        await GardenService.updatePlantGrowth();

        // Refresh all data
        await refreshData();

        Alert.alert("Growth Updated", "Plant growth has been refreshed!");
    };

    const handleClosePlantPicker = () => {
        setShowPlantPicker(false);
    };

    // Show loading state
    if (isLoading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Text>Loading...</Text>
            </View>
        );
    }

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
                        clearAppError();
                        clearWeatherError();
                        initializeApp();
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
            <View style={{ flex: 1, backgroundColor }}>
                {/* Single FlatList containing both user card and friends */}
                <FlatList
                    data={[
                        { type: "user-card", id: "user-card" },
                        ...friendsListData,
                    ]}
                    keyExtractor={(item, idx) =>
                        item.id || item.type || idx.toString()
                    }
                    style={{ flex: 1 }}
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
                                    selfieUrls={userProfile?.selfieUrls || null}
                                    userPoints={userProfile?.points || 0}
                                    currentUserId={currentUserId}
                                    plantedPlants={plantedPlants}
                                    onPlantPress={handlePlantPress}
                                    onPlantDetailsPress={
                                        handlePlantDetailsPress
                                    }
                                    forecastData={userFiveDayData}
                                    loading={isLoading}
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
