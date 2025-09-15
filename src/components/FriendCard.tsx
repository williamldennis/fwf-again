import React from "react";
import { View, Text, Image, ScrollView, Dimensions } from "react-native";
import LottieView from "lottie-react-native";
import GardenArea from "./GardenArea";
import { WeatherCard } from "./WeatherCard";
import {
    getWeatherLottieFile,
    getWeatherSelfieKey,
    getWeatherDisplayName,
} from "../utils/weatherUtils";

interface FriendCardProps {
    friend: any;
    plantedPlants: Record<string, any[]>;
    onPlantPress: (friendId: string, slotIdx: number) => void;
    onPlantDetailsPress: (plant: any, friendWeather: string) => void;
    forecastData: any[];
    cardWidth: number;
    cardHeight?: number;
    onFetchForecast: (friend: any) => void;
    hourlyForecast?: any[];
    dailyForecast?: any[];
    hourlyForGraph?: any[];
}

// Weather mapping functions now use the single source of truth
const getWeatherLottie = (weatherCondition: string) => {
    try {
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
    } catch (error) {
        if (__DEV__) {
            console.error('Failed to load Lottie animation:', error);
        }
        // Return sunny as fallback
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
    if (!weather || !weather[0] || !weather[0].description) return "";
    return (
        weather[0].description.charAt(0).toUpperCase() +
        weather[0].description.slice(1)
    );
};

const getWeatherIcon = (weather: any) => {
    if (!weather || !weather[0] || !weather[0].icon) return "";
    return `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
};

const formatPrecipitation = (pop: number) => {
    return `${Math.round(pop * 100)}%`;
};

export const FriendCard: React.FC<FriendCardProps> = ({
    friend,
    plantedPlants,
    onPlantPress,
    onPlantDetailsPress,
    forecastData,
    cardWidth,
    cardHeight,
    onFetchForecast,
    hourlyForecast = [],
    dailyForecast = [],
    hourlyForGraph = [],
}) => {
    // Validate friend data
    if (!friend || !friend.id) {
        if (__DEV__) {
            console.error('FriendCard: Invalid friend data', friend);
        }
        return null;
    }

    // Trigger forecast fetch when component renders
    React.useEffect(() => {
        if (friend && friend.id) {
            onFetchForecast(friend);
        }
    }, [friend.id, onFetchForecast]);

    // Debug logging only in development
    // if (__DEV__) {
    //     console.log(`[FriendCard] ${friend.contact_name}:`, {
    //         weather_condition: friend.weather_condition,
    //         hourlyForecast_length: hourlyForecast.length,
    //         dailyForecast_length: dailyForecast.length,
    //         has_weather_condition: !!friend.weather_condition,
    //         has_hourly: hourlyForecast.length > 0,
    //         has_daily: dailyForecast.length > 0,
    //     });
    // }

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
            {friend.weather_condition && (
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
                    {(() => {
                        try {
                            const lottieSource = getWeatherLottie(friend.weather_condition);
                            if (lottieSource) {
                                return (
                                    <LottieView
                                        source={lottieSource}
                                        autoPlay
                                        loop
                                        style={{
                                            width: 1100,
                                            height: 1100,
                                            opacity: 0.6,
                                        }}
                                        onAnimationFailure={() => {
                                            if (__DEV__) {
                                                console.log('Lottie animation failed to load');
                                            }
                                        }}
                                    />
                                );
                            }
                            return null;
                        } catch (error) {
                            if (__DEV__) {
                                console.error('Error loading Lottie animation:', error);
                            }
                            return null;
                        }
                    })()}
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
                        }}
                    >
                        {/* Friend name at top */}
                        <Text
                            style={{
                                fontWeight: "bold",
                                fontSize: 28,
                                textAlign: "center",
                                marginTop: 120, // space for Lottie
                                marginBottom: 10,
                                color: "white",
                            }}
                        >
                            {friend.contact_name || "Unknown"}
                        </Text>

                        {/* Points and Level as subheader */}
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 12,
                                marginBottom: 20,
                            }}
                        >
                            {/* Points */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    backgroundColor: "rgba(0, 122, 255, 0.1)",
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 20,
                                    minWidth: 60,
                                    justifyContent: "center",
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: "bold",
                                        color: "#007AFF",
                                        marginRight: 2,
                                    }}
                                >
                                    {friend.points || 0}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: "500",
                                        color: "#007AFF",
                                        opacity: 0.8,
                                    }}
                                >
                                    pts
                                </Text>
                            </View>

                            {/* Level */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    backgroundColor: "rgba(255, 193, 7, 0.1)",
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 20,
                                    minWidth: 60,
                                    justifyContent: "center",
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: "bold",
                                        color: "#FFC107",
                                        marginRight: 2,
                                    }}
                                >
                                    {friend.current_level || 1}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: "500",
                                        color: "#FFC107",
                                        opacity: 0.8,
                                    }}
                                >
                                    lvl
                                </Text>
                            </View>
                        </View>

                        {(() => {
                            try {
                                // Proper selfie validation like SelfieIndicator
                                if (friend.selfie_urls && friend.weather_condition) {
                                    const weatherKey = mapWeatherToSelfieKey(friend.weather_condition);
                                    const selfieUrl = friend.selfie_urls[weatherKey];
                                    if (selfieUrl && typeof selfieUrl === 'string') {
                                        return (
                                            <Image
                                                source={{ uri: selfieUrl }}
                                                style={{
                                                    width: 100,
                                                    height: 100,
                                                    borderRadius: 50,
                                                    resizeMode: "cover",
                                                    backgroundColor: "#eee",
                                                    marginBottom: 60,
                                                    marginTop: 30,
                                                }}
                                                onError={() => {
                                                    if (__DEV__) {
                                                        console.log('Failed to load selfie image');
                                                    }
                                                }}
                                            />
                                        );
                                    }
                                }
                            } catch (error) {
                                if (__DEV__) {
                                    console.error('Error rendering selfie:', error);
                                }
                            }
                            // Fallback to initials when selfie is missing or errors occur
                            const initials = friend.contact_name
                                ? friend.contact_name.split(" ").map((name: string) => name[0]).join("").toUpperCase().slice(0, 2)
                                : "??";
                            return (
                                <View style={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: 50,
                                    backgroundColor: "#eee",
                                    marginBottom: 60,
                                    marginTop: 30,
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}>
                                    <Text style={{
                                        fontSize: 24,
                                        fontWeight: "bold",
                                        color: "#666",
                                    }}>
                                        {initials}
                                    </Text>
                                </View>
                            );
                        })()}
                        {/* Friend's Garden */}
                        <View
                            style={{
                                width: "100%",
                                borderRadius: 16,
                                alignItems: "center",
                                position: "relative",
                                borderBottomLeftRadius: 20,
                                borderBottomRightRadius: 20,
                                marginBottom: 0,
                                paddingBottom: 10,
                                marginTop: 0,
                            }}
                        >
                            <GardenArea
                                gardenOwnerId={friend.id}
                                plants={plantedPlants[friend.id] || []}
                                weatherCondition={friend.weather_condition}
                                onPlantPress={(slotIdx) =>
                                    onPlantPress(friend.id, slotIdx)
                                }
                                onPlantDetailsPress={onPlantDetailsPress}
                                isGardenFull={
                                    (plantedPlants[friend.id] || []).length >= 3
                                }
                            />
                        </View>

                        {/* Weather Card */}
                        {friend.weather_condition &&
                            hourlyForecast.length > 0 &&
                            dailyForecast.length > 0 && (
                                <WeatherCard
                                    currentWeather={{
                                        main: {
                                            temp: friend.weather_temp || 0,
                                            humidity: 50, // Default value since friend data doesn't include this
                                        },
                                        weather: [
                                            {
                                                main: friend.weather_condition,
                                                description:
                                                    getWeatherDescription(
                                                        friend.weather_condition
                                                    ),
                                            },
                                        ],
                                        wind: {
                                            speed: 5, // Default value since friend data doesn't include this
                                        },
                                        name: friend.city_name,
                                    }}
                                    hourlyForecast={hourlyForecast}
                                    dailyForecast={dailyForecast}
                                    cityName={friend.city_name || ""}
                                    hourlyForGraph={hourlyForGraph}
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
                                            {getWeatherIcon(hour.weather) ? (
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
                                                    onError={() => {
                                                        if (__DEV__) {
                                                            console.log('Failed to load weather icon');
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <View style={{
                                                    width: 40,
                                                    height: 40,
                                                    marginBottom: 8,
                                                    backgroundColor: '#f0f0f0',
                                                    borderRadius: 20
                                                }} />
                                            )}
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
                                marginBottom: 100,
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
                                        {getWeatherIcon(day.weather) ? (
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
                                                onError={() => {
                                                    if (__DEV__) {
                                                        console.log('Failed to load weather icon');
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <View style={{
                                                width: 50,
                                                height: 50,
                                                backgroundColor: '#f0f0f0',
                                                borderRadius: 25
                                            }} />
                                        )}
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
        </View>
    );
};

export default FriendCard;
