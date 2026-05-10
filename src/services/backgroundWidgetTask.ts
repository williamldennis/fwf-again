/**
 * Background Widget Task
 * Registers a background task to update widgets periodically
 *
 * Note: This module gracefully handles the case when native modules
 * aren't available (e.g., in Expo Go or simulator without dev build)
 */

import { Platform } from "react-native";

// These modules require native code and may not be available in all environments
let BackgroundFetch: typeof import("expo-background-fetch") | null = null;
let TaskManager: typeof import("expo-task-manager") | null = null;

// Track if native modules are available
let nativeModulesAvailable = false;

try {
    BackgroundFetch = require("expo-background-fetch");
    TaskManager = require("expo-task-manager");
    nativeModulesAvailable = true;
} catch (error) {
    console.log("[BackgroundTask] Native modules not available (expected in Expo Go/simulator)");
}

const WIDGET_UPDATE_TASK = "widget-update-task";

// Only define the task if native modules are available
if (nativeModulesAvailable && TaskManager && BackgroundFetch) {
    const { pb } = require("../utils/pocketbase");
    const { WeatherService, WeatherDataType } = require("./weatherService");
    const { WidgetService } = require("./widgetService");

    TaskManager.defineTask(WIDGET_UPDATE_TASK, async () => {
        try {
            console.log("[BackgroundTask] Widget update task started");

            // Only run on iOS
            if (Platform.OS !== "ios") {
                return BackgroundFetch!.BackgroundFetchResult.NoData;
            }

            // Check if user is authenticated
            if (!pb.authStore.isValid || !pb.authStore.model?.id) {
                console.log("[BackgroundTask] No authenticated user, skipping");
                return BackgroundFetch!.BackgroundFetchResult.NoData;
            }

            const userId = pb.authStore.model.id;

            // Get user profile for location
            const userProfile = await pb.collection("users").getOne(userId);
            if (!userProfile?.latitude || !userProfile?.longitude) {
                console.log("[BackgroundTask] No user location, skipping");
                return BackgroundFetch!.BackgroundFetchResult.NoData;
            }

            // Fetch weather data (uses cache if fresh)
            let weatherData;
            const cachedResponse = await WeatherService.getCachedWeatherData(
                userProfile.latitude,
                userProfile.longitude,
                WeatherDataType.Partial
            );

            if (cachedResponse.success && cachedResponse.data?.partialData) {
                weatherData = cachedResponse.data.partialData;
            } else {
                weatherData = await WeatherService.fetchWeatherData(
                    userProfile.latitude,
                    userProfile.longitude
                );
            }

            // Get user's plants
            const plants = await pb.collection("user_plants").getFullList({
                filter: `garden_owner = "${userId}"`,
                expand: "plant",
            });

            // Get weather condition
            const weatherCondition = weatherData.current?.weather?.[0]?.main || "Unknown";

            // Get city name
            let cityName = "Your Location";
            const cityResponse = await WeatherService.getCachedCityFromCoords(
                userProfile.latitude,
                userProfile.longitude
            );
            if (cityResponse.success && cityResponse.city) {
                cityName = cityResponse.city;
            }

            // Update widget with timeline
            await WidgetService.updateWidgetWithGrowthTimeline(
                {
                    temperature: weatherData.current?.temp || 72,
                    condition: weatherCondition,
                    cityName,
                },
                plants,
                weatherCondition
            );

            console.log("[BackgroundTask] Widget updated successfully");
            return BackgroundFetch!.BackgroundFetchResult.NewData;
        } catch (error) {
            console.error("[BackgroundTask] Widget update failed:", error);
            return BackgroundFetch!.BackgroundFetchResult.Failed;
        }
    });
}

/**
 * Register the background fetch task
 */
export const registerWidgetBackgroundTask = async (): Promise<void> => {
    if (!nativeModulesAvailable || !BackgroundFetch || !TaskManager) {
        console.log("[BackgroundTask] Native modules not available, skipping registration");
        return;
    }

    if (Platform.OS !== "ios") {
        console.log("[BackgroundTask] Background fetch only supported on iOS");
        return;
    }

    try {
        // Check if task is already registered
        const isRegistered = await TaskManager.isTaskRegisteredAsync(WIDGET_UPDATE_TASK);
        if (isRegistered) {
            console.log("[BackgroundTask] Widget update task already registered");
            return;
        }

        // Register background fetch task
        await BackgroundFetch.registerTaskAsync(WIDGET_UPDATE_TASK, {
            minimumInterval: 30 * 60, // 30 minutes (iOS may adjust this)
            stopOnTerminate: false,
            startOnBoot: true,
        });

        console.log("[BackgroundTask] Widget update task registered");
    } catch (error) {
        console.error("[BackgroundTask] Failed to register task:", error);
    }
};

/**
 * Unregister the background fetch task
 */
export const unregisterWidgetBackgroundTask = async (): Promise<void> => {
    if (!nativeModulesAvailable || !BackgroundFetch || !TaskManager) {
        return;
    }

    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(WIDGET_UPDATE_TASK);
        if (isRegistered) {
            await BackgroundFetch.unregisterTaskAsync(WIDGET_UPDATE_TASK);
            console.log("[BackgroundTask] Widget update task unregistered");
        }
    } catch (error) {
        console.error("[BackgroundTask] Failed to unregister task:", error);
    }
};

/**
 * Check background fetch status
 */
export const getBackgroundFetchStatus = async (): Promise<number | null> => {
    if (!nativeModulesAvailable || !BackgroundFetch) {
        return null;
    }
    return await BackgroundFetch.getStatusAsync();
};

export default {
    registerWidgetBackgroundTask,
    unregisterWidgetBackgroundTask,
    getBackgroundFetchStatus,
    WIDGET_UPDATE_TASK,
};
