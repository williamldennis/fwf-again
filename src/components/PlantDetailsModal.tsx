import React, { useEffect } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
// @ts-ignore
import { DateTime } from "luxon";
import { supabase } from "../utils/supabase";
import { GrowthService } from "../services/growthService";
import { TimeCalculationService } from "../services/timeCalculationService";

interface PlantDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    plant: any; // The planted plant data with joined plant info
    onHarvest?: () => void; // Callback to refresh plants after harvest
    currentUserId?: string; // Current user's ID to check if they can harvest
    friendWeather?: string; // Friend's current weather for accurate growth calculation
    planterName: string; // Name of the person who planted the plant
}

export const PlantDetailsModal: React.FC<PlantDetailsModalProps> = ({
    visible,
    onClose,
    plant,
    onHarvest,
    currentUserId,
    friendWeather = "clear", // Default to clear if not provided
    planterName,
}) => {
    // Bounce animation for harvest-ready plants
    const translateY = useSharedValue(0);

    // useEffect hook - ALWAYS called with consistent dependencies
    useEffect(() => {
        // Only run animation logic if plant exists and is mature
        if (plant && !plant.harvested_at) {
            const plantName =
                plant.plant?.name || plant.plant_name || "Unknown";
            const plantObject = plant.plant || {
                id: plant.plant_id,
                name: plantName,
                growth_time_hours: plant.growth_time_hours || 0,
                image_path: plant.image_path || "",
                created_at: plant.planted_at,
            };

            const isMature = GrowthService.isPlantMature(
                plant,
                plantObject,
                friendWeather
            );

            if (isMature) {
                // Create parabolic bounce animation using withRepeat and custom easing
                translateY.value = withRepeat(
                    withSequence(
                        withTiming(-16, {
                            duration: 400, // Quick jump up
                            easing: Easing.out(Easing.quad),
                        }),
                        withTiming(0, {
                            duration: 600, // Slower fall (gravity)
                            easing: Easing.in(Easing.quad),
                        })
                    ),
                    -1, // Infinite repeat
                    false // Don't reverse, use the sequence as-is
                );
            } else {
                // Stop animation and reset to normal
                translateY.value = withTiming(0, { duration: 300 });
            }
        } else {
            // Stop animation and reset to normal
            translateY.value = withTiming(0, { duration: 300 });
        }
    }, [plant?.id, plant?.harvested_at, friendWeather]); // Stable dependencies

    // Animated style hook - must be called before early return
    const animatedImageStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    // Early return after all hooks
    if (!plant) return null;

    // Calculate values needed for the rest of the component
    const plantName = plant.plant?.name || plant.plant_name || "Unknown";
    const plantObject = plant.plant || {
        id: plant.plant_id,
        name: plantName,
        growth_time_hours: plant.growth_time_hours || 0,
        image_path: plant.image_path || "",
        created_at: plant.planted_at,
    };

    // Use GrowthService to get the weather bonus multiplier for the current weather
    const weatherBonus = GrowthService.getWeatherBonus(
        plantObject,
        friendWeather
    );

    // For debugging or display, keep the original weather_bonus object
    const weatherBonusObject =
        plant.plant?.weather_bonus || plant.weather_bonus || {};
    const growthTimeHours =
        plant.plant?.growth_time_hours || plant.growth_time_hours || 0;

    // Update plantObject with weather bonus (keep the original object structure)
    const updatedPlantObject = {
        ...plantObject,
        weather_bonus: plantObject.weather_bonus, // Keep the original weather_bonus object
    };

    // Check if plant is mature using GrowthService
    const isMature = GrowthService.isPlantMature(
        plant,
        updatedPlantObject,
        friendWeather
    );

    // Use GrowthService for all stage calculations (includes weather effects)
    const growthCalculation = GrowthService.calculateGrowthStage(
        plant,
        updatedPlantObject,
        friendWeather
    );

    // Use the calculated stage for accurate display
    const currentStage = growthCalculation.stage;
    const progress = growthCalculation.progress;

    // Use TimeCalculationService for consistent time calculations
    const timeToMaturity = TimeCalculationService.getTimeToMaturity(
        plant.planted_at,
        updatedPlantObject,
        friendWeather
    );

    const formattedTimeToMaturity =
        TimeCalculationService.getFormattedTimeToMaturity(
            plant.planted_at,
            updatedPlantObject,
            friendWeather
        );

    const formattedTimeSincePlanted =
        TimeCalculationService.getFormattedTimeSincePlanted(plant.planted_at);

    // For display: ensure we never show stage 1 (empty pot) for planted plants
    // Stage 1 = empty pot, Stage 2 = dirt, Stage 3+ = plant growth
    const displayStage = isMature ? 5 : Math.max(2, Math.min(currentStage, 4));

    // Check if current user can harvest (anyone can harvest now)
    const canHarvest = currentUserId && !plant.harvested_at;

    // Handle harvest
    const handleHarvest = async () => {
        if (!canHarvest || !isMature) {
            return;
        }

        // Debug: Log plant data structure
        console.log("[Harvest] 🔍 Plant data structure:", {
            plantId: plant.id,
            plantName: plantName,
            plantData: plant.plant,
            harvestPoints: plant.plant?.harvest_points,
            fallbackPoints: 10,
        });

        // Add haptic feedback when user taps harvest button
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (error) {
            console.log("[Haptics] Could not trigger haptic feedback:", error);
        }

        try {
            const { data, error } = await supabase
                .from("planted_plants")
                .update({
                    harvested_at: new Date().toISOString(),
                    harvester_id: currentUserId,
                })
                .eq("id", plant.id)
                .select("*");

            if (error) {
                console.error("[Harvest] Error harvesting plant:", error);
                Alert.alert(
                    "Error",
                    "Failed to harvest plant. Please try again."
                );
                return;
            }

            // Fetch the updated plant to see if the harvest was successful
            if (!data || data.length === 0) {
                const { data: fetchData, error: fetchError } = await supabase
                    .from("planted_plants")
                    .select("*")
                    .eq("id", plant.id)
                    .single();

                if (fetchError) {
                    console.error(
                        "[Harvest] Error fetching updated plant:",
                        fetchError
                    );
                    Alert.alert(
                        "Error",
                        "Failed to verify harvest. Please try again."
                    );
                    return;
                }

                if (fetchData && fetchData.harvested_at) {
                    // Harvest was successful
                } else {
                    console.error(
                        "[Harvest] Update did not work - harvested_at is still null"
                    );
                    Alert.alert(
                        "Error",
                        "Plant was not found or could not be updated."
                    );
                    return;
                }
            }

            // Award points for harvesting
            try {
                const plantPoints = plant.plant?.harvest_points || 10;
                console.log(`[Harvest] 🌱 Plant points: ${plantPoints}`);

                const { data: profileData, error: profileError } =
                    await supabase
                        .from("profiles")
                        .select("points")
                        .eq("id", currentUserId)
                        .single();

                if (profileError) {
                    console.error(
                        "[Harvest] ❌ Error fetching profile:",
                        profileError
                    );
                } else if (profileData) {
                    const currentPoints = profileData?.points || 0;
                    const newPoints = currentPoints + plantPoints;
                    console.log(
                        `[Harvest] 💰 Points calculation: ${currentPoints} + ${plantPoints} = ${newPoints}`
                    );

                    const { error: updateError } = await supabase
                        .from("profiles")
                        .update({ points: newPoints })
                        .eq("id", currentUserId);

                    if (updateError) {
                        console.error(
                            "[Harvest] ❌ Error updating points:",
                            updateError
                        );
                    } else {
                        console.log(
                            `[Harvest] ✅ Points updated successfully: ${newPoints}`
                        );
                    }
                } else {
                    console.error("[Harvest] ❌ No profile data found");
                }
            } catch (pointsError) {
                console.error(
                    "[Harvest] ❌ Error awarding points:",
                    pointsError
                );
            }

            Alert.alert("Harvested!", `You harvested ${plantName}!`);
            if (onHarvest) onHarvest();
            onClose();
        } catch (error) {
            console.error("[Harvest] Error in handleHarvest:", error);
            Alert.alert(
                "Error",
                "An unexpected error occurred while harvesting."
            );
        }
    };

    // Get weather preference description
    const getWeatherPreference = () => {
        const preferences = [];
        if (weatherBonus > 1.2) preferences.push("Loves sunny weather");
        if (weatherBonus > 1.2) preferences.push("Thrives in cloudy weather");
        if (weatherBonus > 1.2) preferences.push("Enjoys rainy weather");

        if (preferences.length === 0) {
            if (weatherBonus < 0.8) preferences.push("Prefers shade");
            if (weatherBonus < 0.8) preferences.push("Needs more sun");
            if (weatherBonus < 0.8) preferences.push("Drought tolerant");
        }

        return preferences.length > 0
            ? preferences.join(", ")
            : "Adaptable to all weather";
    };

    // Get stage description
    const getStageDescription = (stage: number) => {
        switch (stage) {
            case 1:
                return "Empty Pot";
            case 2:
                return "Freshly Planted";
            case 3:
                return "Sprouting";
            case 4:
                return "Growing";
            case 5:
                return "Mature";
            default:
                return "Unknown Stage";
        }
    };

    // Get plant image for current stage
    const getPlantImage = (plantName: string, stage: number) => {
        if (stage === 2) return require("../../assets/images/plants/dirt.png");

        // Convert plant name to match the image mapping keys
        const plantNameLower = plantName.toLowerCase().replace(/\s+/g, "_");
        const plantStageImages: Record<string, Record<number, any>> = {
            sunflower: {
                3: require("../../assets/images/plants/sunflower/sprout.png"),
                4: require("../../assets/images/plants/sunflower/adolescent.png"),
                5: require("../../assets/images/plants/sunflower/mature.png"),
            },
            mushroom: {
                3: require("../../assets/images/plants/mushroom/sprout.png"),
                4: require("../../assets/images/plants/mushroom/adolescent.png"),
                5: require("../../assets/images/plants/mushroom/mature.png"),
            },
            fern: {
                3: require("../../assets/images/plants/fern/sprout.png"),
                4: require("../../assets/images/plants/fern/adolescent.png"),
                5: require("../../assets/images/plants/fern/mature.png"),
            },
            cactus: {
                3: require("../../assets/images/plants/cactus/sprout.png"),
                4: require("../../assets/images/plants/cactus/adolescent.png"),
                5: require("../../assets/images/plants/cactus/mature.png"),
            },
            water_lily: {
                3: require("../../assets/images/plants/water_lily/sprout.png"),
                4: require("../../assets/images/plants/water_lily/adolescent.png"),
                5: require("../../assets/images/plants/water_lily/mature.png"),
            },
            pine_tree: {
                3: require("../../assets/images/plants/pine_tree/sprout.png"),
                4: require("../../assets/images/plants/pine_tree/adolescent.png"),
                5: require("../../assets/images/plants/pine_tree/mature.png"),
            },
        };

        return (
            plantStageImages[plantNameLower]?.[stage] ||
            require("../../assets/images/plants/dirt.png")
        );
    };

    // Calculate weather effect percent and label (reuse weatherBonus)
    const weatherEffectPercent = Math.round(weatherBonus * 100);
    // Map weather conditions to display names
    const getWeatherDisplayName = (weather: string): string => {
        const weatherMapping: Record<string, string> = {
            clear: "sunny",
            clouds: "cloudy",
            rain: "rainy",
            drizzle: "rainy",
            mist: "rainy",
            fog: "rainy",
            haze: "rainy",
            snow: "rainy",
            thunderstorm: "rainy",
        };

        const mappedWeather =
            weatherMapping[weather.toLowerCase()] || weather.toLowerCase();
        return mappedWeather;
    };

    const weatherLabel = getWeatherDisplayName(friendWeather);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Close (X) button in upper right */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* TOP SECTION */}
                        <View style={styles.topSection}>
                            {/* 1. Plant Title */}
                            <Text style={styles.plantTitle}>{plantName}</Text>
                            {/* 2. Planted X hours ago by {planterName} */}
                            <Text style={styles.plantedInfo}>
                                Planted {formattedTimeSincePlanted} ago by{" "}
                                {planterName}
                            </Text>
                            <View style={styles.imageContainer}>
                                <Animated.View style={animatedImageStyle}>
                                    <Image
                                        source={getPlantImage(
                                            plantName,
                                            displayStage
                                        )}
                                        style={[
                                            styles.plantImage,
                                            {
                                                shadowColor: "#FFAE00",
                                                shadowOffset: {
                                                    width: 0,
                                                    height: 0,
                                                },
                                                shadowOpacity:
                                                    isMature &&
                                                    !plant.harvested_at
                                                        ? 0.6
                                                        : 0,
                                                shadowRadius: 10,
                                            },
                                        ]}
                                        contentFit="contain"
                                        cachePolicy="memory-disk"
                                    />
                                </Animated.View>
                            </View>
                            {/* 3. Harvest Button */}
                            {canHarvest && (
                                <TouchableOpacity
                                    onPress={handleHarvest}
                                    disabled={!isMature}
                                    style={[
                                        styles.harvestButton,
                                        isMature
                                            ? styles.harvestButtonEnabled
                                            : styles.harvestButtonDisabled,
                                    ]}
                                    testID="harvest-plant"
                                >
                                    <Text
                                        style={[
                                            styles.harvestButtonText,
                                            isMature
                                                ? styles.harvestButtonTextEnabled
                                                : styles.harvestButtonTextDisabled,
                                        ]}
                                    >
                                        {isMature
                                            ? "Harvest"
                                            : `${formattedTimeToMaturity} to Harvest`}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {/* Points value - always visible */}
                            <Text style={styles.harvestPointsText}>
                                +{plant.plant?.harvest_points || 10} pts
                            </Text>
                        </View>
                        {/* END TOP SECTION */}
                        {/* CURRENT WEATHER EFFECT SECTION */}
                        <View style={styles.weatherEffectSection}>
                            <Text style={styles.weatherEffectTitle}>
                                Weather Growth Speed
                            </Text>
                            <View style={styles.weatherEffectBox}>
                                {/* Left: Circle with percent */}
                                <View
                                    style={[
                                        styles.weatherEffectCircle,
                                        weatherEffectPercent > 100
                                            ? styles.weatherEffectCircleUp
                                            : weatherEffectPercent < 100
                                              ? styles.weatherEffectCircleDown
                                              : styles.weatherEffectCircleNeutral,
                                    ]}
                                >
                                    <Text
                                        style={styles.weatherEffectCircleText}
                                    >
                                        {weatherEffectPercent}%
                                    </Text>
                                </View>
                                {/* Right: Sentence */}
                                <Text style={styles.weatherEffectCopy}>
                                    Current {weatherLabel} weather{" "}
                                    {weatherEffectPercent > 100
                                        ? "speeds up"
                                        : weatherEffectPercent < 100
                                          ? "slows down"
                                          : "does not affect"}{" "}
                                    this plant's growth by{" "}
                                    {weatherEffectPercent}%
                                </Text>
                            </View>
                        </View>
                        {/* END CURRENT WEATHER EFFECT SECTION */}
                        {/* GROWTH PROGRESS SECTION */}
                        <View style={styles.growthSection}>
                            <Text style={styles.growthTitle}>
                                Growth Progress: {progress}%
                            </Text>
                            <View style={styles.stepperBox}>
                                {[
                                    {
                                        key: 2,
                                        displayKey: "1",
                                        label: "Freshly Planted",
                                    },
                                    {
                                        key: 3,
                                        displayKey: "2",
                                        label: "Sprouting",
                                    },
                                    {
                                        key: 4,
                                        displayKey: "3",
                                        label: "Growing",
                                    },
                                    {
                                        key: 5,
                                        displayKey: "$",
                                        label: "Ready to Harvest",
                                    },
                                ].map((step, idx) => {
                                    let isComplete = false;
                                    let isCurrent = false;
                                    if (step.key === 5) {
                                        isComplete = isMature;
                                        isCurrent = isMature;
                                    } else {
                                        isComplete = displayStage > step.key;
                                        isCurrent =
                                            displayStage === step.key &&
                                            !isMature;
                                    }
                                    return (
                                        <View
                                            key={step.key}
                                            style={styles.stepRow}
                                        >
                                            <View
                                                style={[
                                                    styles.stepCircle,
                                                    isComplete || isCurrent
                                                        ? styles.stepCircleActive
                                                        : styles.stepCircleInactive,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.stepCircleText,
                                                        isComplete || isCurrent
                                                            ? styles.stepCircleTextActive
                                                            : styles.stepCircleTextInactive,
                                                    ]}
                                                >
                                                    {step.displayKey}
                                                </Text>
                                            </View>
                                            <Text
                                                style={[
                                                    styles.stepLabel,
                                                    isCurrent &&
                                                        styles.stepLabelCurrent,
                                                ]}
                                            >
                                                {step.label}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                        {/* END GROWTH PROGRESS SECTION */}

                        {/* PLANT INFO SECTION */}
                        <Text style={styles.plantInfoTitle}>Plant Info</Text>
                        <View style={styles.plantInfoSection}>
                            <View style={styles.plantInfoHeaderRow}>
                                {/* Mature plant image on left */}
                                <Image
                                    source={getPlantImage(plantName, 5)}
                                    style={styles.plantInfoImage}
                                    contentFit="contain"
                                    cachePolicy="memory-disk"
                                />
                                {/* Name and grow time on right */}
                                <View style={styles.plantInfoTextCol}>
                                    <Text style={styles.plantInfoName}>
                                        {plantName}
                                    </Text>
                                    <Text style={styles.plantInfoGrowTime}>
                                        Average Grow Time: {growthTimeHours}{" "}
                                        hours
                                    </Text>
                                    <Text style={styles.plantInfoPoints}>
                                        Harvest Points: +
                                        {plant.plant?.harvest_points || 10} pts
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.plantInfoDivider} />
                            <Text style={styles.plantInfoWeatherTitle}>
                                Weather Growth Speed
                            </Text>
                            <Text style={styles.plantInfoWeatherDesc}>
                                The {plantName.toLowerCase()}{" "}
                                {GrowthService.getWeatherPreferenceDescription(
                                    plantObject
                                ).toLowerCase()}
                                .
                            </Text>
                            <View style={styles.plantInfoWeatherRow}>
                                {["sunny", "cloudy", "rainy"].map((type) => (
                                    <View
                                        key={type}
                                        style={styles.plantInfoWeatherCol}
                                    >
                                        <Text
                                            style={styles.plantInfoWeatherType}
                                        >
                                            {type.charAt(0).toUpperCase() +
                                                type.slice(1)}
                                        </Text>
                                        <Text
                                            style={styles.plantInfoWeatherValue}
                                        >
                                            {plantObject.weather_bonus &&
                                            plantObject.weather_bonus[type]
                                                ? Math.round(
                                                      plantObject.weather_bonus[
                                                          type
                                                      ] * 100
                                                  )
                                                : 100}
                                            %
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                        {/* END PLANT INFO SECTION */}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    container: {
        backgroundColor: "#fff",
        borderRadius: 20,
        width: "90%",
        maxHeight: "80%",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    closeButton: {
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#f0f0f0",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    closeButtonText: {
        fontSize: 22,
        color: "#666",
        fontWeight: "bold",
    },
    topSection: {
        alignItems: "center",
        marginBottom: 20,
        marginTop: 40,
    },
    plantTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#222",
        marginBottom: 4,
        textAlign: "center",
    },
    plantedInfo: {
        fontSize: 14,
        color: "#666",
        marginBottom: 0,
        textAlign: "center",
    },
    harvestButton: {
        width: "90%",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 8,
    },
    harvestButtonEnabled: {
        backgroundColor: "#4CAF50",
    },
    harvestButtonDisabled: {
        backgroundColor: "#ccc",
    },
    harvestButtonText: {
        fontSize: 18,
        fontWeight: "bold",
    },
    harvestButtonTextEnabled: {
        color: "#fff",
    },
    harvestButtonTextDisabled: {
        color: "#666",
    },
    harvestPointsText: {
        fontSize: 14,
        color: "#007AFF",
        textAlign: "center",
        marginTop: 8,
        fontWeight: "bold",
    },
    imageContainer: {
        alignItems: "center",
        padding: 20,
    },
    plantImage: {
        marginTop: -36,
        width: 220,
        height: 220,
    },
    growthSection: {
        marginTop: 24,
        marginBottom: 24,
        alignItems: "center",
    },
    growthTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#222",
        marginBottom: 16,
        alignSelf: "flex-start",
        marginLeft: 16,
    },
    stepperBox: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 20,
        padding: 24,
        width: "90%",
        alignSelf: "center",
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 18,
    },
    stepCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    stepCircleActive: {
        backgroundColor: "orange",
    },
    stepCircleInactive: {
        backgroundColor: "#E0E0E0",
    },
    stepCircleText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    stepCircleTextActive: {
        color: "#fff",
    },
    stepCircleTextInactive: {
        color: "#666",
    },
    stepLabel: {
        fontSize: 18,
        color: "#222",
    },
    stepLabelCurrent: {
        fontWeight: "bold",
    },
    weatherEffectSection: {
        marginTop: 8,
        marginBottom: 24,
        width: "100%",
        alignItems: "flex-start",
    },
    weatherEffectTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#222",
        marginBottom: 12,
        marginLeft: 16,
    },
    weatherEffectBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 12,
        width: "92%",
    },
    weatherEffectCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 20,
    },
    weatherEffectCircleUp: {
        backgroundColor: "#179A3D",
    },
    weatherEffectCircleDown: {
        backgroundColor: "#D32F2F",
    },
    weatherEffectCircleNeutral: {
        backgroundColor: "#BDBDBD",
    },
    weatherEffectCircleText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    weatherEffectCopy: {
        flex: 1,
        fontSize: 16,
        color: "#222",
        fontWeight: "400",
        lineHeight: 26,
    },
    plantInfoSection: {
        backgroundColor: "#fff",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#ccc",
        marginHorizontal: 16,
        marginBottom: 24,
        padding: 20,
    },
    plantInfoTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#222",
        marginBottom: 12,
        marginLeft: 16,
    },
    plantInfoHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    plantInfoImage: {
        width: 40,
        height: 64,
        marginRight: 16,
    },
    plantInfoTextCol: {
        flex: 1,
        justifyContent: "center",
    },
    plantInfoName: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#222",
        textAlign: "left",
    },
    plantInfoGrowTime: {
        fontSize: 16,
        color: "#444",
        textAlign: "left",
        marginTop: 2,
    },
    plantInfoPoints: {
        fontSize: 16,
        color: "#007AFF",
        textAlign: "left",
        marginTop: 4,
        fontWeight: "bold",
    },
    plantInfoDivider: {
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
        marginVertical: 10,
    },
    plantInfoWeatherTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#222",
        marginBottom: 8,
    },
    plantInfoWeatherDesc: {
        fontSize: 13,
        color: "#444",
        fontStyle: "italic",
        marginBottom: 16,
    },
    plantInfoWeatherRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    plantInfoWeatherCol: {
        alignItems: "center",
        flex: 1,
    },
    plantInfoWeatherType: {
        fontSize: 17,
        color: "#222",
        marginBottom: 4,
    },
    plantInfoWeatherValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#222",
    },
});

export default PlantDetailsModal;
