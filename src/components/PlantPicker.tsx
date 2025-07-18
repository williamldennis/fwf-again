import React from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Plant, PlantPickerProps } from "../types/garden";
import { GrowthService } from "../services/growthService";

// Helper function to get plant image source
const getPlantImageSource = (imagePath: string) => {
    const plantImages: Record<string, any> = {
        sunflower: require("../../assets/images/plants/sunflower/mature.png"),
        mushroom: require("../../assets/images/plants/mushroom/mature.png"),
        fern: require("../../assets/images/plants/fern/mature.png"),
        cactus: require("../../assets/images/plants/cactus/mature.png"),
        water_lily: require("../../assets/images/plants/water_lily/mature.png"),
        pine_tree: require("../../assets/images/plants/pine_tree/mature.png"),
    };

    const normalizedPath = imagePath.toLowerCase();
    return plantImages[normalizedPath] || plantImages.sunflower; // fallback to sunflower
};

interface PlantPickerFullProps extends PlantPickerProps {
    plants: Plant[];
    loading?: boolean;
    userPoints?: number;
}

export const PlantPicker: React.FC<PlantPickerFullProps> = ({
    visible,
    onClose,
    onSelectPlant,
    weatherCondition,
    plants,
    loading = false,
    userPoints = 0,
}) => {
    // Haptic feedback when selecting a plant
    const handlePlantSelection = async (plantId: string) => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (error) {
            console.log("[Haptics] Could not trigger haptic feedback:", error);
        }
        onSelectPlant(plantId);
    };

    // Check if user can afford a plant
    const canAffordPlant = (plant: Plant) => {
        return userPoints >= (plant.planting_cost || 0);
    };
    // Preload images when component mounts
    React.useEffect(() => {
        plants.forEach((plant) => {
            const imageSource = getPlantImageSource(plant.image_path);
        });
    }, [plants]);

    // Debug: Check if images are preloaded
    React.useEffect(() => {
        if (visible) {
            // No logging needed here
        }
    }, [visible, plants]);
    return (
        <>
            {/* Hidden preload images */}
            {plants.map((plant) => (
                <Image
                    key={`preload-${plant.id}`}
                    source={getPlantImageSource(plant.image_path)}
                    style={{
                        width: 1,
                        height: 1,
                        opacity: 0,
                        position: "absolute",
                    }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    priority="high"
                    transition={200}
                />
            ))}
            <Modal
                visible={visible}
                animationType="slide"
                transparent
                onRequestClose={onClose}
            >
                <View style={styles.overlay}>
                    <View style={styles.container}>
                        <Text style={styles.title}>Choose a Plant</Text>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <Text style={styles.loadingText}>
                                    Loading plants...
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={plants.sort(
                                    (a, b) =>
                                        (a.planting_cost || 0) -
                                        (b.planting_cost || 0)
                                )}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.plantRow,
                                            !canAffordPlant(item) &&
                                                styles.disabledPlantRow,
                                        ]}
                                        onPress={() =>
                                            canAffordPlant(item) &&
                                            handlePlantSelection(item.id)
                                        }
                                        disabled={!canAffordPlant(item)}
                                    >
                                        <Image
                                            source={getPlantImageSource(
                                                item.image_path
                                            )}
                                            style={styles.plantImage}
                                            contentFit="contain"
                                            cachePolicy="memory-disk"
                                            priority="high"
                                            placeholder={require("../../assets/images/plants/empty_pot.png")}
                                            transition={200}
                                        />
                                        <View
                                            style={{ flex: 1, marginLeft: 12 }}
                                        >
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    justifyContent:
                                                        "space-between",
                                                }}
                                            >
                                                <Text style={styles.plantName}>
                                                    {item.name}
                                                </Text>
                                                <View
                                                    style={{
                                                        alignItems: "flex-end",
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.pointsText,
                                                            !canAffordPlant(
                                                                item
                                                            ) &&
                                                                styles.insufficientPointsText,
                                                        ]}
                                                    >
                                                        {(item.planting_cost ||
                                                            0) === 0
                                                            ? "Free"
                                                            : `${item.planting_cost || 0} pts`}
                                                    </Text>
                                                    <Text
                                                        style={
                                                            styles.profitText
                                                        }
                                                    >
                                                        +
                                                        {(item.harvest_points ||
                                                            0) -
                                                            (item.planting_cost ||
                                                                0)}{" "}
                                                        profit
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.plantDesc}>
                                                {GrowthService.getWeatherPreferenceDescription(
                                                    item
                                                )}
                                            </Text>
                                            <Text style={styles.plantDesc}>
                                                {GrowthService.getGrowthTimeDescription(
                                                    item.growth_time_hours
                                                )}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ItemSeparatorComponent={() => (
                                    <View style={{ height: 12 }} />
                                )}
                            />
                        )}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    container: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        width: "90%",
        maxHeight: "80%",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 16,
        textAlign: "center",
    },
    plantRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f7f7f7",
        borderRadius: 10,
        padding: 10,
    },
    disabledPlantRow: {
        opacity: 0.5,
        backgroundColor: "#e0e0e0",
    },
    plantImage: {
        width: 48,
        height: 48,
    },
    plantName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#222",
    },
    pointsText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#007AFF",
    },
    insufficientPointsText: {
        color: "#FF3B30",
    },
    profitText: {
        fontSize: 12,
        color: "#34C759",
        fontWeight: "500",
    },
    plantDesc: {
        fontSize: 13,
        color: "#666",
        marginTop: 2,
    },
    closeButton: {
        marginTop: 18,
        alignSelf: "center",
        backgroundColor: "#eee",
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 24,
    },
    closeButtonText: {
        fontSize: 16,
        color: "#333",
        fontWeight: "bold",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    loadingText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
    },
});

export default PlantPicker;
