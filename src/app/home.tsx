import { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
    TouchableOpacity,
    Modal,
    FlatList,
    Dimensions,
    Share,
} from "react-native";
import { Stack, router } from "expo-router";
import React from "react";
import LottieView from "lottie-react-native";
import { supabase } from "../utils/supabase";
import { useHeaderHeight } from "@react-navigation/elements";
// @ts-ignore
import tzlookup from "tz-lookup";
// @ts-ignore
import { DateTime } from "luxon";
import sunCloudTrans from "../../assets/images/sun-cloud-trans.png";
import * as Contacts from "expo-contacts";
import * as Location from "expo-location";
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";
import GardenArea from "../components/GardenArea";
import PlantPicker from "../components/PlantPicker";
import PlantDetailsModal from "../components/PlantDetailsModal";
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

// Add this function to map weather to selfie key
const mapWeatherToSelfieKey = (weather: string) => {
    switch (weather?.toLowerCase()) {
        case "clear":
            return "sunny";
        case "clouds":
            return "cloudy";
        case "rain":
        case "drizzle":
        case "mist":
        case "fog":
        case "haze":
            return "rainy";
        case "snow":
            return "snowy";
        case "thunderstorm":
            return "thunderstorm";
        default:
            return "sunny";
    }
};

// Add Lottie animation mapping
const getWeatherLottie = (weatherCondition: string) => {
    switch (weatherCondition?.toLowerCase()) {
        case "clear":
            return require("../../assets/lottie/sunny.json");
        case "clouds":
            return require("../../assets/lottie/cloudy.json");
        case "rain":
        case "drizzle":
        case "mist":
        case "fog":
        case "haze":
            return require("../../assets/lottie/rainy.json");
        case "snow":
            return require("../../assets/lottie/snowy.json");
        case "thunderstorm":
            return require("../../assets/lottie/thunderstorm.json");
        default:
            return require("../../assets/lottie/sunny.json");
    }
};

function getWeatherDescription(condition: string) {
    switch (condition.toLowerCase()) {
        case "clear":
            return "clear";
        case "clouds":
            return "cloudy";
        case "rain":
            return "rainy";
        case "snow":
            return "snowy";
        case "thunderstorm":
            return "stormy";
        case "drizzle":
            return "drizzly";
        case "mist":
        case "fog":
            return "foggy";
        case "haze":
            return "hazy";
        default:
            return condition.toLowerCase();
    }
}

