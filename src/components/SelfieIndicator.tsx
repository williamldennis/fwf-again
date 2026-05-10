import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { getWeatherSelfieKey } from "../utils/weatherUtils";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GrowthService } from "../services/growthService";

interface SelfieIndicatorProps {
    item: {
        type: "user" | "friend" | "add-friends";
        id: string;
        data?: any;
    };
    isActive: boolean;
    selfieUrls?: Record<string, string> | null;
    weather?: any;
    onPress?: (index: number) => void;
    index: number;
    plantedPlants?: Record<string, any[]>;
    currentUserId?: string | null;
}

const USER_CACHE_KEY = 'user_profile_cache';

export const SelfieIndicator: React.FC<SelfieIndicatorProps> = ({
    item,
    isActive,
    selfieUrls,
    weather,
    onPress,
    index,
    plantedPlants,
    currentUserId,
}) => {
    const [cachedSelfieUrl, setCachedSelfieUrl] = useState<string | null>(null);
    const lastCachedUrlRef = useRef<string | null>(null);
    const size = 40;
    const borderWidth = 2;
    const activeBorderColor = "#007AFF";

    // Check if this card has harvestable plants (calculate growth dynamically like GardenArea)
    const harvestableCount = useMemo(() => {
        if (!plantedPlants) return 0;

        let ownerId: string | null = null;
        let weatherCondition = "clear"; // Default weather

        if (item.type === "user" && currentUserId) {
            ownerId = currentUserId;
            // Get weather from the weather prop
            weatherCondition = weather?.weather?.[0]?.main || "clear";
        } else if (item.type === "friend" && item.data?.id) {
            ownerId = item.data.id;
            // Get weather from friend's data
            weatherCondition = item.data.weather_condition || "clear";
        }

        if (!ownerId) return 0;

        const plants = plantedPlants[ownerId] || [];
        const harvestable = plants.filter(plant => {
            // Skip already harvested plants
            if (plant.harvested_at) return false;

            // Calculate growth stage dynamically (same as GardenArea)
            const expandedPlant = plant.expand?.plant;
            const plantObject = expandedPlant || {
                id: plant.plant || plant.plant_id,
                name: plant.plant_name || "Unknown",
                growth_time_hours: 24, // Default to 24 hours if expand failed
                weather_bonus: plant.weather_bonus || {
                    sunny: 1,
                    cloudy: 1,
                    rainy: 1,
                },
            };

            try {
                const growthCalculation = GrowthService.calculateGrowthStage(
                    plant,
                    plantObject,
                    weatherCondition
                );
                // Stage 5 = mature and ready to harvest
                return growthCalculation.stage >= 5;
            } catch (e) {
                // If calculation fails, fall back to is_mature
                return plant.is_mature === true;
            }
        });

        // Debug: log when we find harvestable plants
        if (harvestable.length > 0) {
            console.log(`[SelfieIndicator] 🌱 ${item.type === "user" ? "User" : item.data?.contact_name || "Friend"} has ${harvestable.length} harvestable plant(s)`);
        }

        return harvestable.length;
    }, [plantedPlants, item, currentUserId, weather]);

    // Compute current selfie URL based on weather (memoized)
    const currentSelfieUrl = useMemo(() => {
        if (item.type === "user" && selfieUrls && weather?.weather?.[0]?.main) {
            const weatherKey = getWeatherSelfieKey(weather.weather[0].main);
            return selfieUrls[weatherKey] || null;
        }
        return null;
    }, [item.type, selfieUrls, weather?.weather]);

    // Load cached selfie URL on mount (only for user type)
    useEffect(() => {
        if (item.type === "user") {
            AsyncStorage.getItem(USER_CACHE_KEY)
                .then(cached => {
                    if (cached) {
                        try {
                            const parsed = JSON.parse(cached);
                            if (parsed.selfieUrl) {
                                console.log("[SelfieIndicator] 🚀 Loaded cached user selfie URL");
                                setCachedSelfieUrl(parsed.selfieUrl);
                            }
                        } catch (e) {
                            // Silently fail
                        }
                    }
                })
                .catch(() => {});
        }
    }, [item.type]);

    // Cache selfie URL when it changes (NOT on every render)
    useEffect(() => {
        if (item.type === "user" && currentSelfieUrl && currentSelfieUrl !== lastCachedUrlRef.current) {
            lastCachedUrlRef.current = currentSelfieUrl;
            console.log("[SelfieIndicator] ✅ Caching new user selfie URL");
            AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify({
                selfieUrl: currentSelfieUrl,
                timestamp: Date.now()
            })).catch(() => {});
        }
    }, [item.type, currentSelfieUrl]);

    const getIndicatorContent = () => {
        if (item.type === "user") {
            // User card - show user's selfie based on current weather
            // Priority 1: Fresh selfie based on current weather
            if (currentSelfieUrl) {
                return (
                    <Image
                        source={{ uri: currentSelfieUrl }}
                        style={{
                            width: size - borderWidth * 2,
                            height: size - borderWidth * 2,
                            borderRadius: (size - borderWidth * 2) / 2,
                        }}
                    />
                );
            }

            // Priority 2: Cached selfie (shows immediately while fresh data loads)
            if (cachedSelfieUrl) {
                return (
                    <Image
                        source={{ uri: cachedSelfieUrl }}
                        style={{
                            width: size - borderWidth * 2,
                            height: size - borderWidth * 2,
                            borderRadius: (size - borderWidth * 2) / 2,
                        }}
                    />
                );
            }

            // Priority 3: Fallback to initials
            return (
                <Text
                    style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#666",
                    }}
                >
                    ME
                </Text>
            );
        }

        if (item.type === "friend" && item.data) {
            // Friend card - show friend's selfie based on their weather
            const friend = item.data;
            if (friend.selfie_urls && friend.weather_condition) {
                const weatherKey = getWeatherSelfieKey(
                    friend.weather_condition
                );
                const selfieUrl = friend.selfie_urls[weatherKey];
                if (selfieUrl) {
                    return (
                        <Image
                            source={{ uri: selfieUrl }}
                            style={{
                                width: size - borderWidth * 2,
                                height: size - borderWidth * 2,
                                borderRadius: (size - borderWidth * 2) / 2,
                            }}
                        />
                    );
                }
            }
            // Fallback to initials
            const initials = friend.contact_name
                ? friend.contact_name
                    .split(" ")
                    .map((name: string) => name[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "??";
            return (
                <Text
                    style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#666",
                    }}
                >
                    {initials}
                </Text>
            );
        }

        if (item.type === "add-friends") {
            // Add friends card - show app icon
            return (
                <Image
                    source={require("../../assets/images/sun-cloud-trans.png")}
                    style={{
                        width: size - borderWidth * 2,
                        height: size - borderWidth * 2,
                        borderRadius: (size - borderWidth * 2) / 2,
                    }}
                />
            );
        }

        // Fallback
        return (
            <Text
                style={{
                    fontSize: 14,
                    fontWeight: "bold",
                    color: "#666",
                }}
            >
                ??
            </Text>
        );
    };

    const handlePress = () => {
        if (onPress) {
            onPress(index);
        }
    };

    return (
        <View style={{ position: "relative" }}>
            <TouchableOpacity
                onPress={handlePress}
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: isActive ? borderWidth : 0,
                    borderColor: activeBorderColor,
                    backgroundColor: isActive ? "#fff" : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                }}
                activeOpacity={0.7}
            >
                {getIndicatorContent()}
            </TouchableOpacity>

            {/* Harvest ready indicator - green dot with optional count */}
            {harvestableCount > 0 && (
                <View
                    style={{
                        position: "absolute",
                        bottom: -2,
                        right: -2,
                        minWidth: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: "#34C759",
                        borderWidth: 2,
                        borderColor: "#fff",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: harvestableCount > 1 ? 4 : 0,
                    }}
                >
                    {harvestableCount > 1 && (
                        <Text
                            style={{
                                fontSize: 10,
                                fontWeight: "bold",
                                color: "#fff",
                            }}
                        >
                            {harvestableCount}
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
};

export default SelfieIndicator;
