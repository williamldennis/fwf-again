import { supabase } from "../utils/supabase";
import { GrowthService } from "./growthService";

export class GardenService {
    static async fetchAvailablePlants() {
        const { data: plants, error } = await supabase
            .from("plants")
            .select("*")
            .order("name");
        if (error) throw error;
        return plants || [];
    }

    static async fetchPlantedPlants(friendId: string) {
        const { data: plants, error } = await supabase
            .from("planted_plants")
            .select(`*, plant:plants(*)`)
            .eq("garden_owner_id", friendId)
            .is("harvested_at", null)
            .order("planted_at", { ascending: false });
        if (error) throw error;
        return plants || [];
    }

    static async fetchAllPlantedPlantsBatch(userIds: string[]) {
        if (userIds.length === 0) return {};
        const { data: allPlants, error } = await supabase
            .from("planted_plants")
            .select(`*, plant:plants(*)`)
            .in("garden_owner_id", userIds)
            .is("harvested_at", null)
            .order("planted_at", { ascending: false });
        if (error) throw error;
        const plantsByUser: Record<string, any[]> = {};
        allPlants?.forEach((plant) => {
            const gardenOwnerId = plant.garden_owner_id;
            if (!plantsByUser[gardenOwnerId]) plantsByUser[gardenOwnerId] = [];
            plantsByUser[gardenOwnerId].push(plant);
        });
        return plantsByUser;
    }

    static async updatePlantGrowth() {
        // Get all planted plants that aren't mature
        const { data: allPlantedPlants, error } = await supabase
            .from("planted_plants")
            .select(`*, plant:plants(*)`)
            .eq("is_mature", false);
        if (error) throw error;
        if (!allPlantedPlants || allPlantedPlants.length === 0) return;
        // Group plants by garden owner
        const plantsByGarden = new Map<string, any[]>();
        allPlantedPlants.forEach((plant) => {
            const gardenOwnerId = plant.garden_owner_id;
            if (!plantsByGarden.has(gardenOwnerId)) {
                plantsByGarden.set(gardenOwnerId, []);
            }
            plantsByGarden.get(gardenOwnerId)!.push(plant);
        });
        // Update each garden's plants
        for (const [gardenOwnerId, plants] of plantsByGarden) {
            // Get the garden owner's current weather
            const { data: gardenOwner } = await supabase
                .from("profiles")
                .select("weather_condition")
                .eq("id", gardenOwnerId)
                .single();
            const weatherCondition = gardenOwner?.weather_condition || "clear";
            for (const plantedPlant of plants) {
                const plant = plantedPlant.plant;
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
                    await supabase
                        .from("planted_plants")
                        .update({ is_mature: isMature })
                        .eq("id", plantedPlant.id);
                }
            }
        }
    }

    static async plantSeed({ friendId, slotIdx, plantId, userId, availablePlants }: {
        friendId: string;
        slotIdx: number;
        plantId: string;
        userId: string;
        availablePlants: any[]; // Use Plant[] if imported
    }) {
        // Check if slot is already occupied
        const { data: slotPlants, error: slotError } = await supabase
            .from("planted_plants")
            .select("id")
            .eq("garden_owner_id", friendId)
            .eq("slot", slotIdx)
            .is("harvested_at", null);
        if (slotError) throw slotError;
        if (slotPlants && slotPlants.length > 0) {
            throw new Error("Slot Occupied");
        }
        // Plant the seed
        const { data: plantedPlant, error: plantError } = await supabase
            .from("planted_plants")
            .insert({
                garden_owner_id: friendId,
                planter_id: userId,
                plant_id: plantId,
                current_stage: 2,
                is_mature: false,
                slot: slotIdx,
            })
            .select()
            .single();
        if (plantError) throw plantError;
        const newPlant = {
            ...plantedPlant,
            plant: availablePlants.find((p: any) => p.id === plantId),
        };
        return newPlant;
    }

    static async refreshUserPoints(userId: string) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("points")
            .eq("id", userId)
            .single();
        return profile?.points || 0;
    }
} 