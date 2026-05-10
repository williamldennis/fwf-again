import React, { useState, useMemo } from "react";
import { View, Dimensions } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import UserCard from "./UserCard";
import FriendCard from "./FriendCard";
import AddFriendsCard from "./AddFriendsCard";
import SelfieIndicator from "./SelfieIndicator";
import CarouselFooter from "./CarouselFooter";
import { ErrorBoundary } from "./ErrorBoundary";
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
    onPlantDetailsPress: (plant: any, friendWeather: string, potPosition?: { x: number; y: number }) => void;
    onWeatherPress?: () => void;
    forecastData: any[];
    hourlyForecast?: any[];
    hourlyForGraph?: any[];
    dailyForecast?: any[];
    loading: boolean;
    error: string | null;
    cardWidth: number;
    friends: Friend[];
    friendForecasts: Record<
        string,
        {
            forecast: any[];
            hourly: any[];
            daily: any[];
            hourlyForGraph: any[];
        }
    >;
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
    onWeatherPress,
    forecastData,
    hourlyForecast = [],
    hourlyForGraph = [],
    dailyForecast = [],
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
    const carouselRef = React.useRef<any>(null);

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
                        // Use expanded plant data from PocketBase, or fallback to default
                        // plant.plant is just the ID string, plant.expand.plant is the full object
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
    }, [friends]); // Removed plantedPlants dependency to prevent re-sorting

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
                    key={item.id}
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
                        onWeatherPress={onWeatherPress}
                        forecastData={forecastData}
                        hourlyForecast={hourlyForecast}
                        hourlyForGraph={hourlyForGraph}
                        dailyForecast={dailyForecast}
                        loading={loading}
                        error={error}
                        cardWidth={cardWidth}
                        cardHeight={screenHeight}
                    />
                </View>
            );
        }

        if (item.type === "friend" && item.data) {
            const friendForecastData = friendForecasts[item.data.id];
            return (
                <View
                    key={item.id}
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <ErrorBoundary>
                        <FriendCard
                            friend={item.data}
                            plantedPlants={plantedPlants}
                            onPlantPress={onPlantPress}
                            onPlantDetailsPress={onPlantDetailsPress}
                            forecastData={friendForecastData?.forecast || []}
                            cardWidth={cardWidth}
                            cardHeight={screenHeight}
                            onFetchForecast={onFetchForecast}
                            hourlyForecast={friendForecastData?.hourly || []}
                            dailyForecast={friendForecastData?.daily || []}
                            hourlyForGraph={friendForecastData?.hourlyForGraph || []}
                        />
                    </ErrorBoundary>
                </View>
            );
        }

        if (item.type === "add-friends") {
            return (
                <View
                    key={item.id}
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
                key={item.id}
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
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View
                style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                }}
            >
                <Carousel
                    ref={carouselRef}
                    loop={stackItems.length > 2}
                    width={cardWidth}
                    height={screenHeight}
                    data={stackItems}
                    renderItem={renderCard}
                    onSnapToItem={setCurrentIndex}
                    windowSize={3}
                />

                {/* Stack indicator selfies with blurred footer */}
                <CarouselFooter>
                    {stackItems.map((item, index) => (
                        <SelfieIndicator
                            key={index}
                            item={item}
                            isActive={index === currentIndex}
                            selfieUrls={selfieUrls}
                            weather={weather}
                            plantedPlants={plantedPlants}
                            currentUserId={currentUserId}
                            onPress={(pressedIndex) => {
                                // Navigate to the pressed card using shortest path
                                if (
                                    pressedIndex !== currentIndex &&
                                    carouselRef.current
                                ) {
                                    const totalItems = stackItems.length;

                                    // Calculate forward and backward distances
                                    const forwardDistance = (pressedIndex - currentIndex + totalItems) % totalItems;
                                    const backwardDistance = (currentIndex - pressedIndex + totalItems) % totalItems;

                                    // Use the shorter path (count: positive = forward, negative = backward)
                                    const count = forwardDistance <= backwardDistance
                                        ? forwardDistance
                                        : -backwardDistance;

                                    carouselRef.current.scrollTo({
                                        count,
                                        animated: true,
                                    });
                                }
                                // Note: currentIndex is updated via onSnapToItem callback
                            }}
                            index={index}
                        />
                    ))}
                </CarouselFooter>
            </View>
        </GestureHandlerRootView>
    );
};

export default CardStack;
