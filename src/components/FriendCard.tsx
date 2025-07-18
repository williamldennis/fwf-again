import React from "react";
import { View, Text, Image } from "react-native";
import LottieView from "lottie-react-native";
import GardenArea from "./GardenArea";
import FiveDayForecast from "./FiveDayForecast";
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
                {/* Friend name at top */}
                <Text
                    style={{
                        fontWeight: "bold",
                        fontSize: 28,
                        textAlign: "center",
                        marginTop: 0,
                        marginBottom: 10,
                        color: "white",
                    }}
                >
                    {friend.contact_name || "Unknown"}
                </Text>
                {/* Points as subheader */}
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
                        marginBottom: 20,
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
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        resizeMode: "cover",
                        backgroundColor: "#eee",
                        marginTop: 20, // space for Lottie
                        marginBottom: 0,
                    }}
                />
                {/* Weather text */}
                <Text
                    style={{
                        fontSize: 20,
                        color: "white",
                        textAlign: "center",
                        marginBottom: 20,
                        marginTop: 40,
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
                        {getWeatherDescription(friend.weather_condition || "")}
                    </Text>{" "}
                    in{" "}
                    <Text style={{ fontWeight: "bold" }}>
                        {friend.city_name}
                    </Text>
                </Text>
                {forecastData && forecastData.length > 0 ? (
                    <FiveDayForecast forecastData={forecastData} />
                ) : (
                    <Text
                        style={{
                            color: "#999",
                            fontSize: 12,
                            marginTop: 10,
                        }}
                    >
                        No forecast data available
                    </Text>
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
                    {friend.weather_condition && (
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
                                    friend.weather_condition
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
                    {/* Friend's Garden */}
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
            </View>
        </View>
    );
};

export default FriendCard;
