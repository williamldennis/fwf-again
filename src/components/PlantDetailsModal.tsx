import React from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    ScrollView,
} from "react-native";
// @ts-ignore
import { DateTime } from "luxon";

interface PlantDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    plant: any; // The planted plant data with joined plant info
}

export const PlantDetailsModal: React.FC<PlantDetailsModalProps> = ({
    visible,
    onClose,
    plant,
}) => {
    if (!plant) return null;

    const plantName = plant.plant?.name || plant.plant_name || "Unknown";
    const weatherBonus =
        plant.plant?.weather_bonus || plant.weather_bonus || {};
    const growthTimeHours =
        plant.plant?.growth_time_hours || plant.growth_time_hours || 0;

    // Calculate time since planted
    const plantedAt = DateTime.fromISO(plant.planted_at);
    const now = DateTime.now();
    const timeSincePlanted = now.diff(plantedAt, ["hours", "minutes"]);

    // Calculate time to maturity (rough estimate)
    const timeToMaturity = Math.max(
        0,
        growthTimeHours - timeSincePlanted.hours
    );

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
        if (stage === 1)
            return require("../../assets/images/plants/empty_pot.png");
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
            require("../../assets/images/plants/empty_pot.png")
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
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>{plantName}</Text>
                            <TouchableOpacity
                                onPress={onClose}
                                style={styles.closeButton}
                            >
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Plant Image */}
                        <View style={styles.imageContainer}>
                            <Image
                                source={getPlantImage(
                                    plantName,
                                    plant.current_stage
                                )}
                                style={styles.plantImage}
                                resizeMode="contain"
                            />
                        </View>

                        {/* Plant Stats */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Plant Stats</Text>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>
                                    Current Stage:
                                </Text>
                                <Text style={styles.statValue}>
                                    {getStageDescription(plant.current_stage)}
                                </Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Planted:</Text>
                                <Text style={styles.statValue}>
                                    {plantedAt.toFormat("MMM dd, yyyy")}
                                </Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>
                                    Time Since Planted:
                                </Text>
                                <Text style={styles.statValue}>
                                    {timeSincePlanted.hours > 24
                                        ? `${Math.floor(timeSincePlanted.hours / 24)} days`
                                        : `${Math.floor(timeSincePlanted.hours)} hours`}
                                </Text>
                            </View>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>
                                    Time to Maturity:
                                </Text>
                                <Text style={styles.statValue}>
                                    {timeToMaturity > 0
                                        ? `${Math.floor(timeToMaturity)} hours`
                                        : "Ready to harvest!"}
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
                                    {Math.min(
                                        100,
                                        Math.floor(
                                            (timeSincePlanted.hours /
                                                growthTimeHours) *
                                                100
                                        )
                                    )}
                                    %
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
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButtonText: {
        fontSize: 18,
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
