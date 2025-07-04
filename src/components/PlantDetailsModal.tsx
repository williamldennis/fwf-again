import React from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    ScrollView,
    Alert,
} from "react-native";
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
    if (!plant) return null;

    const plantName = plant.plant?.name || plant.plant_name || "Unknown";
    const weatherBonus =
        plant.plant?.weather_bonus || plant.weather_bonus || {};
    const growthTimeHours =
        plant.plant?.growth_time_hours || plant.growth_time_hours || 0;

    // Create plant object for service calls
    const plantObject = plant.plant || {
        id: plant.plant_id,
        name: plantName,
        growth_time_hours: growthTimeHours,
        weather_bonus: weatherBonus,
        image_path: plant.image_path || "",
        created_at: plant.planted_at,
    };

    // Use GrowthService for all stage calculations (includes weather effects)
    const growthCalculation = GrowthService.calculateGrowthStage(
        plant,
        plantObject,
        friendWeather
    );

    // Use the calculated stage for accurate display
    const currentStage = growthCalculation.stage;

    // Use TimeCalculationService for consistent time calculations
    const timeToMaturity = TimeCalculationService.getTimeToMaturity(
        plant.planted_at,
        plantObject,
        friendWeather
    );

    const formattedTimeToMaturity =
        TimeCalculationService.getFormattedTimeToMaturity(
            plant.planted_at,
            plantObject,
            friendWeather
        );

    const formattedTimeSincePlanted =
        TimeCalculationService.getFormattedTimeSincePlanted(plant.planted_at);

    // Check if plant is mature using GrowthService
    const isMature = GrowthService.isPlantMature(
        plant,
        plantObject,
        friendWeather
    );

    // Check if current user can harvest (anyone can harvest now)
    const canHarvest = currentUserId && !plant.harvested_at;

    // Debug logging for harvest state
    console.log("PlantDetailsModal harvest state:", {
        plantName,
        currentStage,
        isMature,
        canHarvest,
        harvested_at: plant.harvested_at,
        currentUserId,
        plantId: plant.id,
        plantData: {
            id: plant.id,
            garden_owner_id: plant.garden_owner_id,
            planter_id: plant.planter_id,
            plant_id: plant.plant_id,
            planted_at: plant.planted_at,
            current_stage: plant.current_stage,
            is_mature: plant.is_mature,
            harvested_at: plant.harvested_at,
            harvester_id: plant.harvester_id,
        },
        growthCalculation: {
            stage: growthCalculation.stage,
            progress: growthCalculation.progress,
        },
    });

    // Handle harvest
    const handleHarvest = async () => {
        console.log("Harvest attempt:", {
            canHarvest,
            isMature,
            plantId: plant.id,
            currentUserId,
            plantName,
        });

        if (!canHarvest || !isMature) {
            console.log("Harvest blocked:", { canHarvest, isMature });
            return;
        }

        try {
            console.log("Updating database for harvest...");
            console.log("Plant ID to update:", plant.id);
            console.log("Current user ID:", currentUserId);
            console.log("Current plant data:", {
                id: plant.id,
                harvested_at: plant.harvested_at,
                harvester_id: plant.harvester_id,
            });

            const { data, error } = await supabase
                .from("planted_plants")
                .update({
                    harvested_at: new Date().toISOString(),
                    harvester_id: currentUserId,
                })
                .eq("id", plant.id)
                .select("*");

            console.log("Supabase response:", { data, error });

            if (error) {
                console.error("Error harvesting plant:", error);
                Alert.alert(
                    "Error",
                    "Failed to harvest plant. Please try again."
                );
                return;
            }

            console.log("Harvest successful:", data);

            // Since Supabase update with select is returning empty array,
            // let's verify the update actually worked by fetching the updated record
            if (!data || data.length === 0) {
                console.log(
                    "Update returned empty array, checking if update actually worked..."
                );

                // Fetch the updated plant to see if the harvest was successful
                const { data: fetchData, error: fetchError } = await supabase
                    .from("planted_plants")
                    .select("*")
                    .eq("id", plant.id)
                    .single();

                console.log("Fetch after update result:", {
                    fetchData,
                    fetchError,
                });

                if (fetchError) {
                    console.error("Error fetching updated plant:", fetchError);
                    Alert.alert(
                        "Error",
                        "Failed to verify harvest. Please try again."
                    );
                    return;
                }

                // Check if the harvest actually worked
                if (fetchData && fetchData.harvested_at) {
                    console.log(
                        "Harvest was successful! Updated plant:",
                        fetchData
                    );

                    Alert.alert("Harvested!", `You harvested ${plantName}!`);

                    // Call the callback to refresh plants
                    if (onHarvest) {
                        console.log("Calling onHarvest callback...");
                        onHarvest();
                    }

                    onClose();
                    return;
                } else {
                    console.error(
                        "Update did not work - harvested_at is still null"
                    );
                    Alert.alert(
                        "Error",
                        "Plant was not found or could not be updated."
                    );
                    return;
                }
            }

            const updatedPlant = data[0];
            console.log("Updated plant data:", updatedPlant);

            Alert.alert("Harvested!", `You harvested ${plantName}!`);

            // Call the callback to refresh plants
            if (onHarvest) {
                console.log("Calling onHarvest callback...");
                onHarvest();
            }

            onClose();
        } catch (error) {
            console.error("Error harvesting plant:", error);
            Alert.alert(
                "Error",
                "An unexpected error occurred while harvesting."
            );
        }
    };

    // Get weather preference description
    const getWeatherPreference = () => {
        const preferences = [];
        if (weatherBonus.sunny > 1.2) preferences.push("Loves sunny weather");
        if (weatherBonus.cloudy > 1.2)
            preferences.push("Thrives in cloudy weather");
        if (weatherBonus.rainy > 1.2) preferences.push("Enjoys rainy weather");

        if (preferences.length === 0) {
            if (weatherBonus.sunny < 0.8) preferences.push("Prefers shade");
            if (weatherBonus.cloudy < 0.8) preferences.push("Needs more sun");
            if (weatherBonus.rainy < 0.8) preferences.push("Drought tolerant");
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

        const plantNameLower = plantName.toLowerCase();
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
                                <Image
                                    source={getPlantImage(
                                        plantName,
                                        currentStage
                                    )}
                                    style={styles.plantImage}
                                    resizeMode="contain"
                                />
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
                        </View>
                        {/* END TOP SECTION */}
                        {/* Plant Image */}

                        {/* Plant Stats */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Plant Stats</Text>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>
                                    Current Stage:
                                </Text>
                                <Text style={styles.statValue}>
                                    {getStageDescription(currentStage)}
                                </Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Planted:</Text>
                                <Text style={styles.statValue}>
                                    {DateTime.fromISO(
                                        plant.planted_at
                                    ).toFormat("MMM dd, yyyy")}
                                </Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>
                                    Time Since Planted:
                                </Text>
                                <Text style={styles.statValue}>
                                    {formattedTimeSincePlanted}
                                </Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>
                                    Time to Maturity:
                                </Text>
                                <Text style={styles.statValue}>
                                    {formattedTimeToMaturity}
                                </Text>
                            </View>
                        </View>

                        {/* Weather Preferences */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                Weather Preferences
                            </Text>
                            <Text style={styles.weatherDescription}>
                                {getWeatherPreference()}
                            </Text>

                            <View style={styles.weatherStats}>
                                <View style={styles.weatherStat}>
                                    <Text style={styles.weatherLabel}>
                                        Sunny
                                    </Text>
                                    <Text style={styles.weatherValue}>
                                        {(weatherBonus.sunny * 100).toFixed(0)}%
                                    </Text>
                                </View>
                                <View style={styles.weatherStat}>
                                    <Text style={styles.weatherLabel}>
                                        Cloudy
                                    </Text>
                                    <Text style={styles.weatherValue}>
                                        {(weatherBonus.cloudy * 100).toFixed(0)}
                                        %
                                    </Text>
                                </View>
                                <View style={styles.weatherStat}>
                                    <Text style={styles.weatherLabel}>
                                        Rainy
                                    </Text>
                                    <Text style={styles.weatherValue}>
                                        {(weatherBonus.rainy * 100).toFixed(0)}%
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Growth Info */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                Growth Information
                            </Text>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>
                                    Base Growth Time:
                                </Text>
                                <Text style={styles.statValue}>
                                    {growthTimeHours} hours
                                </Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>
                                    Growth Progress:
                                </Text>
                                <Text style={styles.statValue}>
                                    {growthCalculation.progress}%
                                </Text>
                            </View>
                        </View>

                        {/* Planter Info */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                Planting Information
                            </Text>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>
                                    Planted by:
                                </Text>
                                <Text style={styles.statValue}>Friend</Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Plant ID:</Text>
                                <Text style={styles.statValue}>{plant.id}</Text>
                            </View>
                        </View>
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
        marginTop: 10,
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
        marginBottom: 16,
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
    imageContainer: {
        alignItems: "center",
        padding: 20,
    },
    plantImage: {
        width: 120,
        height: 120,
    },
    section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 12,
    },
    statRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 16,
        color: "#666",
    },
    statValue: {
        fontSize: 16,
        color: "#333",
        fontWeight: "500",
    },
    weatherDescription: {
        fontSize: 16,
        color: "#333",
        marginBottom: 12,
        fontStyle: "italic",
    },
    weatherStats: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    weatherStat: {
        alignItems: "center",
    },
    weatherLabel: {
        fontSize: 14,
        color: "#666",
        marginBottom: 4,
    },
    weatherValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
});

export default PlantDetailsModal;
