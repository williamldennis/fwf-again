/**
 * Widget Service
 * Handles updating iOS home screen and lock screen widgets with weather and plant data
 */

import { Platform } from "react-native";
import { GrowthService } from "./growthService";

// Types for widget data
export interface WidgetPlant {
    id: string;
    name: string;
    emoji: string;
    growthPercent: number;
    stage: number;
    isReady: boolean;
    minutesUntilReady?: number;
}

export interface WidgetData {
    temperature: number;
    weatherCondition: string;
    weatherEmoji: string;
    cityName: string;
    plants: WidgetPlant[];
    totalPlants: number;
    plantsReady: number;
}

// Import the widget - this will be available after the widget is set up
let WeatherWidget: any = null;
let widgetInitialized = false;

// Lazy load the widget to avoid errors on Android or when not configured
const getWidget = async () => {
    if (Platform.OS !== "ios") {
        return null;
    }

    if (!WeatherWidget) {
        try {
            // Dynamic import to avoid crashes if widget isn't configured yet
            const widgetModule = await import("../../widgets/WeatherWidget");
            WeatherWidget = widgetModule.default;
        } catch (error) {
            console.log("[Widget] Widget not available yet:", error);
            return null;
        }
    }
    return WeatherWidget;
};

/**
 * Initialize the widget early in app lifecycle
 * This ensures the widget layout is registered even before we have data
 * Call this from _layout.tsx or app entry point
 */
export const initializeWidget = async (): Promise<void> => {
    if (widgetInitialized || Platform.OS !== "ios") {
        return;
    }

    try {
        const widget = await getWidget();
        if (widget) {
            // Send initial snapshot with default values
            // This ensures the widget has something to show immediately
            await widget.updateSnapshot({
                temperature: 72,
                weatherCondition: "Loading...",
                weatherEmoji: "☀️",
                cityName: "Open app to update",
                plants: [],
                totalPlants: 0,
                plantsReady: 0,
            });
            widgetInitialized = true;
            console.log("[Widget] Widget initialized with default data");
        }
    } catch (error) {
        console.log("[Widget] Failed to initialize widget:", error);
    }
};

/**
 * Get weather emoji from condition string
 */
export const getWeatherEmoji = (condition: string): string => {
    const conditionLower = (condition || "").toLowerCase();
    if (conditionLower.includes("sun") || conditionLower.includes("clear")) return "☀️";
    if (conditionLower.includes("cloud")) return "☁️";
    if (conditionLower.includes("rain") || conditionLower.includes("drizzle")) return "🌧️";
    if (conditionLower.includes("storm") || conditionLower.includes("thunder")) return "⛈️";
    if (conditionLower.includes("snow")) return "❄️";
    if (conditionLower.includes("fog") || conditionLower.includes("mist")) return "🌫️";
    return "🌤️";
};

/**
 * Get plant emoji based on name
 */
export const getPlantEmoji = (name: string): string => {
    const nameLower = (name || "").toLowerCase();
    if (nameLower.includes("sunflower")) return "🌻";
    if (nameLower.includes("mushroom")) return "🍄";
    if (nameLower.includes("fern")) return "🌿";
    if (nameLower.includes("cactus")) return "🌵";
    if (nameLower.includes("lily") || nameLower.includes("water")) return "🪷";
    if (nameLower.includes("pine") || nameLower.includes("tree")) return "🌲";
    return "🌱";
};

/**
 * Calculate plant growth data for widget display
 */
export const calculatePlantGrowth = (
    plant: any,
    weatherCondition: string
): WidgetPlant => {
    // Get expanded plant data (PocketBase structure)
    const expandedPlant = plant.expand?.plant || plant.plant;
    const plantName = expandedPlant?.name || plant.plant_name || "Unknown";

    // Build plant object for growth calculation
    const plantObject = expandedPlant || {
        id: plant.plant_id,
        name: plantName,
        growth_time_hours: plant.growth_time_hours || 24,
        weather_bonus: plant.weather_bonus || { sunny: 1, cloudy: 1, rainy: 1 },
    };

    // Calculate growth using GrowthService
    const growthCalculation = GrowthService.calculateGrowthStage(
        plant,
        plantObject,
        weatherCondition
    );

    const isReady = growthCalculation.stage >= 5 || plant.is_mature;
    const growthPercent = isReady ? 100 : Math.round(growthCalculation.progress);

    // Calculate minutes until ready (rough estimate)
    let minutesUntilReady: number | undefined;
    if (!isReady && plantObject.growth_time_hours) {
        const remainingPercent = 100 - growthPercent;
        const totalMinutes = plantObject.growth_time_hours * 60;
        minutesUntilReady = Math.round((remainingPercent / 100) * totalMinutes);
    }

    return {
        id: plant.id,
        name: plantName,
        emoji: getPlantEmoji(plantName),
        growthPercent,
        stage: growthCalculation.stage,
        isReady,
        minutesUntilReady,
    };
};

/**
 * Calculate plants ready from user plants array
 */
export const calculatePlantsReady = (
    plants: any[],
    weatherCondition: string = "sunny"
): { ready: number; total: number; plantData: WidgetPlant[] } => {
    if (!plants || plants.length === 0) {
        return { ready: 0, total: 0, plantData: [] };
    }

    const plantData = plants.map(plant => calculatePlantGrowth(plant, weatherCondition));
    const ready = plantData.filter(p => p.isReady).length;

    return { ready, total: plants.length, plantData };
};

