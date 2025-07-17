import React, { useState, useMemo } from "react";
import { View, Dimensions } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedGestureHandler,
    withSpring,
    withTiming,
    interpolate,
    Extrapolate,
    runOnJS,
} from "react-native-reanimated";
import { GrowthService } from "../services/growthService";
import { TimeCalculationService } from "../services/timeCalculationService";
import UserCard from "./UserCard";
import FriendCard from "./FriendCard";
import AddFriendsCard from "./AddFriendsCard";
import { Friend } from "../services/contactsService";

interface CardStackProps {
    // User data
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

    // Friends data
    friends: Friend[];
    friendForecasts: Record<string, any[]>;
    onFetchForecast: (friend: any) => void;

    // Add friends
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
    const screenHeight = Dimensions.get("window").height;
    const [currentIndex, setCurrentIndex] = useState(0);

    // Sort friends by harvest readiness (soonest to be ready)
    const sortedFriends = useMemo(() => {
        return [...friends].sort((a, b) => {
            const aPlants = plantedPlants[a.id] || [];
            const bPlants = plantedPlants[b.id] || [];

            // Get the soonest harvest time for each friend
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

            return aSoonest - bSoonest; // Soonest first
        });
    }, [friends, plantedPlants]);

    // Create stack items: user card, friend cards, add friends card
    const stackItems: StackItem[] = useMemo(() => {
        const items: StackItem[] = [{ type: "user", id: "user-card" }];

        // Add friend cards
        sortedFriends.forEach((friend) => {
            items.push({ type: "friend", id: friend.id, data: friend });
        });

        // Add friends card at the end
        items.push({ type: "add-friends", id: "add-friends" });

        return items;
    }, [sortedFriends]);

    // Animation values
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);

    // Gesture handler for swipe
    const gestureHandler = useAnimatedGestureHandler({
        onStart: (_, context: any) => {
            context.startY = translateY.value;
        },
        onActive: (event, context: any) => {
            translateY.value = context.startY + event.translationY;
            // Add resistance as user swipes
            scale.value = interpolate(
                Math.abs(translateY.value),
                [0, screenHeight * 0.3],
                [1, 0.95],
                Extrapolate.CLAMP
            );
        },
        onEnd: (event) => {
            const shouldSwipe =
                Math.abs(event.translationY) > screenHeight * 0.2 ||
                Math.abs(event.velocityY) > 500;

            if (shouldSwipe) {
                const direction = event.translationY > 0 ? 1 : -1;
                runOnJS(handleSwipe)(direction);
            } else {
                // Snap back to center
                translateY.value = withSpring(0);
                scale.value = withSpring(1);
            }
        },
    });

    const handleSwipe = (direction: number) => {
        const newIndex =
            direction > 0
                ? (currentIndex + 1) % stackItems.length
                : (currentIndex - 1 + stackItems.length) % stackItems.length;

        setCurrentIndex(newIndex);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
    };

    // Animated styles
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }, { scale: scale.value }],
    }));

    // Render a card with stack positioning
    const renderStackCard = (item: StackItem, index: number) => {
        const isTopCard = index === currentIndex;
        const isVisible = index >= currentIndex && index <= currentIndex + 2; // Show 3 cards max

        if (!isVisible) return null;

        const stackIndex = index - currentIndex;
        const cardStyle = {
            position: "absolute" as const,
            top: stackIndex * 40, // 40px spacing between cards
            left: 0,
            right: 0,
            zIndex: 100 - stackIndex, // Higher cards on top
            transform: [
                { scale: 1 - stackIndex * 0.05 }, // Scale down each card
                { translateY: stackIndex * 20 }, // Slight vertical offset
            ],
            opacity: 1 - stackIndex * 0.3, // Fade out each card
        };

        return (
            <View key={item.id} style={cardStyle}>
                {item.type === "user" && (
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
                    />
                )}

                {item.type === "friend" && item.data && (
                    <FriendCard
                        friend={item.data}
                        plantedPlants={plantedPlants}
                        onPlantPress={onPlantPress}
                        onPlantDetailsPress={onPlantDetailsPress}
                        forecastData={friendForecasts[item.data.id] || []}
                        cardWidth={cardWidth}
                        onFetchForecast={onFetchForecast}
                    />
                )}

                {item.type === "add-friends" && (
                    <AddFriendsCard onShare={onShare} cardWidth={cardWidth} />
                )}
            </View>
        );
    };

    return (
        <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
            <PanGestureHandler onGestureEvent={gestureHandler}>
                <Animated.View
                    style={[{ flex: 1, width: "100%" }, animatedStyle]}
                >
                    {stackItems.map((item, index) =>
                        renderStackCard(item, index)
                    )}
                </Animated.View>
            </PanGestureHandler>

            {/* Stack indicator dots */}
            <View
                style={{
                    position: "absolute",
                    bottom: 40,
                    flexDirection: "row",
                    alignItems: "center",
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
