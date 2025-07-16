import React from "react";
import { View, Text, ActivityIndicator, Image, Dimensions } from "react-native";
import LottieView from "lottie-react-native";
import GardenArea from "./GardenArea";
import FiveDayForecast from "./FiveDayForecast";

interface UserCardProps {
    weather: any;
    selfieUrls: Record<string, string> | null;
    userPoints: number;
    currentUserId: string | null;
    plantedPlants: Record<string, any[]>;
    onPlantPress: (friendId: string, slotIdx: number) => void;
    onPlantDetailsPress: (plant: any, friendWeather: string) => void;
    forecastData: any[];
    loading: boolean;
    error: string | null;
    cardWidth: number;
}

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

export const UserCard: React.FC<UserCardProps> = ({
    weather,
    selfieUrls,
    userPoints,
    currentUserId,
    plantedPlants,
    onPlantPress,
    onPlantDetailsPress,
    forecastData,
    loading,
    error,
    cardWidth,
}) => {
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
                    {weather && weather.weather && weather.weather[0] && (
                        <View
                            pointerEvents="none"
                            style={{
                                position: "absolute",
                                top: 100,
                                left: 0,
                                right: 0,
                                alignItems: "center",
                                zIndex: 3,
                            }}
                        >
                            <LottieView
                                source={getWeatherLottie(
                                    weather.weather[0].main
                                )}
                                autoPlay
                                loop
                                style={{
                                    width: 200,
                                    height: 200,
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
                                mapWeatherToSelfieKey(weather.weather[0].main)
                                    ? selfieUrls[
                                          mapWeatherToSelfieKey(
                                              weather.weather[0].main
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
                            {weather && weather.main && weather.main.temp
                                ? Math.round(weather.main.temp)
                                : "--"}
                            °
                        </Text>{" "}
                        and{" "}
                        <Text
                            style={{
                                fontWeight: "bold",
                            }}
                        >
                            {weather && weather.weather && weather.weather[0]
                                ? getWeatherDescription(weather.weather[0].main)
                                : "--"}
                        </Text>{" "}
                        in{" "}
                        <Text
                            style={{
                                fontWeight: "bold",
                            }}
                        >
                            {weather && weather.name ? weather.name : "--"}
                        </Text>
                    </Text>
                    {/* User's Garden */}
                    <GardenArea
                        gardenOwnerId={currentUserId || ""}
                        plants={plantedPlants[currentUserId || ""] || []}
                        weatherCondition={
                            weather && weather.weather && weather.weather[0]
                                ? weather.weather[0].main
                                : "clear"
                        }
                        onPlantPress={(slotIdx) =>
                            onPlantPress(currentUserId || "", slotIdx)
                        }
                        onPlantDetailsPress={onPlantDetailsPress}
                        isGardenFull={
                            (plantedPlants[currentUserId || ""] || []).length >=
                            3
                        }
                    />
                    {forecastData && forecastData.length > 0 ? (
                        <FiveDayForecast forecastData={forecastData} />
                    ) : (
                        <Text
                            style={{
                                color: "red",
                                fontSize: 12,
                                marginTop: 10,
                            }}
                        >
                            No forecast data available (length:{" "}
                            {forecastData?.length || 0})
                        </Text>
                    )}
                </View>
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
                    <Text style={{ color: "#ff4444" }}>{error}</Text>
                </View>
            )}
        </View>
    );
};

export default UserCard;