/**
 * Update the widget with new data
 */
export const updateWidget = async (data: Partial<WidgetData>): Promise<void> => {
    try {
        const widget = await getWidget();
        if (!widget) {
            console.log("[Widget] Skipping update - widget not available");
            return;
        }

        const widgetData: WidgetData = {
            temperature: data.temperature ?? 72,
            weatherCondition: data.weatherCondition ?? "Unknown",
            weatherEmoji: data.weatherEmoji ?? getWeatherEmoji(data.weatherCondition || ""),
            cityName: data.cityName ?? "Your Location",
            plants: data.plants ?? [],
            totalPlants: data.totalPlants ?? 0,
            plantsReady: data.plantsReady ?? 0,
        };

        console.log("[Widget] Updating widget with data:", {
            temp: widgetData.temperature,
            plants: widgetData.plants.length,
            ready: widgetData.plantsReady,
        });

        // Update the widget snapshot immediately
        await widget.updateSnapshot(widgetData);

        console.log("[Widget] Widget updated successfully");
    } catch (error) {
        console.warn("[Widget] Failed to update widget:", error);
    }
};

/**
 * Generate timeline entries for plant growth updates
 * This allows the widget to show growth progression even without the app running
 */
export const generateGrowthTimeline = (
    baseData: WidgetData,
    plants: any[],
    weatherCondition: string,
    hoursAhead: number = 12
): Array<{ date: Date; props: WidgetData }> => {
    const timeline: Array<{ date: Date; props: WidgetData }> = [];
    const now = new Date();

    // Add current state
    timeline.push({ date: now, props: baseData });

    // Generate updates every 30 minutes for the next N hours
    const intervalsCount = hoursAhead * 2; // Every 30 minutes

    for (let i = 1; i <= intervalsCount; i++) {
        const futureDate = new Date(now.getTime() + i * 30 * 60 * 1000);

        // Simulate plant growth at this future time
        const futurePlantData = plants.map(plant => {
            const expandedPlant = plant.expand?.plant || plant.plant;
            const plantName = expandedPlant?.name || plant.plant_name || "Unknown";
            const growthTimeHours = expandedPlant?.growth_time_hours || 24;

            // Calculate how much time has passed since planting
            const plantedAt = new Date(plant.planted_at || plant.created);
            const elapsedMs = futureDate.getTime() - plantedAt.getTime();
            const elapsedHours = elapsedMs / (1000 * 60 * 60);

            // Simple growth calculation (without weather bonus for simplicity)
            const rawProgress = (elapsedHours / growthTimeHours) * 100;
            const growthPercent = Math.min(100, Math.round(rawProgress));
            const isReady = growthPercent >= 100;

            // Determine stage (1-5 based on progress)
            let stage = 1;
            if (growthPercent >= 100) stage = 5;
            else if (growthPercent >= 75) stage = 4;
            else if (growthPercent >= 50) stage = 3;
            else if (growthPercent >= 25) stage = 2;

            return {
                id: plant.id,
                name: plantName,
                emoji: getPlantEmoji(plantName),
                growthPercent,
                stage,
                isReady,
            };
        });

        const plantsReady = futurePlantData.filter(p => p.isReady).length;

        timeline.push({
            date: futureDate,
            props: {
                ...baseData,
                plants: futurePlantData,
                plantsReady,
            },
        });
    }

    return timeline;
};

/**
 * Update widget with timeline for scheduled growth updates
 */
export const updateWidgetWithGrowthTimeline = async (
    weatherData: { temperature: number; condition: string; cityName: string },
    plants: any[],
    weatherCondition: string
): Promise<void> => {
    try {
        const widget = await getWidget();
        if (!widget) {
            console.log("[Widget] Skipping timeline update - widget not available");
            return;
        }

        // Calculate current plant data
        const { ready, total, plantData } = calculatePlantsReady(plants, weatherCondition);

        const baseData: WidgetData = {
            temperature: weatherData.temperature,
            weatherCondition: weatherData.condition,
            weatherEmoji: getWeatherEmoji(weatherData.condition),
            cityName: weatherData.cityName,
            plants: plantData,
            totalPlants: total,
            plantsReady: ready,
        };

        // Generate timeline for next 12 hours
        const timeline = generateGrowthTimeline(baseData, plants, weatherCondition, 12);

        console.log("[Widget] Updating widget with", timeline.length, "timeline entries");
        await widget.updateTimeline(timeline);

        console.log("[Widget] Widget timeline updated successfully");
    } catch (error) {
        console.warn("[Widget] Failed to update widget timeline:", error);
    }
};

/**
 * Force reload all widgets
 */
export const reloadWidgets = async (): Promise<void> => {
    try {
        const widget = await getWidget();
        if (!widget) {
            return;
        }

        await widget.reload();
        console.log("[Widget] Widgets reloaded");
    } catch (error) {
        console.warn("[Widget] Failed to reload widgets:", error);
    }
};

export const WidgetService = {
    initializeWidget,
    updateWidget,
    updateWidgetWithGrowthTimeline,
    reloadWidgets,
    calculatePlantsReady,
    calculatePlantGrowth,
    generateGrowthTimeline,
    getWeatherEmoji,
    getPlantEmoji,
};

export default WidgetService;
