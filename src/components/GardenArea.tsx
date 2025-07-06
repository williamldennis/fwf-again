import React, { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, Text, Alert } from "react-native";
import { Image } from "expo-image";
import { GardenAreaProps, GrowthStage } from "../types/garden";
import { GrowthService } from "../services/growthService";
import DirtParticles from "./DirtParticles";

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
    const {
        gardenOwnerId,
        plants,
        weatherCondition,
        onPlantPress,
        isGardenFull,
        onPlantDetailsPress, // New callback for plant details
    } = props;

    // State for dirt particle animation
    const [showParticles, setShowParticles] = useState(false);
    const [particlePosition, setParticlePosition] = useState({ x: 0, y: 0 });
    const [containerWidth, setContainerWidth] = useState(300); // Default width
    const previousPlantsRef = useRef<any[]>([]);
    const containerRef = useRef<View>(null);

    // Track when new plants are added and trigger animation
    useEffect(() => {
        const currentPlantCount = plants?.length || 0;
        const previousPlantCount = previousPlantsRef.current.length;

        // If we have more plants than before, a new plant was added
        if (currentPlantCount > previousPlantCount) {
            // Find the new plant (it will be the one without a slot in previous plants)
            const newPlant = plants?.find(
                (plant) =>
                    !previousPlantsRef.current.some(
                        (prevPlant) => prevPlant.id === plant.id
                    )
            );

            if (newPlant && typeof newPlant.slot === "number") {
                // Wait for container width to be measured before triggering animation
                const triggerAnimation = () => {
                    const slotIndex = newPlant.slot;

                    // Debug: Log the actual container width and slot calculations
                    console.log(
                        `[Particles] Debug - Container width: ${containerWidth}, Slot index: ${slotIndex}`
                    );

                    // Use a fallback width if container hasn't been measured yet
                    const effectiveWidth =
                        containerWidth > 0 ? containerWidth : 300;
                    console.log(
                        `[Particles] Using effective width: ${effectiveWidth}`
                    );

                    // Calculate pot position based on the actual layout
                    // Container uses space-between with flex: 1 for each slot
                    // Each slot takes up 1/3 of the container width
                    const slotWidth = effectiveWidth / 3;

                    // Calculate the center of each slot
                    // Slot 0: 0 to slotWidth (center at slotWidth/2)
                    // Slot 1: slotWidth to 2*slotWidth (center at slotWidth + slotWidth/2)
                    // Slot 2: 2*slotWidth to 3*slotWidth (center at 2*slotWidth + slotWidth/2)
                    const potX = slotIndex * slotWidth + slotWidth / 2;
                    const potY = -45; // Raise particles up by 100px from center of pot (45 - 100 = -55)

                    setParticlePosition({ x: potX, y: potY });
                    console.log(
                        `[Particles] Setting position for slot ${slotIndex}: x=${potX}, y=${potY} (containerWidth=${containerWidth}, slotWidth=${slotWidth})`
                    );
                    console.log(
                        `[Particles] Slot ${slotIndex} range: ${slotIndex * slotWidth} to ${(slotIndex + 1) * slotWidth}, center at ${potX}`
                    );

                    // Trigger animation with a small delay
                    setTimeout(() => {
                        console.log(
                            `[GardenArea ${gardenOwnerId}] Triggering particles for slot ${slotIndex} at position ${potX},${potY}`
                        );
                        setShowParticles(true);
                    }, 500);
                };

                // If container width is already measured, trigger immediately
                if (containerWidth > 0) {
                    triggerAnimation();
                } else {
                    // Wait for container width to be measured, then trigger
                    const checkWidth = () => {
                        if (containerWidth > 0) {
                            triggerAnimation();
                        } else {
                            // Check again in 50ms
                            setTimeout(checkWidth, 50);
                        }
                    };
                    checkWidth();
                }
            }
        }

        // Update previous plants reference
        previousPlantsRef.current = plants || [];
    }, [plants, containerWidth]);

    const handleParticleAnimationComplete = () => {
        setShowParticles(false);
    };

    // Measure container width when layout changes
    const handleLayout = (event: any) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
        console.log(`[Particles] Container width measured: ${width}`);
    };

    // Map plants by slot for consistent rendering
    const slotMap: Record<number, any> = {};
    (plants || []).forEach((plant) => {
        if (typeof plant.slot === "number") {
            slotMap[plant.slot] = plant;
        }
    });

    // Fill up to 3 slots with either a plant or null (for empty)
    const slots = Array(SLOT_COUNT)
        .fill(null)
        .map((_, i) => slotMap[i] || null);

    // Handler for empty slot tap
    const handleEmptySlotPress = (slotIdx: number) => {
        if (isGardenFull) {
            // No log needed here
        } else {
            onPlantPress(slotIdx);
        }
    };

    // Handler for planted plant tap
    const handlePlantPress = (plant: any) => {
        if (onPlantDetailsPress) {
            onPlantDetailsPress(plant, weatherCondition);
        }
    };

    const getImageForPlant = (plantName: string, stage: GrowthStage) => {
        if (stage === 2) return dirtImg;
        // Convert plant name to match the image mapping keys
        const plantKey = plantName.toLowerCase().replace(/\s+/g, "_");
        return plantStageImages[plantKey]?.[stage] || dirtImg;
    };

    return (
        <View
            ref={containerRef}
            onLayout={handleLayout}
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
                borderRadius: 8,
                height: 60,
                padding: 0,
                marginTop: 20,
                marginBottom: 0,
                position: "relative",
            }}
        >
            {/* Dirt Particles Animation */}
            <DirtParticles
                key={`particles-${gardenOwnerId}-${particlePosition.x}-${particlePosition.y}`}
                visible={showParticles}
                potPosition={particlePosition}
                onAnimationComplete={handleParticleAnimationComplete}
            />
            {slots.map((plant, idx) => {
                if (!plant) {
                    // Empty slot
                    return (
                        <TouchableOpacity
                            key={`empty-${idx}`}
                            onPress={() => handleEmptySlotPress(idx)}
                            style={{
                                flex: 1,
                                alignItems: "center",
                            }}
                        >
                            <Image
                                source={emptyPotImg}
                                style={{ width: 90, height: 90 }}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                            />
                            <Text
                                style={{
                                    fontSize: 10,
                                    color: "green",
                                    marginBottom: 20,
                                    marginTop: 10,
                                    fontWeight: "bold",
                                    padding: 6,
                                    paddingHorizontal: 12,
                                    borderRadius: 10,
                                }}
                            >
                                Tap to plant
                            </Text>
                        </TouchableOpacity>
                    );
                }

                // Calculate the current stage based on growth progress
                const plantName =
                    plant.plant?.name || plant.plant_name || "Unknown";
                const plantObject = plant.plant || {
                    id: plant.plant_id,
                    name: plantName,
                    growth_time_hours: plant.growth_time_hours || 0,
                    weather_bonus: plant.weather_bonus || {
                        sunny: 1,
                        cloudy: 1,
                        rainy: 1,
                    },
                    image_path: plant.image_path || "",
                    created_at: plant.planted_at,
                };

                // Use GrowthService to calculate the actual current stage
                const growthCalculation = GrowthService.calculateGrowthStage(
                    plant,
                    plantObject,
                    weatherCondition
                );
                const stage = growthCalculation.stage as GrowthStage;

                return (
                    <TouchableOpacity
                        key={plant.id || `plant-${idx}`}
                        onPress={() => handlePlantPress(plant)}
                        style={{ flex: 1, alignItems: "center" }}
                    >
                        <Image
                            source={getImageForPlant(plantName, stage)}
                            style={{ width: 90, height: 90 }}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                        />
                        <Text
                            style={{
                                fontSize: 10,
                                color: "#333",
                                marginBottom: 20,
                                marginTop: 10,
                                fontWeight: "bold",
                                padding: 6,
                                paddingHorizontal: 12,
                                borderRadius: 10,
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