async function getCityFromCoords(lat: number, lon: number): Promise<string> {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`
        );
        const data = await response.json();
        if (data && data[0]) {
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
        const date = item.dt_txt.split(" ")[0];
        if (!days[date]) {
            days[date] = {
                date,
                high: item.main.temp_max,
                low: item.main.temp_min,
                icon: item.weather[0].icon,
            };
        } else {
            days[date].high = Math.max(days[date].high, item.main.temp_max);
            days[date].low = Math.min(days[date].low, item.main.temp_min);
        }
        // Use the icon from the midday forecast if possible
        const hour = parseInt(item.dt_txt.split(" ")[1].split(":")[0], 10);
        if (hour === 12) {
            days[date].icon = item.weather[0].icon;
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
    const userFiveDayData = aggregateToFiveDay(forecast);

    // Friend forecast cache
    const [friendForecasts, setFriendForecasts] = useState<
        Record<string, any[]>
    >({});

    // Helper to fetch and cache friend forecast
    async function fetchFriendForecast(friend: any) {
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
    }

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
                    "Error fetching planted plants for growth update:",
                    error
                );
                return;
            }

            if (!allPlantedPlants || allPlantedPlants.length === 0) {
                return;
            }

            console.log(
                `Updating growth for ${allPlantedPlants.length} plants`
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

            console.log("Plant growth update completed");
        } catch (error) {
            console.error("Error updating plant growth:", error);
        }
    };

    const fetchPlantedPlants = async (friendId: string) => {
        try {
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
                console.error("Error fetching planted plants:", error);
                return [];
            }

            return plants || [];
        } catch (error) {
            console.error("Error fetching planted plants:", error);
            return [];
        }
    };

    const fetchAvailablePlants = async () => {
        try {
            const { data: plants, error } = await supabase
                .from("plants")
                .select("*")
                .order("name");

            if (error) {
                console.error("Error fetching plants:", error);
                return;
            }

            if (plants) {
                setAvailablePlants(plants);
                console.log("Fetched plants:", plants);
            }
        } catch (error) {
            console.error("Error fetching plants:", error);
        }
    };

    const fetchProfileAndWeather = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log("Starting fetchProfileAndWeather...");
            // Get user
            const {
                data: { session },
            } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) {
                setError("User not found.");
                setLoading(false);
                return;
            }

            // Get current device location and update profile
            let updatedLatitude: number | null = null;
            let updatedLongitude: number | null = null;

            try {
                // Check if we have location permission
                const { status } =
                    await Location.getForegroundPermissionsAsync();
                if (status === "granted") {
                    // Get current location
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 10000,
                    });

                    updatedLatitude = location.coords.latitude;
                    updatedLongitude = location.coords.longitude;

                    console.log(
                        "Got current location:",
                        updatedLatitude,
                        updatedLongitude
                    );

                    // Update the profile with new coordinates
                    const { error: updateError } = await supabase
                        .from("profiles")
                        .update({
                            latitude: updatedLatitude,
                            longitude: updatedLongitude,
                        })
                        .eq("id", user.id);

                    if (updateError) {
                        console.warn("Could not update location:", updateError);
                    } else {
                        console.log("Successfully updated user location");
                    }
                } else {
                    console.log(
                        "Location permission not granted, using stored coordinates"
                    );
                }
            } catch (locationError) {
                console.warn("Could not get current location:", locationError);
            }

            // Get profile (use updated coordinates if available, otherwise use stored)
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("latitude,longitude,selfie_urls,points")
                .eq("id", user.id)
                .single();

            if (profileError) {
                console.error("Profile error:", profileError);
                setError(`Profile error: ${profileError.message}`);
                setLoading(false);
                return;
            }

            // Use updated coordinates if we got them, otherwise use stored coordinates
            const latitude = updatedLatitude ?? profile?.latitude;
            const longitude = updatedLongitude ?? profile?.longitude;

            if (!latitude || !longitude) {
                setError("Location not found.");
                setLoading(false);
                return;
            }

            setSelfieUrls(profile.selfie_urls || null);
            setUserPoints(profile.points || 0);

            // Get user's timezone and local hour
            let localHour = 12;
            try {
                const timezone = tzlookup(latitude, longitude);
                const localTime = DateTime.now().setZone(timezone);
                localHour = localTime.hour;
            } catch (e) {
                console.warn("Could not determine timezone from lat/lon", e);
            }
            setBgColor(getBackgroundColor(localHour));

            // Check if OpenWeather API key is available
            if (!OPENWEATHER_API_KEY) {
                console.error("OpenWeather API key is missing");
                setError("Weather API key not configured.");
                setLoading(false);
                return;
            }

            // Fetch weather using the coordinates (updated or stored)
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=imperial&appid=${OPENWEATHER_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.cod && data.cod !== 200) {
                throw new Error(`Weather API error: ${data.message}`);
            }
            setWeather(data);

            // Fetch 3-hourly forecast using the same coordinates
            try {
                const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=imperial&appid=${OPENWEATHER_API_KEY}`;
                const forecastRes = await fetch(forecastUrl);
                const forecastData = await forecastRes.json();
                if (forecastData.list && Array.isArray(forecastData.list)) {
                    setForecast(forecastData.list);
                    // Simple summary from first entry
                    setForecastSummary(
                        forecastData.list[0]?.weather?.[0]?.description
                            ? forecastData.list[0].weather[0].description
                                  .charAt(0)
                                  .toUpperCase() +
                                  forecastData.list[0].weather[0].description.slice(
                                      1
                                  )
                            : ""
                    );
                }
            } catch (e) {
                console.warn("Could not fetch forecast", e);
            }

            // Update user's weather in Supabase
            await supabase
                .from("profiles")
                .update({
                    weather_temp: data.main.temp,
                    weather_condition: data.weather[0].main,
                    weather_icon: data.weather[0].icon,
                    weather_updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);
            // Fetch user's contacts with pagination
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
                    console.error("Contacts fetch error:", contactsError);
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
            console.log(`Total contacts retrieved: ${allContacts.length}`);
            // Create a mapping of E.164 phone numbers to contact names
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
            // Parallelize the queries
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
            console.log(`Total friends found: ${allFriends.length}`);
            // Remove the current user from the results
            const filteredFriends = allFriends.filter((f) => f.id !== user.id);
            // Add contact names and city names to the friends data
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
            setFriendsWeather(friendsWithNamesAndCities);

            // Fetch planted plants for each friend and the current user
            const plantsData: Record<string, any[]> = {};

            // Fetch current user's plants
            const userPlants = await fetchPlantedPlants(user.id);
            plantsData[user.id] = userPlants;

            // Fetch friends' plants
            for (const friend of friendsWithNamesAndCities) {
                const plants = await fetchPlantedPlants(friend.id);
                plantsData[friend.id] = plants;
            }
            setPlantedPlants(plantsData);
        } catch (err) {
            console.error("Weather fetch error:", err);
            setError(
                `Failed to fetch weather: ${err instanceof Error ? err.message : "Unknown error"}`
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Get current user ID
        const getCurrentUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
            }
        };

        getCurrentUser();
        fetchAvailablePlants();
        fetchProfileAndWeather();
        updatePlantGrowth(); // Update plant growth on app load

        // Set up periodic growth updates (every 5 minutes)
        const growthInterval = setInterval(
            () => {
                updatePlantGrowth();
            },
            5 * 60 * 1000
        ); // 5 minutes

        return () => {
            clearInterval(growthInterval);
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
    const handlePlantPress = (friendId: string) => {
        console.log("handlePlantPress called", friendId);
        setSelectedFriendId(friendId);
        setShowPlantPicker(true);
    };
    const handleSelectPlant = async (plantId: string) => {
        if (!selectedFriendId) {
            console.error("No friend selected for planting");
            setShowPlantPicker(false);
            return;
        }

        try {
            // Get current user
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                console.error("No authenticated user found");
                setShowPlantPicker(false);
                return;
            }

            // Check if garden is full (max 3 plants)
            const { data: plantCount, error: countError } = await supabase
                .from("planted_plants")
                .select("id", { count: "exact" })
                .eq("garden_owner_id", selectedFriendId)
                .eq("is_mature", false);

            if (countError) {
                console.error("Error checking garden capacity:", countError);
                Alert.alert("Error", "Could not check garden capacity");
                setShowPlantPicker(false);
                return;
            }

            if (plantCount && plantCount.length >= 3) {
                Alert.alert("Garden Full", "This garden already has 3 plants");
                setShowPlantPicker(false);
                return;
            }

            // Plant the seed
            const { data: plantedPlant, error: plantError } = await supabase
                .from("planted_plants")
                .insert({
                    garden_owner_id: selectedFriendId,
                    planter_id: user.id,
                    plant_id: plantId,
                    current_stage: 2, // Start at stage 2 (dirt) immediately after planting
                    is_mature: false,
                })
                .select()
                .single();

            if (plantError) {
                console.error("Error planting seed:", plantError);
                Alert.alert("Error", "Failed to plant seed");
                setShowPlantPicker(false);
                return;
            }

            console.log("Successfully planted:", plantedPlant);
            Alert.alert("Success", "Plant planted successfully!");

            // Refresh planted plants for this friend
            const updatedPlants = await fetchPlantedPlants(selectedFriendId);
            setPlantedPlants((prev) => ({
                ...prev,
                [selectedFriendId]: updatedPlants,
            }));

            // If planting in user's own garden, also refresh user's plants
            if (selectedFriendId === currentUserId) {
                const userPlants = await fetchPlantedPlants(currentUserId);
                setPlantedPlants((prev) => ({
                    ...prev,
                    [currentUserId]: userPlants,
                }));
            }

            // Update growth for all plants
            await updatePlantGrowth();

            // Close the modal
            setShowPlantPicker(false);
            setSelectedFriendId(null);
        } catch (error) {
            console.error("Error in handleSelectPlant:", error);
            Alert.alert("Error", "An unexpected error occurred");
            setShowPlantPicker(false);
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

        // Refresh all planted plants data after harvest
        const plantsData: Record<string, any[]> = {};

        // Refresh current user's plants
        if (currentUserId) {
            const userPlants = await fetchPlantedPlants(currentUserId);
            plantsData[currentUserId] = userPlants;
            console.log(
                "Refreshed plants for current user:",
                userPlants.length
            );
        }

        // Refresh friends' plants
        for (const friend of friendsWeather) {
            const plants = await fetchPlantedPlants(friend.id);
            plantsData[friend.id] = plants;
            console.log(
                `Refreshed plants for ${friend.contact_name}:`,
                plants.length
            );
        }
        setPlantedPlants(plantsData);
        console.log("Plant data refresh completed");
    };

    const handleRefreshGrowth = async () => {
        console.log("Manual growth refresh triggered");
        await updatePlantGrowth();

        // Refresh all planted plants data
        const plantsData: Record<string, any[]> = {};

        // Refresh current user's plants
        if (currentUserId) {
            const userPlants = await fetchPlantedPlants(currentUserId);
            plantsData[currentUserId] = userPlants;
        }

        // Refresh friends' plants
        for (const friend of friendsWeather) {
            const plants = await fetchPlantedPlants(friend.id);
            plantsData[friend.id] = plants;
        }
        setPlantedPlants(plantsData);

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
                    stickyHeaderIndices={[0]}
                    renderItem={({ item, index }) => {
                        // User card as first item
                        if (item.type === "user-card") {
                            return (
                                <View
                                    style={{
                                        alignItems: "center",
                                        marginTop: 16,
                                        marginBottom: 20,
                                        zIndex: 1,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: cardWidth,
                                            borderRadius: 20,
                                            shadowColor: "#000",
                                            shadowOffset: {
                                                width: 0,
                                                height: 2,
                                            },
                                            shadowOpacity: 0.08,
                                            shadowRadius: 8,
                                            elevation: 3,
                                            alignItems: "center",
                                            overflow: "visible",
                                            borderWidth: 0.5,
                                            borderColor: "#DEEFFF",
                                            marginBottom: 0,
                                            marginTop: 30,
                                            backgroundColor: "#DFEFFF",
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontWeight: "bold",
                                                fontSize: 18,
                                                textAlign: "center",
                                                marginTop: 20,
                                                marginBottom: 20,
                                            }}
                                        >
                                            Your Garden
                                        </Text>
                                        <Text
                                            style={{
                                                position: "absolute",
                                                top: 20,
                                                right: 20,
                                                fontSize: 16,
                                                fontWeight: "bold",
                                                color: "#007AFF",
                                            }}
                                        >
                                            {userPoints}pts
                                        </Text>
                                        <View
                                            style={{
                                                width: "90%",
                                                backgroundColor: "#fff",
                                                borderRadius: 16,
                                                alignItems: "center",
                                                paddingVertical: 0,
                                                paddingHorizontal: 0,
                                                position: "relative",
                                                marginBottom: 14,
                                                borderWidth: 0.5,
                                                borderColor: "#DEEFFF",
                                            }}
                                        >
                                            {/* Lottie animation floating above, centered */}
                                            {weather &&
                                                weather.weather &&
                                                weather.weather[0] && (
                                                    <View
                                                        pointerEvents="none"
                                                        style={{
                                                            position:
                                                                "absolute",
                                                            top: -140,
                                                            left: 0,
                                                            right: 0,
                                                            alignItems:
                                                                "center",
                                                            zIndex: 3,
                                                        }}
                                                    >
                                                        <LottieView
                                                            source={getWeatherLottie(
                                                                weather
                                                                    .weather[0]
                                                                    .main
                                                            )}
                                                            autoPlay
                                                            loop
                                                            style={{
                                                                width: 400,
                                                                height: 400,
                                                                opacity: 0.7,
                                                            }}
                                                        />
                                                    </View>
                                                )}
                                            {/* Selfie */}
                                            <Image
                                                source={{
                                                    uri:
                                                        selfieUrls &&
                                                        weather &&
                                                        weather.weather &&
                                                        mapWeatherToSelfieKey(
                                                            weather.weather[0]
                                                                .main
                                                        )
                                                            ? selfieUrls[
                                                                  mapWeatherToSelfieKey(
                                                                      weather
                                                                          .weather[0]
                                                                          .main
                                                                  )
                                                              ]
                                                            : undefined,
                                                }}
                                                style={{
                                                    width: 80,
                                                    height: 80,
                                                    borderRadius: 40,
                                                    resizeMode: "cover",
                                                    backgroundColor: "#eee",
                                                    marginTop: 32, // space for Lottie
                                                    marginBottom: 30,
                                                }}
                                            />
                                            {/* Weather text */}
                                            <Text
                                                style={{
                                                    fontSize: 16,
                                                    color: "#333",
                                                    textAlign: "center",
                                                    marginBottom: 60,
                                                }}
                                            >
                                                It&apos;s{" "}
                                                <Text
                                                    style={{
                                                        fontWeight: "bold",
                                                    }}
                                                >
                                                    {weather &&
                                                    weather.main &&
                                                    weather.main.temp
                                                        ? Math.round(
                                                              weather.main.temp
                                                          )
                                                        : "--"}
                                                    °
                                                </Text>{" "}
                                                and{" "}
                                                <Text
                                                    style={{
                                                        fontWeight: "bold",
                                                    }}
                                                >
                                                    {weather &&
                                                    weather.weather &&
                                                    weather.weather[0]
                                                        ? getWeatherDescription(
                                                              weather.weather[0]
                                                                  .main
                                                          )
                                                        : "--"}
                                                </Text>{" "}
                                                in{" "}
                                                <Text
                                                    style={{
                                                        fontWeight: "bold",
                                                    }}
                                                >
                                                    {weather && weather.name
                                                        ? weather.name
                                                        : "--"}
                                                </Text>
                                            </Text>
                                            {/* User's Garden */}
                                            <GardenArea
                                                gardenOwnerId={
                                                    currentUserId || ""
                                                }
                                                plants={
                                                    plantedPlants[
                                                        currentUserId || ""
                                                    ] || []
                                                }
                                                weatherCondition={
                                                    weather &&
                                                    weather.weather &&
                                                    weather.weather[0]
                                                        ? weather.weather[0]
                                                              .main
                                                        : "clear"
                                                }
                                                onPlantPress={() =>
                                                    handlePlantPress(
                                                        currentUserId || ""
                                                    )
                                                }
                                                onPlantDetailsPress={
                                                    handlePlantDetailsPress
                                                }
                                                isGardenFull={
                                                    (
                                                        plantedPlants[
                                                            currentUserId || ""
                                                        ] || []
                                                    ).length >= 3
                                                }
                                            />
                                        </View>
                                        <FiveDayForecast
                                            forecastData={userFiveDayData}
                                        />
                                    </View>
                                    {loading && (
                                        <View
                                            style={{
                                                position: "absolute",
                                                top: 60,
                                                left: 0,
                                                right: 0,
                                                alignItems: "center",
                                                zIndex: 10,
                                            }}
                                        >
                                            <ActivityIndicator size="large" />
                                            <Text
                                                style={{
                                                    color: "#333",
                                                    marginTop: 8,
                                                }}
                                            >
                                                Loading weather...
                                            </Text>
                                        </View>
                                    )}
                                    {error && !loading && (
                                        <View
                                            style={{
                                                position: "absolute",
                                                top: 60,
                                                left: 0,
                                                right: 0,
                                                alignItems: "center",
                                                zIndex: 10,
                                            }}
                                        >
                                            <Text style={{ color: "#ff4444" }}>
                                                {error}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        }

                        // Friend cards (existing logic)
                        const friend = item;
                        if (friend.type === "add-friends") {
                            return (
                                <TouchableOpacity
                                    onPress={async () => {
                                        await Share.share({
                                            message:
                                                "I want to be your Fair Weather Friend\nhttp://willdennis.com",
                                        });
                                    }}
                                    style={{
                                        width: cardWidth,
                                        backgroundColor: "#fffbe6",
                                        borderRadius: 16,
                                        padding: 16,
                                        alignItems: "center",
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.08,
                                        shadowRadius: 4,
                                        elevation: 2,
                                        justifyContent: "center",
                                        overflow: "visible",
                                        height: 240, // Match the height of friend cards
                                        pointerEvents: "auto",
                                        zIndex: 100,
                                    }}
                                >
                                    <Image
                                        source={sunCloudTrans}
                                        style={{
                                            width: 80,
                                            height: 80,
                                            marginBottom: 16,
                                        }}
                                        resizeMode="contain"
                                    />
                                    <Text
                                        style={{
                                            color: "#666",
                                            textAlign: "center",
                                            fontSize: 14,
                                            marginBottom: 12,
                                        }}
                                    >
                                        Invite your friends to see their weather
                                    </Text>
                                    <View
                                        style={{
                                            backgroundColor: "#fffbe6",
                                            borderRadius: 20,
                                            borderWidth: 2,
                                            borderColor: "#FFD700",
                                            paddingVertical: 8,
                                            paddingHorizontal: 20,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: "#222",
                                                fontWeight: "bold",
                                                fontSize: 16,
                                            }}
                                        >
                                            Add Friends
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }
                        return (
                            <View
                                style={{
                                    width: cardWidth, // dynamic width based on screen size
                                    backgroundColor: "#DFEFFF",
                                    borderRadius: 20,
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.08,
                                    shadowRadius: 8,
                                    elevation: 3,
                                    marginBottom: 16,
                                    alignItems: "center",
                                    overflow: "visible",
                                    borderWidth: 0.5,
                                    borderColor: "#DEEFFF",
                                    pointerEvents: "auto",
                                    zIndex: 100,
                                }}
                            >
                                {/* Name at top */}
                                <Text
                                    style={{
                                        fontWeight: "bold",
                                        fontSize: 18,
                                        textAlign: "center",
                                        marginTop: 20,
                                        marginBottom: 20,
                                    }}
                                >
                                    {friend.contact_name || "Unknown"}'s Garden
                                </Text>
                                <Text
                                    style={{
                                        position: "absolute",
                                        top: 20,
                                        right: 20,
                                        fontSize: 16,
                                        fontWeight: "bold",
                                        color: "#007AFF",
                                    }}
                                >
                                    {friend.points || 0}pts
                                </Text>
                                {/* Inner card */}
                                <View
                                    style={{
                                        width: "90%",
                                        backgroundColor: "#fff",
                                        borderRadius: 16,
                                        alignItems: "center",
                                        paddingVertical: 0,
                                        paddingHorizontal: 0,
                                        position: "relative",
                                        marginBottom: 14,
                                        borderWidth: 0.5,
                                        borderColor: "#DEEFFF",
                                    }}
                                >
                                    {/* Lottie animation floating above, centered */}
                                    {friend.weather_condition && (
                                        <View
                                            pointerEvents="none"
                                            style={{
                                                position: "absolute",
                                                top: -140,
                                                left: 0,
                                                right: 0,
                                                alignItems: "center",
                                                zIndex: 3,
                                            }}
                                        >
                                            <LottieView
                                                source={getWeatherLottie(
                                                    friend.weather_condition
                                                )}
                                                autoPlay
                                                loop
                                                style={{
                                                    width: 400,
                                                    height: 400,
                                                    opacity: 0.7,
                                                }}
                                            />
                                        </View>
                                    )}
                                    {/* Selfie */}
                                    <Image
                                        source={{
                                            uri:
                                                friend.selfie_urls &&
                                                mapWeatherToSelfieKey(
                                                    friend.weather_condition
                                                )
                                                    ? friend.selfie_urls[
                                                          mapWeatherToSelfieKey(
                                                              friend.weather_condition
                                                          )
                                                      ]
                                                    : undefined,
                                        }}
                                        style={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: 40,
                                            resizeMode: "cover",
                                            backgroundColor: "#eee",
                                            marginTop: 32, // space for Lottie
                                            marginBottom: 30,
                                        }}
                                    />
                                    {/* Weather text */}
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            color: "#333",
                                            textAlign: "center",
                                            marginBottom: 70,
                                        }}
                                    >
                                        It&apos;s{" "}
                                        <Text style={{ fontWeight: "bold" }}>
                                            {friend.weather_temp
                                                ? Math.round(
                                                      friend.weather_temp
                                                  )
                                                : "--"}
                                            °
                                        </Text>{" "}
                                        and{" "}
                                        <Text style={{ fontWeight: "bold" }}>
                                            {getWeatherDescription(
                                                friend.weather_condition || ""
                                            )}
                                        </Text>{" "}
                                        in{" "}
                                        <Text style={{ fontWeight: "bold" }}>
                                            {friend.city_name}
                                        </Text>
                                    </Text>
                                    {/* Plants */}
                                    <GardenArea
                                        gardenOwnerId={friend.id}
                                        plants={plantedPlants[friend.id] || []}
                                        weatherCondition={
                                            friend.weather_condition
                                        }
                                        onPlantPress={() =>
                                            handlePlantPress(friend.id)
                                        }
                                        onPlantDetailsPress={
                                            handlePlantDetailsPress
                                        }
                                        isGardenFull={
                                            (plantedPlants[friend.id] || [])
                                                .length >= 3
                                        }
                                    />
                                </View>
                                {(() => {
                                    fetchFriendForecast(friend);
                                    return null;
                                })()}
                                <FiveDayForecast
                                    forecastData={
                                        friendForecasts[friend.id] || []
                                    }
                                />
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <Text className="ml-4 text-gray-500">
                            No friends using the app yet.
                        </Text>
                    }
                />
            </View>

            {/* Dropdown Menu Modal */}
            <Modal
                visible={showMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableOpacity
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.5)",
                    }}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                >
                    <View
                        style={{
                            flex: 1,
                            justifyContent: "flex-start",
                            alignItems: "flex-start",
                            paddingTop: 100,
                            paddingLeft: 20,
                        }}
                    >
                        <View
                            style={{
                                backgroundColor: "white",
                                borderRadius: 8,
                                padding: 16,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.25,
                                shadowRadius: 3.84,
                                elevation: 5,
                                minWidth: 150,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    setShowMenu(false);
                                    router.replace("/selfie");
                                }}
                                style={{
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderBottomWidth: 1,
                                    borderBottomColor: "#f0f0f0",
                                }}
                            >
                                <Text style={{ fontSize: 16, color: "#333" }}>
                                    Retake Selfies
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowMenu(false);
                                    handleRefreshContacts();
                                }}
                                disabled={refreshingContacts}
                                style={{
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderBottomWidth: 1,
                                    borderBottomColor: "#f0f0f0",
                                    opacity: refreshingContacts ? 0.5 : 1,
                                }}
                            >
                                <Text style={{ fontSize: 16, color: "#333" }}>
                                    {refreshingContacts
                                        ? "Refreshing..."
                                        : "Refresh Contacts"}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowMenu(false);
                                    handleRefreshGrowth();
                                }}
                                style={{
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderBottomWidth: 1,
                                    borderBottomColor: "#f0f0f0",
                                }}
                            >
                                <Text style={{ fontSize: 16, color: "#333" }}>
                                    Refresh Plant Growth
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowMenu(false);
                                    handleLogout();
                                }}
                                style={{
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                }}
                            >
                                <Text
                                    style={{ fontSize: 16, color: "#ff4444" }}
                                >
                                    Logout
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
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
