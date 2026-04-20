import { pb } from "../utils/pocketbase";
import { GrowthService } from "./growthService";

export class GardenService {
    static async fetchAvailablePlants() {
        const plants = await pb.collection("plants").getFullList({
            sort: "name",
        });
        return plants || [];
    }

    static async fetchPlantedPlants(friendId: string) {
        const plants = await pb.collection("planted_plants").getFullList({
            filter: `garden_owner = "${friendId}" && harvested_at = null`,
            expand: "plant",
            sort: "-planted_at",
        });
        return plants || [];
    }

    static async fetchAllPlantedPlantsBatch(userIds: string[]) {
        if (userIds.length === 0) return {};

        // Build filter for multiple user IDs
        const idFilters = userIds.map(id => `garden_owner = "${id}"`).join(' || ');
        const filter = `(${idFilters}) && harvested_at = null`;

        const allPlants = await pb.collection("planted_plants").getFullList({
            filter,
            expand: "plant",
            sort: "-planted_at",
        });

        const plantsByUser: Record<string, any[]> = {};
        allPlants?.forEach((plant) => {
            const gardenOwnerId = plant.garden_owner;
            if (!plantsByUser[gardenOwnerId]) plantsByUser[gardenOwnerId] = [];
            plantsByUser[gardenOwnerId].push(plant);
        });
        return plantsByUser;
    }

    static async updatePlantGrowth() {
        // Get all planted plants that aren't mature
        const allPlantedPlants = await pb.collection("planted_plants").getFullList({
            filter: "is_mature = false",
            expand: "plant",
        });

        if (!allPlantedPlants || allPlantedPlants.length === 0) return;

        // Group plants by garden owner
        const plantsByGarden = new Map<string, any[]>();
        allPlantedPlants.forEach((plant) => {
            const gardenOwnerId = plant.garden_owner;
            if (!plantsByGarden.has(gardenOwnerId)) {
                plantsByGarden.set(gardenOwnerId, []);
            }
            plantsByGarden.get(gardenOwnerId)!.push(plant);
        });

        // Update each garden's plants
        for (const [gardenOwnerId, plants] of plantsByGarden) {
            // Get the garden owner's current weather
            let weatherCondition = "clear";
            try {
                const gardenOwner = await pb.collection("users").getOne(gardenOwnerId);
                weatherCondition = gardenOwner?.weather_condition || "clear";
            } catch (error) {
                console.error(`[GardenService] Error fetching garden owner ${gardenOwnerId}:`, error);
            }

            for (const plantedPlant of plants) {
                const plant = plantedPlant.expand?.plant;
                if (!plant) continue;

                const growthCalculation = GrowthService.calculateGrowthStage(
                    plantedPlant,
                    plant,
                    weatherCondition
                );

                const isMature =
                    growthCalculation.stage === 5 &&
                    growthCalculation.progress >= 100;

                if (isMature !== plantedPlant.is_mature) {
                    await pb.collection("planted_plants").update(plantedPlant.id, {
                        is_mature: isMature
                    });
                }
            }
        }
    }

    static async plantSeed({ friendId, slotIdx, plantId, userId, availablePlants }: {
        friendId: string;
        slotIdx: number;
        plantId: string;
        userId: string;
        availablePlants: any[];
    }) {
        // Check if slot is already occupied
        const slotPlants = await pb.collection("planted_plants").getFullList({
            filter: `garden_owner = "${friendId}" && slot = ${slotIdx} && harvested_at = null`,
        });

        if (slotPlants && slotPlants.length > 0) {
            throw new Error("Slot Occupied");
        }

        // Plant the seed
        const plantedPlant = await pb.collection("planted_plants").create({
            garden_owner: friendId,
            planter: userId,
            plant: plantId,
            current_stage: 2,
            is_mature: false,
            slot: slotIdx,
        });

        // Return in PocketBase expand structure format
        const newPlant = {
            ...plantedPlant,
            expand: {
                plant: availablePlants.find((p: any) => p.id === plantId),
            },
        };

        return newPlant;
    }

    static async refreshUserPoints(userId: string) {
        try {
            const profile = await pb.collection("users").getOne(userId);
            return profile?.points || 0;
        } catch (error) {
            console.error("[GardenService] Error fetching user points:", error);
            return 0;
        }
    }
}
