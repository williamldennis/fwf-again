import React from "react";
import { View, TouchableOpacity, Image, Text, Alert } from "react-native";
import { GardenAreaProps, GrowthStage } from "../types/garden";

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

const emptyPotImg = require("../../assets/images/plants/empty_pot.png");
const dirtImg = require("../../assets/images/plants/dirt.png");

const SLOT_COUNT = 3;

export const GardenArea: React.FC<GardenAreaProps> = (props) => {
    console.log("GardenArea rendered", props);
    const {
        gardenOwnerId,
        plants,
        weatherCondition,
        onPlantPress,
        isGardenFull,
        onPlantPress: onPlantPressOriginal, // Keep original for empty slots
        onPlantDetailsPress, // New callback for plant details
    } = props;

    // Fill up to 3 slots with either a plant or null (for empty)
    const slots = Array(SLOT_COUNT)
        .fill(null)
        .map((_, i) => plants[i] || null);

    // Handler for empty slot tap
    const handleEmptySlotPress = () => {
        if (isGardenFull) {
            Alert.alert("Garden is full", "Check back tomorrow.");
        } else {
            onPlantPressOriginal();
        }
    };

    // Handler for planted plant tap
    const handlePlantPress = (plant: any) => {
        if (onPlantDetailsPress) {
            onPlantDetailsPress(plant);
        }
    };

    const getImageForPlant = (plantName: string, stage: GrowthStage) => {
        if (stage === 1) return emptyPotImg;
        if (stage === 2) return dirtImg;
        const plantKey = plantName.toLowerCase();
        return plantStageImages[plantKey]?.[stage] || emptyPotImg;
    };

    return (
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
                borderRadius: 8,
                height: 60,
                padding: 0,
                marginTop: 20,
                marginBottom: 0,
            }}
        >
            {slots.map((plant, idx) => {
                if (!plant) {
                    // Empty slot
                    return (
                        <TouchableOpacity
                            key={`empty-${idx}`}
                            onPress={handleEmptySlotPress}
                            style={{
                                flex: 1,
                                alignItems: "center",
                            }}
                        >
                            <Image
                                source={emptyPotImg}
                                style={{ width: 90, height: 90 }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    );
                }

                // Show plant at its current stage (now tappable)
                const stage = plant.current_stage as GrowthStage;
                // Handle both joined data structure and flat structure
                const plantName =
                    plant.plant?.name || plant.plant_name || "Unknown";

                return (
                    <TouchableOpacity
                        key={plant.id || `plant-${idx}`}
                        onPress={() => handlePlantPress(plant)}
                        style={{ flex: 1, alignItems: "center" }}
                    >
                        <Image
                            source={getImageForPlant(plantName, stage)}
                            style={{ width: 90, height: 90 }}
                            resizeMode="contain"
                        />
                        <Text
                            style={{
                                fontSize: 10,
                                color: "#333",
                                marginTop: 2,
                            }}
                        >
                            {plantName}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default GardenArea;
