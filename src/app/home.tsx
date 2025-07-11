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
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";
import GardenArea from "../components/GardenArea";
import PlantPicker from "../components/PlantPicker";
import PlantDetailsModal from "../components/PlantDetailsModal";
import UserCard from "../components/UserCard";
import FriendCard from "../components/FriendCard";
import AddFriendsCard from "../components/AddFriendsCard";
import DropdownMenu from "../components/DropdownMenu";
import { Plant } from "../types/garden";
import { GrowthService } from "../services/growthService";
import FiveDayForecast from "../components/FiveDayForecast";

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
    try {
        // First try to get detailed location info from React Native Location API
        try {
            const location = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lon,
            });

            if (location && location.length > 0) {
                const place = location[0];
                console.log("[Location] 📍 React Native location data:", place);

                // Try to get neighborhood/city name
                if (place.district) {
                    return place.district; // Often gives neighborhood names
                }
                if (place.city) {
                    return place.city;
                }
                if (place.subregion) {
                    return place.subregion;
                }
                if (place.region) {
                    return place.region;
                }
            }
        } catch (locationError) {
            console.log(
                "[Location] ⚠️ React Native location failed, falling back to OpenWeather:",
                locationError
            );
        }

        // Fallback to OpenWeather geocoding
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=5&appid=${OPENWEATHER_API_KEY}`
        );
        const data = await response.json();

        if (data && data.length > 0) {
            // Look for the most specific city name
            for (const location of data) {
                // Prefer local names if available
                if (location.local_names && location.local_names.en) {
                    return location.local_names.en;
                }

                // Check if this is a city/town (not county/state)
                if (
                    location.name &&
                    !location.name.toLowerCase().includes("county")
                ) {
                    // If it's a city, return it
                    if (location.type === "city" || location.type === "town") {
                        return location.name;
                    }

                    // If no type specified but name doesn't contain 'county', it's likely a city
                    if (
                        !location.type &&
                        !location.name.toLowerCase().includes("county")
                    ) {
                        return location.name;
                    }
                }
            }

            // Fallback to the first result's name if no better option found
            return data[0].name;
        }
        return "Unknown";
    } catch (error) {
        console.error("Error fetching city name:", error);
        return "Unknown";
    }
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
    if (!forecastList || forecastList.length === 0) return [];

    const days: {
        [date: string]: {
            date: string;
            high: number;
            low: number;
            icon: string;
        };
    } = {};

    forecastList.forEach((item: any) => {
        // Validate item structure
        if (!item || !item.main || !item.weather || !item.weather[0]) {
            console.warn("[Forecast] Skipping invalid forecast item:", item);
            return;
        }

        // Handle both old API format (dt_txt) and new OneCall API format (dt)
        let date: string;
        let hour: number;

        try {
            if (item.dt_txt && typeof item.dt_txt === "string") {
                // Old API format
                const parts = item.dt_txt.split(" ");
                if (parts.length >= 2) {
                    date = parts[0];
                    hour = parseInt(parts[1].split(":")[0], 10);
                } else {
                    console.warn(
                        "[Forecast] Invalid dt_txt format:",
                        item.dt_txt
                    );
                    return;
                }
            } else if (item.dt && typeof item.dt === "number") {
                // New OneCall API format
                const dateObj = new Date(item.dt * 1000);
                date = dateObj.toISOString().split("T")[0];
                hour = dateObj.getHours();
            } else {
                // Skip items without valid date
                console.warn("[Forecast] No valid date found in item:", item);
                return;
            }

            if (!days[date]) {
                days[date] = {
                    date,
                    high: item.main.temp_max || item.main.temp || 0,
                    low: item.main.temp_min || item.main.temp || 0,
                    icon: item.weather[0].icon || "01d",
                };
            } else {
                days[date].high = Math.max(
                    days[date].high,
                    item.main.temp_max || item.main.temp || 0
                );
                days[date].low = Math.min(
                    days[date].low,
                    item.main.temp_min || item.main.temp || 0
                );
            }
            // Use the icon from the midday forecast if possible
            if (hour === 12) {
                days[date].icon = item.weather[0].icon || "01d";
            }
        } catch (error) {
            console.warn(
                "[Forecast] Error processing forecast item:",
                error,
                item
            );
            return;
        }
    });

    // Return only the first 5 days
    return Object.values(days).slice(0, 5);
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
            const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${friend.latitude}&lon=${friend.longitude}&units=imperial&appid=${OPENWEATHER_API_KEY}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.list) {
                setFriendForecasts((prev) => ({
                    ...prev,
                    [friend.id]: aggregateToFiveDay(data.list),
                }));
            }
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
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert("Could not get user info.");
                setRefreshingContacts(false);
                return;
            }

            // Fetch user's country code from profile (default to 'US')
            let userCountryCode: CountryCode = "US" as CountryCode;
            const { data: profile } = await supabase
                .from("profiles")
                .select("country_code")
                .eq("id", user.id)
                .single();
            if (profile && profile.country_code) {
                userCountryCode = profile.country_code as CountryCode;
            }

            // Get contacts from device
            let contacts;
            try {
                const contactsResult = await Contacts.getContactsAsync({
                    fields: [
                        Contacts.Fields.PhoneNumbers,
                        Contacts.Fields.Name,
                    ],
                });
                contacts = contactsResult.data;
            } catch (contactsError) {
                Alert.alert(
                    "Error",
                    "Could not access contacts. Please check your permissions."
                );
                console.error("Contacts access error:", contactsError);
                setRefreshingContacts(false);
                return;
            }

            if (!contacts || contacts.length === 0) {
                Alert.alert("No Contacts", "No contacts found on your device.");
                setRefreshingContacts(false);
                return;
            }

            // Prepare rows for bulk insert
            const rows: any[] = [];
            contacts.forEach((contact) => {
                (contact.phoneNumbers || []).forEach((pn) => {
                    if (pn.number) {
                        // Normalize to E.164 using libphonenumber-js
                        let e164 = null;
                        try {
                            const phoneNumber = parsePhoneNumberFromString(
                                pn.number,
                                userCountryCode
                            );
                            if (phoneNumber && phoneNumber.isValid()) {
                                e164 = phoneNumber.number; // E.164 format
                            }
                        } catch (e) {
                            // Ignore invalid numbers
                        }
                        if (e164) {
                            rows.push({
                                user_id: user.id,
                                contact_phone: e164,
                                contact_name: contact.name,
                            });
                        }
                    }
                });
            });

            console.log(
                `Processing ${rows.length} valid phone numbers from ${contacts.length} contacts`
            );

            // Clear old contacts and insert new ones
            try {
                const { error: deleteError } = await supabase
                    .from("user_contacts")
                    .delete()
                    .eq("user_id", user.id);
                if (deleteError) {
                    console.warn("Could not clear old contacts:", deleteError);
                }

                const BATCH_SIZE = 200;
                for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                    const batch = rows.slice(i, i + BATCH_SIZE);
                    const { error } = await supabase
                        .from("user_contacts")
                        .insert(batch);
                    if (error) {
                        console.error("Batch insert error:", error);
                        Alert.alert(
                            "Warning",
                            "Some contacts may not have been saved. Please try again."
                        );
                        setRefreshingContacts(false);
                        return;
                    }
                }

                // Update profile with new contact count (optional, don't fail if this fails)
                try {
                    await supabase
                        .from("profiles")
                        .update({ contacts_count: contacts.length })
                        .eq("id", user.id);
                } catch (updateError) {
                    console.warn(
                        "Could not update contact count:",
                        updateError
                    );
                }

                Alert.alert("Success", `Refreshed ${contacts.length} contacts`);

                // Refresh the friends list
                fetchProfileAndWeather();
            } catch (dbError) {
                console.error("Database operation failed:", dbError);
                Alert.alert(
                    "Error",
                    "Failed to save contacts. Please check your internet connection and try again."
                );
                setRefreshingContacts(false);
                return;
            }
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

    const updatePlantGrowth = async () => {
        try {
            console.log("[Growth] 📈 Starting plant growth update...");
            // Get all planted plants that aren't mature
            const { data: allPlantedPlants, error } = await supabase
                .from("planted_plants")
                .select(
                    `
                    *,
                    plant:plants(*)
                `
                )
                .eq("is_mature", false);

            if (error) {
                console.error(
                    "[Growth] ❌ Error fetching planted plants for growth update:",
                    error
                );
                return;
            }

            if (!allPlantedPlants || allPlantedPlants.length === 0) {
                console.log("[Growth] ℹ️ No plants need growth updates");
                return;
            }

            console.log(
                `[Growth] 🌱 Updating growth for ${allPlantedPlants.length} plants`
            );

            // Group plants by garden owner to get their weather
            const plantsByGarden = new Map<string, any[]>();
            allPlantedPlants.forEach((plant) => {
                const gardenOwnerId = plant.garden_owner_id;
                if (!plantsByGarden.has(gardenOwnerId)) {
                    plantsByGarden.set(gardenOwnerId, []);
                }
                plantsByGarden.get(gardenOwnerId)!.push(plant);
            });

            // Update each garden's plants
            for (const [gardenOwnerId, plants] of plantsByGarden) {
                // Get the garden owner's current weather
                const { data: gardenOwner } = await supabase
                    .from("profiles")
                    .select("weather_condition")
                    .eq("id", gardenOwnerId)
                    .single();

                const weatherCondition =
                    gardenOwner?.weather_condition || "clear";

                // Calculate growth for each plant in this garden
                for (const plantedPlant of plants) {
                    const plant = plantedPlant.plant;
                    if (!plant) continue;

                    const growthCalculation =
                        GrowthService.calculateGrowthStage(
                            plantedPlant,
                            plant,
                            weatherCondition
                        );

                    // Update maturity status based on calculated growth
                    const isMature =
                        growthCalculation.stage === 5 &&
                        growthCalculation.progress >= 100;

                    // Only update maturity status if it changed
                    if (isMature !== plantedPlant.is_mature) {
                        console.log(
                            `Updating plant ${plantedPlant.id} maturity: ${plantedPlant.is_mature} -> ${isMature} (stage: ${growthCalculation.stage}, progress: ${growthCalculation.progress}%)`
                        );

                        // Update the plant in database
                        await supabase
                            .from("planted_plants")
                            .update({
                                is_mature: isMature,
                            })
                            .eq("id", plantedPlant.id);
                    }
                }
            }

            console.log("[Growth] ✅ Plant growth update completed");
        } catch (error) {
            console.error("[Growth] ❌ Error updating plant growth:", error);
        }
    };

    const fetchPlantedPlants = async (friendId: string) => {
        try {
            console.log(`[Plants] Fetching plants for user: ${friendId}`);
            const { data: plants, error } = await supabase
                .from("planted_plants")
                .select(
                    `
                    *,
                    plant:plants(*)
                `
                )
                .eq("garden_owner_id", friendId)
                .is("harvested_at", null) // Only show non-harvested plants
                .order("planted_at", { ascending: false });

            if (error) {
                console.error(
                    `[Plants] Error fetching plants for ${friendId}:`,
                    error
                );
                return [];
            }

            console.log(
                `[Plants] Found ${plants?.length || 0} plants for user ${friendId}`
            );
            if (plants && plants.length > 0) {
                console.log(
                    `[Plants] Plant IDs:`,
                    plants.map((p) => p.id)
                );
            }
            return plants || [];
        } catch (error) {
            console.error(
                `[Plants] Exception fetching plants for ${friendId}:`,
                error
            );
            return [];
        }
    };

    const fetchAllPlantedPlantsBatch = async (userIds: string[]) => {
        try {
            console.log(
                `[Plants] 🚀 Batch fetching plants for ${userIds.length} users...`
            );

            if (userIds.length === 0) {
                console.log("[Plants] ℹ️ No user IDs provided for batch fetch");
                return {};
            }

            const { data: allPlants, error } = await supabase
                .from("planted_plants")
                .select(
                    `
                    *,
                    plant:plants(*)
                `
                )
                .in("garden_owner_id", userIds)
                .is("harvested_at", null) // Only show non-harvested plants
                .order("planted_at", { ascending: false });

            if (error) {
                console.error("[Plants] ❌ Error in batch plant fetch:", error);
                return {};
            }

            // Group plants by garden_owner_id
            const plantsByUser: Record<string, any[]> = {};
            allPlants?.forEach((plant) => {
                const gardenOwnerId = plant.garden_owner_id;
                if (!plantsByUser[gardenOwnerId]) {
                    plantsByUser[gardenOwnerId] = [];
                }
                plantsByUser[gardenOwnerId].push(plant);
            });

            console.log(
                `[Plants] ✅ Batch fetch completed: ${allPlants?.length || 0} total plants for ${Object.keys(plantsByUser).length} users`
            );

            // Log summary for each user
            Object.entries(plantsByUser).forEach(([userId, plants]) => {
                console.log(
                    `[Plants] 🌱 User ${userId}: ${plants.length} plants`
                );
            });

            return plantsByUser;
        } catch (error) {
            console.error("[Plants] ❌ Exception in batch plant fetch:", error);
            return {};
        }
    };

    const fetchAvailablePlants = async () => {
        try {
            console.log(
                "[Plants] 🌱 Fetching available plants from database..."
            );
            const { data: plants, error } = await supabase
                .from("plants")
                .select("*")
                .order("name");

            if (error) {
                console.error("[Plants] ❌ Error fetching plants:", error);
                return;
            }

            if (plants) {
                setAvailablePlants(plants);
                console.log(
                    `[Plants] ✅ Fetched ${plants.length} available plants`
                );
            }
        } catch (error) {
            console.error("[Plants] ❌ Error fetching plants:", error);
        }
    };

    const fetchWeatherData = async (latitude: number, longitude: number) => {
        try {
            console.log(
                "[Weather] 🌤️ Fetching weather data with OneCall API..."
            );

            if (!OPENWEATHER_API_KEY) {
                throw new Error("OpenWeather API key is missing");
            }

            // Use OneCall API to get current weather, hourly forecast, and daily forecast in one request
            const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&units=imperial&exclude=minutely,alerts&appid=${OPENWEATHER_API_KEY}`;

            console.log("[Weather] 📡 Making OneCall API request...");
            const response = await fetch(url);
            const data = await response.json();

            if (data.cod && data.cod !== 200) {
                throw new Error(`Weather API error: ${data.message}`);
            }

            // Get city name from coordinates
            console.log("[Weather] 🏙️ Fetching city name...");
            const cityName = await getCityFromCoords(latitude, longitude);
            console.log(`[Weather] ✅ City name: ${cityName}`);

            // Log the full geocoding response for debugging
            try {
                const geoResponse = await fetch(
                    `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=5&appid=${OPENWEATHER_API_KEY}`
                );
                const geoData = await geoResponse.json();
                console.log(
                    "[Weather] 🔍 Full geocoding data:",
                    JSON.stringify(geoData, null, 2)
                );
            } catch (e) {
                console.log("[Weather] ⚠️ Could not log geocoding data:", e);
            }

            // Extract current weather
            const currentWeather = {
                name: cityName, // Add city name to weather data
                main: {
                    temp: data.current.temp,
                    feels_like: data.current.feels_like,
                    humidity: data.current.humidity,
                    pressure: data.current.pressure,
                },
                weather: [
                    {
                        main: data.current.weather[0].main,
                        description: data.current.weather[0].description,
                        icon: data.current.weather[0].icon,
                    },
                ],
                wind: {
                    speed: data.current.wind_speed,
                    deg: data.current.wind_deg,
                },
                dt: data.current.dt,
                dt_txt: new Date(data.current.dt * 1000).toISOString(),
            };

            // Convert hourly forecast to 3-hourly format (matching the old API structure)
            const hourlyForecast =
                data.hourly?.slice(0, 40).map((hour: any) => ({
                    dt: hour.dt,
                    dt_txt: new Date(hour.dt * 1000).toISOString(),
                    main: {
                        temp: hour.temp,
                        feels_like: hour.feels_like,
                        humidity: hour.humidity,
                        pressure: hour.pressure,
                        temp_min: hour.temp,
                        temp_max: hour.temp,
                    },
                    weather: [
                        {
                            main: hour.weather[0].main,
                            description: hour.weather[0].description,
                            icon: hour.weather[0].icon,
                        },
                    ],
                    wind: {
                        speed: hour.wind_speed,
                        deg: hour.wind_deg,
                    },
                })) || [];

            console.log(
                `[Weather] ✅ Weather loaded: ${currentWeather.weather[0].main} ${currentWeather.main.temp}°F in ${cityName}`
            );
            console.log(
                `[Weather] ✅ Forecast loaded: ${hourlyForecast.length} entries`
            );

            return {
                current: currentWeather,
                forecast: hourlyForecast,
            };
        } catch (error) {
            console.error("[Weather] ❌ Error fetching weather data:", error);
            throw error;
        }
    };

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
                weatherData = await fetchWeatherData(latitude, longitude);

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
                await supabase
                    .from("profiles")
                    .update({
                        weather_temp: weatherData.current.main.temp,
                        weather_condition: weatherData.current.weather[0].main,
                        weather_icon: weatherData.current.weather[0].icon,
                        weather_updated_at: new Date().toISOString(),
                    })
                    .eq("id", user.id);
                console.log("[Loading] ✅ Weather updated in database");
            } catch (error) {
                console.error(
                    "[Loading] ❌ Error fetching weather data:",
                    error
                );
                setError("Failed to fetch weather data.");
                setLoading(false);
                return;
            }
            // Fetch user's contacts with pagination
            console.log("[Loading] 📞 Step 6: Fetching user's contacts...");
            let allContacts: any[] = [];
            let from = 0;
            const pageSize = 1000;
            while (true) {
                const { data: contacts, error: contactsError } = await supabase
                    .from("user_contacts")
                    .select("contact_phone, contact_name")
                    .eq("user_id", user.id)
                    .range(from, from + pageSize - 1);
                if (contactsError) {
                    console.error(
                        "[Loading] ❌ Contacts fetch error:",
                        contactsError
                    );
                    setError("Failed to fetch contacts.");
                    setLoading(false);
                    return;
                }
                if (!contacts || contacts.length === 0) {
                    break; // No more data
                }
                allContacts = allContacts.concat(contacts);
                from += pageSize;
                // If we got less than pageSize, we're done
                if (contacts.length < pageSize) {
                    break;
                }
            }
            console.log(
                `[Loading] ✅ Total contacts retrieved: ${allContacts.length}`
            );
            // Create a mapping of E.164 phone numbers to contact names
            console.log(
                "[Loading] 🔍 Step 7: Processing contacts and finding friends..."
            );
            const phoneToNameMap = new Map<string, string>();
            allContacts.forEach((contact: any) => {
                // Use the full E.164 phone number (with +)
                phoneToNameMap.set(contact.contact_phone, contact.contact_name);
            });
            const contactPhones = (allContacts || []).map(
                (c: any) => c.contact_phone
            );
            // Use the full E.164 numbers for matching
            const uniquePhones = Array.from(new Set(contactPhones));
            console.log(
                `[Loading] 📱 Unique phone numbers: ${uniquePhones.length}`
            );

            // Batch into chunks of 500
            function chunkArray<T>(array: T[], size: number): T[][] {
                const result: T[][] = [];
                for (let i = 0; i < array.length; i += size) {
                    result.push(array.slice(i, i + size));
                }
                return result;
            }
            const BATCH_SIZE = 500;
            const phoneChunks = chunkArray<string>(uniquePhones, BATCH_SIZE);
            console.log(
                `[Loading] 📦 Batching into ${phoneChunks.length} chunks...`
            );

            // Parallelize the queries
            console.log("[Loading] 🔍 Searching for friends in database...");
            const friendResults = await Promise.all(
                phoneChunks.map((chunk, idx) => {
                    return supabase
                        .from("profiles")
                        .select(
                            "id, phone_number, weather_temp, weather_condition, weather_icon, weather_updated_at, latitude, longitude, selfie_urls, points"
                        )
                        .in("phone_number", chunk)
                        .then((result) => result);
                })
            );
            let allFriends: any[] = [];
            for (const result of friendResults) {
                if (result.data) allFriends = allFriends.concat(result.data);
            }
            console.log(
                `[Loading] ✅ Total friends found: ${allFriends.length}`
            );
            // Remove the current user from the results
            const filteredFriends = allFriends.filter((f) => f.id !== user.id);
            console.log(
                `[Loading] 👥 Filtered friends (excluding self): ${filteredFriends.length}`
            );

            // Add contact names and city names to the friends data
            console.log(
                "[Loading] 🌍 Step 8: Getting city names for friends..."
            );
            const friendsWithNamesAndCities = await Promise.all(
                filteredFriends.map(async (friend) => {
                    const contactName = phoneToNameMap.get(friend.phone_number);
                    let cityName = "Unknown";
                    if (friend.latitude && friend.longitude) {
                        cityName = await getCityFromCoords(
                            friend.latitude,
                            friend.longitude
                        );
                    }
                    return {
                        ...friend,
                        contact_name: contactName || "Unknown",
                        city_name: cityName,
                    };
                })
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

            const plantsData = await fetchAllPlantedPlantsBatch(allUserIds);

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

    useEffect(() => {
        console.log("[App] 🚀 App initialization started...");

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

        const initializeApp = async () => {
            await getCurrentUser();
            console.log("[App] 🌱 Fetching available plants...");
            await fetchAvailablePlants();
            console.log("[App] 🌤️ Starting main data fetch...");
            await fetchProfileAndWeather();
            console.log("[App] 📈 Updating plant growth...");
            await updatePlantGrowth(); // Update plant growth on app load
            console.log("[App] ✅ App initialization completed!");
        };

        initializeApp();

        // Set up periodic growth updates (every 5 minutes)
        console.log("[App] ⏰ Setting up periodic growth updates...");
        const growthInterval = setInterval(
            () => {
                console.log("[App] 🔄 Running periodic growth update...");
                updatePlantGrowth();
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
                    const updatedPlants = await fetchPlantedPlants(
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
            const { data: plantedPlant, error: plantError } = await supabase
                .from("planted_plants")
                .insert({
                    garden_owner_id: friendId,
                    planter_id: user.id,
                    plant_id: plantId,
                    current_stage: 2, // Start at stage 2 (dirt) immediately after planting
                    is_mature: false,
                    slot: slotIdx,
                })
                .select()
                .single();

            if (plantError) {
                console.error("[Plant] Failed to plant:", plantError);
                Alert.alert(
                    "Error",
                    plantError.message || "Failed to plant seed"
                );
                return;
            }

            console.log("[Plant] Successfully planted:", plantedPlant);

            // Optimize: Add the new plant directly to state instead of fetching
            // This prevents the flickering from multiple database calls
            const newPlant = {
                ...plantedPlant,
                plant: availablePlants.find((p) => p.id === plantId),
            };

            setPlantedPlants((prev) => ({
                ...prev,
                [friendId]: [...(prev[friendId] || []), newPlant],
            }));

            // Only update growth if needed (don't call updatePlantGrowth here)
            // The real-time subscription will handle any necessary updates
        } catch (error) {
            console.error("[Plant] Error in handleSelectPlant:", error);
            Alert.alert("Error", "An unexpected error occurred");
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
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("points")
                    .eq("id", currentUserId)
                    .single();
                if (profile) {
                    setUserPoints(profile.points || 0);
                    console.log("Updated user points:", profile.points);
                }
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

            const plantsData = await fetchAllPlantedPlantsBatch(allUserIds);
            setPlantedPlants(plantsData);
            console.log("Plant data refresh completed");
        }
    };

    const handleRefreshGrowth = async () => {
        console.log("Manual growth refresh triggered");
        await updatePlantGrowth();

        // OPTIMIZATION: Use batch query to refresh all plants
        if (currentUserId && friendsWeather.length > 0) {
            const allUserIds = [
                currentUserId,
                ...friendsWeather.map((friend) => friend.id),
            ];
            console.log(
                `[Growth] 🚀 Batch refreshing plants for ${allUserIds.length} users...`
            );

            const plantsData = await fetchAllPlantedPlantsBatch(allUserIds);
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
