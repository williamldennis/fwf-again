import React from "react";
import {
    View,
    Text,
    ActivityIndicator,
    Image,
    Dimensions,
    TouchableOpacity,
} from "react-native";
import LottieView from "lottie-react-native";
import GardenArea from "./GardenArea";
import FiveDayForecast from "./FiveDayForecast";
import { WeatherCardCarousel } from "./WeatherCardCarousel";
import {
    getWeatherLottieFile,
    getWeatherSelfieKey,
    getWeatherDisplayName,
} from "../utils/weatherUtils";

interface UserCardProps {
    weather: any;
    selfieUrls: Record<string, string> | null;
    userPoints: number;
    currentUserId: string | null;
    plantedPlants: Record<string, any[]>;
    onPlantPress: (friendId: string, slotIdx: number) => void;
    onPlantDetailsPress: (plant: any, friendWeather: string) => void;
    onWeatherPress?: () => void;
    forecastData: any[];
    hourlyForecast?: any[];
    dailyForecast?: any[];
    loading: boolean;
    error: string | null;
    cardWidth: number;
    cardHeight?: number;
}

// Weather mapping functions now use the single source of truth
const getWeatherLottie = (weatherCondition: string) => {
    const lottieFile = getWeatherLottieFile(weatherCondition);

    // Static mapping for React Native bundler
    switch (lottieFile) {
        case "sunny.json":
            return require("../../assets/lottie/sunny.json");
        case "cloudy.json":
            return require("../../assets/lottie/cloudy.json");
        case "rainy.json":
            return require("../../assets/lottie/rainy.json");
        case "snowy.json":
            return require("../../assets/lottie/snowy.json");
        case "thunderstorm.json":
            return require("../../assets/lottie/thunderstorm.json");
        default:
            return require("../../assets/lottie/sunny.json");
    }
};

const mapWeatherToSelfieKey = (weather: string) => {
    return getWeatherSelfieKey(weather);
};

function getWeatherDescription(condition: string) {
    return getWeatherDisplayName(condition);
}

export const UserCard: React.FC<UserCardProps> = ({
    weather,
    selfieUrls,
    userPoints,
    currentUserId,
    plantedPlants,
    onPlantPress,
    onPlantDetailsPress,
    onWeatherPress,
    forecastData,
    hourlyForecast = [],
    dailyForecast = [],
    loading,
    error,
    cardWidth,
    cardHeight,
}) => {
    return (
        <View
            style={{
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                zIndex: 1,
                height: cardHeight,
            }}
        >
            <View
                style={{
                    width: cardWidth - 30, // Add some padding for the card
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
                    // borderColor: "#DEEFFF",
                    // backgroundColor: "#DFEFFF",
                }}
            >
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
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        resizeMode: "cover",
                        backgroundColor: "#eee",
                        marginTop: 60, // space for Lottie
                        marginBottom: 0,
                    }}
                />
                {/* Weather text */}
                <TouchableOpacity
                    onPress={onWeatherPress}
                    disabled={!onWeatherPress}
                    style={{
                        padding: 10,
                        borderRadius: 8,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 20,
                            color: "white",
                            textAlign: "center",
                            marginBottom: 20,
                            marginTop: 30,
                            textDecorationLine: onWeatherPress
                                ? "underline"
                                : "none",
                        }}
                    >
                        {loading ? (
                            <Text
                                style={{ fontStyle: "italic", color: "#666" }}
                            >
                                Loading weather...
                            </Text>
                        ) : weather && weather.main && weather.main.temp ? (
                            <>
                                It&apos;s{" "}
                                <Text
                                    style={{
                                        fontWeight: "bold",
                                    }}
                                >
                                    {Math.round(weather.main.temp)}°
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
                                              weather.weather[0].main
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
                            </>
                        ) : (
                            <Text
                                style={{ fontStyle: "italic", color: "#666" }}
                            >
                                Weather data unavailable
                            </Text>
                        )}
                    </Text>
                </TouchableOpacity>

                {/* Weather Card Carousel */}
                {weather &&
                    hourlyForecast.length > 0 &&
                    dailyForecast.length > 0 && (
                        <WeatherCardCarousel
                            currentWeather={weather}
                            hourlyForecast={hourlyForecast}
                            dailyForecast={dailyForecast}
                            cityName={weather.name || ""}
                        />
                    )}

                <View
                    style={{
                        width: "100%",
                        // backgroundColor: "#fff",
                        borderRadius: 16,
                        alignItems: "center",
                        position: "relative",
                        backgroundColor: "white",
                        borderBottomLeftRadius: 20,
                        borderBottomRightRadius: 20,
                        marginBottom: 0,
                        paddingBottom: 30,
                        marginTop: 0,
                    }}
                >
                    {/* Lottie animation floating above, centered */}
                    {weather && weather.weather && weather.weather[0] && (
                        <View
                            pointerEvents="none"
                            style={{
                                position: "absolute",
                                top: -600,
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
                                    width: 1100,
                                    height: 1100,
                                    opacity: 0.2,
                                }}
                            />
                        </View>
                    )}
                    {/* Selfie */}

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
                </View>
            </View>
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
                    <Text style={{ color: "#ff4444", fontSize: 12 }}>
                        {error}
                    </Text>
                </View>
            )}
        </View>
    );
};

export default UserCard;
