import React from "react";
import {
    View,
    Text,
    ActivityIndicator,
    Image,
    Dimensions,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import LottieView from "lottie-react-native";
import GardenArea from "./GardenArea";
import FiveDayForecast from "./FiveDayForecast";
import { WeatherCard } from "./WeatherCard";
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

// Helper functions from WeatherModal
const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
    });
};

const formatDay = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return "Tomorrow";
    } else {
        return date.toLocaleDateString("en-US", { weekday: "short" });
    }
};

const getWeatherDescriptionFromData = (weather: any) => {
    if (!weather || !weather[0]) return "";
    return (
        weather[0].description.charAt(0).toUpperCase() +
        weather[0].description.slice(1)
    );
};

const getWeatherIcon = (weather: any) => {
    if (!weather || !weather[0]) return "";
    return `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
};

const formatPrecipitation = (pop: number) => {
    return `${Math.round(pop * 100)}%`;
};

const formatUV = (uvi: number) => {
    if (uvi <= 2) return "Low";
    if (uvi <= 5) return "Moderate";
    if (uvi <= 7) return "High";
    if (uvi <= 10) return "Very High";
    return "Extreme";
};

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
                flex: 1,
                width: cardWidth,
                maxWidth: cardWidth,
                position: "relative",
            }}
        >
            {/* Lottie animation positioned absolutely above all content */}
            {weather && weather.weather && weather.weather[0] && (
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        top: -20,
                        left: 0,
                        right: 0,
                        alignItems: "center",
                        zIndex: 0,
                    }}
                >
                    <LottieView
                        source={getWeatherLottie(weather.weather[0].main)}
                        autoPlay
                        loop
                        style={{
                            width: 1100,
                            height: 1100,
                            opacity: 0.6,
                        }}
                    />
                </View>
            )}

            <ScrollView
                style={{
                    flex: 1,
                    zIndex: 1,
                    width: cardWidth,
                    maxWidth: cardWidth,
                }}
                contentContainerStyle={{
                    width: cardWidth,
                    maxWidth: cardWidth,
                }}
                showsVerticalScrollIndicator={false}
                directionalLockEnabled={true}
                nestedScrollEnabled={true}
                scrollEventThrottle={16}
                horizontal={false}
                alwaysBounceHorizontal={false}
                alwaysBounceVertical={true}
                // Prevent horizontal scrolling to allow carousel gestures to take precedence
                scrollEnabled={true}
            >
                <View
                    style={{
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 20,
                        zIndex: 1,
                        minHeight: cardHeight,
                        width: cardWidth,
                        maxWidth: cardWidth,
                    }}
                >
                    <View
                        style={{
                            width: cardWidth - 40, // Reduce width to prevent overflow
                            maxWidth: cardWidth - 40,
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
                            overflow: "hidden",
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
                                    mapWeatherToSelfieKey(
                                        weather.weather[0].main
                                    )
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
                                marginTop: 120, // space for Lottie
                                marginBottom: 30,
                            }}
                        />

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
                            {/* Selfie */}

                            {/* User's Garden */}
                            <GardenArea
                                gardenOwnerId={currentUserId || ""}
                                plants={
                                    plantedPlants[currentUserId || ""] || []
                                }
                                weatherCondition={
                                    weather &&
                                    weather.weather &&
                                    weather.weather[0]
                                        ? weather.weather[0].main
                                        : "clear"
                                }
                                onPlantPress={(slotIdx) =>
                                    onPlantPress(currentUserId || "", slotIdx)
                                }
                                onPlantDetailsPress={onPlantDetailsPress}
                                isGardenFull={
                                    (plantedPlants[currentUserId || ""] || [])
                                        .length >= 3
                                }
                            />
                        </View>

                        {/* Weather Card */}
                        {weather &&
                            hourlyForecast.length > 0 &&
                            dailyForecast.length > 0 && (
                                <WeatherCard
                                    currentWeather={weather}
                                    hourlyForecast={hourlyForecast}
                                    dailyForecast={dailyForecast}
                                    cityName={weather.name || ""}
                                />
                            )}
                    </View>

                    {/* Hourly Forecast Card */}
                    {hourlyForecast.length > 0 && (
                        <View
                            style={{
                                width: cardWidth - 40,
                                maxWidth: cardWidth - 40,
                                backgroundColor: "#fff",
                                borderRadius: 16,
                                padding: 20,
                                marginTop: 10,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 8,
                                elevation: 3,
                                overflow: "hidden",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: "600",
                                    color: "#212529",
                                    marginBottom: 16,
                                }}
                            >
                                Today's Hourly Forecast
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ marginHorizontal: -10 }}
                                nestedScrollEnabled={true}
                                scrollEventThrottle={16}
                                directionalLockEnabled={true}
                                alwaysBounceHorizontal={false}
                                alwaysBounceVertical={false}
                                // Add gesture handling to work better with carousel
                                scrollEnabled={true}
                            >
                                {hourlyForecast
                                    .slice(0, 24)
                                    .map((hour, index) => (
                                        <View
                                            key={hour.dt}
                                            style={{
                                                alignItems: "center",
                                                marginHorizontal: 10,
                                                minWidth: 60,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    color: "#6c757d",
                                                    marginBottom: 8,
                                                }}
                                            >
                                                {index === 0
                                                    ? "Now"
                                                    : formatTime(hour.dt)}
                                            </Text>
                                            <Image
                                                source={{
                                                    uri: getWeatherIcon(
                                                        hour.weather
                                                    ),
                                                }}
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    marginBottom: 8,
                                                }}
                                                resizeMode="contain"
                                            />
                                            <Text
                                                style={{
                                                    fontSize: 16,
                                                    fontWeight: "600",
                                                    color: "#212529",
                                                    marginBottom: 4,
                                                }}
                                            >
                                                {Math.round(hour.temp)}°
                                            </Text>
                                            {hour.pop > 0.1 && (
                                                <Text
                                                    style={{
                                                        fontSize: 10,
                                                        color: "#007bff",
                                                        fontWeight: "500",
                                                    }}
                                                >
                                                    {formatPrecipitation(
                                                        hour.pop
                                                    )}
                                                </Text>
                                            )}
                                        </View>
                                    ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* 7-Day Forecast Card */}
                    {dailyForecast.length > 0 && (
                        <View
                            style={{
                                width: cardWidth - 40,
                                maxWidth: cardWidth - 40,
                                backgroundColor: "#fff",
                                borderRadius: 16,
                                padding: 20,
                                marginTop: 10,
                                marginBottom: 20,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 8,
                                elevation: 3,
                                overflow: "hidden",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: "600",
                                    color: "#212529",
                                    marginBottom: 16,
                                }}
                            >
                                7-Day Forecast
                            </Text>
                            {dailyForecast.map((day) => (
                                <View
                                    key={day.dt}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        paddingVertical: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: "#f8f9fa",
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={{
                                                fontSize: 16,
                                                fontWeight: "600",
                                                color: "#212529",
                                                marginBottom: 4,
                                            }}
                                        >
                                            {formatDay(day.dt)}
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                color: "#6c757d",
                                                marginBottom: 2,
                                            }}
                                        >
                                            {getWeatherDescriptionFromData(
                                                day.weather
                                            )}
                                        </Text>
                                        {day.pop > 0.1 && (
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    color: "#007bff",
                                                }}
                                            >
                                                {formatPrecipitation(day.pop)}{" "}
                                                chance of rain
                                            </Text>
                                        )}
                                    </View>
                                    <View
                                        style={{
                                            alignItems: "center",
                                            marginHorizontal: 16,
                                        }}
                                    >
                                        <Image
                                            source={{
                                                uri: getWeatherIcon(
                                                    day.weather
                                                ),
                                            }}
                                            style={{
                                                width: 50,
                                                height: 50,
                                            }}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <View style={{ alignItems: "flex-end" }}>
                                        <Text
                                            style={{
                                                fontSize: 18,
                                                fontWeight: "600",
                                                color: "#212529",
                                            }}
                                        >
                                            {Math.round(day.temp.max)}°
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: 16,
                                                color: "#6c757d",
                                            }}
                                        >
                                            {Math.round(day.temp.min)}°
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
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
