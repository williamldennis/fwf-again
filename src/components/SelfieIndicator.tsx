import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { getWeatherSelfieKey } from "../utils/weatherUtils";

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
}

export const SelfieIndicator: React.FC<SelfieIndicatorProps> = ({
    item,
    isActive,
    selfieUrls,
    weather,
    onPress,
    index,
}) => {
    const size = 40; // Increased from 24 to 40
    const borderWidth = 2;
    const activeBorderColor = "#007AFF";
    const inactiveBorderColor = "#D1D5DB";

    const getIndicatorContent = () => {
        if (item.type === "user") {
            // User card - show user's selfie based on current weather
            if (selfieUrls && weather?.weather?.[0]?.main) {
                const weatherKey = getWeatherSelfieKey(weather.weather[0].main);
                const selfieUrl = selfieUrls[weatherKey];
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
    );
};

export default SelfieIndicator;
