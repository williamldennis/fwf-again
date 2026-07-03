import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { pb } from "../utils/pocketbase";

// Show a banner (and play a sound) even when the app is foregrounded.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

/**
 * Request notification permission, obtain the Expo push token, and persist it
 * on the authenticated user's record so the backend can push garden-activity
 * notifications to this device.
 *
 * Returns the token on success, or null if unavailable (e.g. simulator, denied
 * permission, or no project id).
 */
export async function registerForPushNotificationsAsync(
    userId: string
): Promise<string | null> {
    // Push tokens are only issued on physical devices.
    if (!Device.isDevice) {
        console.log(
            "[Notifications] Skipping registration - push requires a physical device"
        );
        return null;
    }

    // Android requires a channel for notifications to be delivered.
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "Garden activity",
            importance: Notifications.AndroidImportance.DEFAULT,
        });
    }

    const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== "granted") {
        console.log("[Notifications] Permission not granted");
        return null;
    }

    const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        (Constants as any)?.easConfig?.projectId;
    if (!projectId) {
        console.warn(
            "[Notifications] Missing EAS projectId; cannot fetch Expo push token"
        );
        return null;
    }

    try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync({
            projectId,
        });
        const token = tokenResponse.data;

        // Persist only if it changed to avoid needless writes.
        if (pb.authStore.model?.push_token !== token) {
            await pb.collection("users").update(userId, { push_token: token });
        }
        console.log("[Notifications] Registered push token for user:", userId);
        return token;
    } catch (error) {
        console.error("[Notifications] Failed to register push token:", error);
        return null;
    }
}

/**
 * Clear the stored push token (call on logout so the device stops receiving
 * pushes for the signed-out account).
 */
export async function unregisterPushNotificationsAsync(
    userId: string
): Promise<void> {
    try {
        await pb.collection("users").update(userId, { push_token: "" });
    } catch (error) {
        console.error("[Notifications] Failed to clear push token:", error);
    }
}
