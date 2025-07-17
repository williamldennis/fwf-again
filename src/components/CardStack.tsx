import React, { useState, useMemo } from "react";
import { View, Dimensions } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import UserCard from "./UserCard";
import FriendCard from "./FriendCard";
import AddFriendsCard from "./AddFriendsCard";
import { Friend } from "../services/contactsService";
import { GrowthService } from "../services/growthService";
import { TimeCalculationService } from "../services/timeCalculationService";

interface CardStackProps {
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
    friends: Friend[];
    friendForecasts: Record<string, any[]>;
    onFetchForecast: (friend: any) => void;
    onShare: () => void;
}

interface StackItem {
    type: "user" | "friend" | "add-friends";
    id: string;
    data?: any;
}

export const CardStack: React.FC<CardStackProps> = ({
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
    friends,
    friendForecasts,
    onFetchForecast,
    onShare,
}) => {
    const screenWidth = Dimensions.get("window").width;
    const screenHeight = Dimensions.get("window").height;
    const [currentIndex, setCurrentIndex] = useState(0);

    // Sort friends by harvest readiness (soonest to be ready)
    const sortedFriends = useMemo(() => {
        return [...friends].sort((a, b) => {
            const aPlants = plantedPlants[a.id] || [];
            const bPlants = plantedPlants[b.id] || [];
            const getSoonestHarvestTime = (
                plants: any[],
                friendWeather: string
            ) => {
                if (plants.length === 0) return Infinity;
                return Math.min(
                    ...plants.map((plant) => {
                        const plantObject = plant.plant || {
                            id: plant.plant_id,
                            name: plant.plant_name || "Unknown",
                            growth_time_hours: plant.growth_time_hours || 0,
                            weather_bonus: plant.weather_bonus || {
                                sunny: 1,
                                cloudy: 1,
                                rainy: 1,
                            },
                        };
                        return TimeCalculationService.getTimeToMaturity(
                            plant.planted_at,
                            plantObject,
                            friendWeather
                        );
                    })
                );
            };
            const aSoonest = getSoonestHarvestTime(
                aPlants,
                a.weather_condition || "clear"
            );
            const bSoonest = getSoonestHarvestTime(
                bPlants,
                b.weather_condition || "clear"
            );
            return aSoonest - bSoonest;
        });
    }, [friends, plantedPlants]);

    // Create stack items: user card, friend cards, add friends card
    const stackItems: StackItem[] = useMemo(() => {
        const items: StackItem[] = [
            { type: "user" as const, id: "user-card" },
            ...sortedFriends.map((friend) => ({
                type: "friend" as const,
                id: friend.id,
                data: friend,
            })),
            { type: "add-friends" as const, id: "add-friends" },
        ];
        return items;
    }, [sortedFriends]);

    // Render a single card
    const renderCard = ({ item }: { item: StackItem }) => {
        if (item.type === "user") {
            return (
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <UserCard
                        weather={weather}
                        selfieUrls={selfieUrls}
                        userPoints={userPoints}
                        currentUserId={currentUserId}
                        plantedPlants={plantedPlants}
                        onPlantPress={onPlantPress}
                        onPlantDetailsPress={onPlantDetailsPress}
                        forecastData={forecastData}
                        loading={loading}
                        error={error}
                        cardWidth={cardWidth}
                        cardHeight={screenHeight}
                    />
                </View>
            );
        }

        if (item.type === "friend" && item.data) {
            return (
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <FriendCard
                        friend={item.data}
                        plantedPlants={plantedPlants}
                        onPlantPress={onPlantPress}
                        onPlantDetailsPress={onPlantDetailsPress}
                        forecastData={friendForecasts[item.data.id] || []}
                        cardWidth={cardWidth}
                        cardHeight={screenHeight}
                        onFetchForecast={onFetchForecast}
                    />
                </View>
            );
        }

        if (item.type === "add-friends") {
            return (
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <AddFriendsCard
                        onShare={onShare}
                        cardWidth={cardWidth}
                        cardHeight={screenHeight}
                    />
                </View>
            );
        }
        // Return a default view to satisfy the type requirement
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <View />
            </View>
        );
    };

    return (
        <View
            style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
            }}
        >
            <Carousel
                loop={true}
                width={cardWidth}
                height={screenHeight}
                data={stackItems}
                renderItem={renderCard}
                onSnapToItem={setCurrentIndex}
                mode="parallax"
                modeConfig={{
                    parallaxScrollingScale: 0.9,
                    parallaxScrollingOffset: 50,
                }}
            />

            {/* Stack indicator dots */}
            <View
                style={{
                    position: "absolute",
                    bottom: 40,
                    left: 0,
                    right: 0,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                }}
            >
                {stackItems.map((_, index) => (
                    <View
                        key={index}
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor:
                                index === currentIndex ? "#007AFF" : "#D1D5DB",
                        }}
                    />
                ))}
            </View>
        </View>
    );
};

export default CardStack;
