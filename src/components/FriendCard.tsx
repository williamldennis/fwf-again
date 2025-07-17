import React from "react";
import { View, Text, Image } from "react-native";
import LottieView from "lottie-react-native";
import GardenArea from "./GardenArea";
import FiveDayForecast from "./FiveDayForecast";

interface FriendCardProps {
    friend: any;
    plantedPlants: Record<string, any[]>;
    onPlantPress: (friendId: string, slotIdx: number) => void;
    onPlantDetailsPress: (plant: any, friendWeather: string) => void;
    forecastData: any[];
    cardWidth: number;
    cardHeight?: number;
    onFetchForecast: (friend: any) => void;
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

export const FriendCard: React.FC<FriendCardProps> = ({
    friend,
    plantedPlants,
    onPlantPress,
    onPlantDetailsPress,
    forecastData,
    cardWidth,
    cardHeight,
    onFetchForecast,
}) => {
    // Trigger forecast fetch when component renders
    React.useEffect(() => {
        onFetchForecast(friend);
    }, [friend.id]);

    return (
        <View
            style={{
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 120, // Account for header height
                paddingBottom: 20,
                zIndex: 1,
                height: cardHeight,
            }}
        >
            <View
                style={{
                    width: cardWidth - 32, // Add some padding for the card
                    backgroundColor: "#DFEFFF",
                    borderRadius: 20,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
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
                    {friend.contact_name || "Unknown"}&apos;s Garden
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
                                top: 100,
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
                                friend.selfie_urls &&
                                mapWeatherToSelfieKey(friend.weather_condition)
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
                                ? Math.round(friend.weather_temp)
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
                <FiveDayForecast forecastData={forecastData} />
            </View>
        </View>
    );
};

export default FriendCard;
