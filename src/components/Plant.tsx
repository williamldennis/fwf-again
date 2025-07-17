import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { PlantProps, GrowthStage } from "../types/garden";

// Helper to get the correct image for a plant stage
const getPlantImage = (plantName: string, stage: GrowthStage) => {
    const plantNameLower = plantName.toLowerCase();
    switch (stage) {
        case 1:
            return require("../../assets/images/plants/empty_pot.png");
        case 2:
            return require("../../assets/images/plants/dirt.png");
        case 3:
            return require(
                `../../assets/images/plants/${plantNameLower}/sprout.png`
            );
        case 4:
            return require(
                `../../assets/images/plants/${plantNameLower}/adolescent.png`
            );
        case 5:
            return require(
                `../../assets/images/plants/${plantNameLower}/mature.png`
            );
        default:
            return require("../../assets/images/plants/empty_pot.png");
    }
};

export const Plant: React.FC<PlantProps> = ({ plant, weatherCondition }) => {
    const stage = plant.current_stage as GrowthStage;
    return (
        <View style={{ alignItems: "center" }}>
            <Image
                source={getPlantImage(plant.plant_name, stage)}
                style={{ width: 90, height: 90 }}
                cachePolicy="memory-disk"
                priority="high"
                transition={200}
            />
            <Text style={{ fontSize: 10, color: "#333", marginTop: 20 }}>
                {plant.plant_name}
            </Text>
        </View>
    );
};

export default Plant;
