import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { registerForPushNotificationsAsync } from "../services/notificationService";

/**
 * Registers the current device for push notifications once the user is
 * authenticated, and routes notification taps into the app.
 */
export function usePushNotifications(userId: string | null) {
    const responseListener = useRef<Notifications.EventSubscription | null>(
        null
    );

    // Register (and persist) the Expo push token for this user.
    useEffect(() => {
        if (!userId) return;
        registerForPushNotificationsAsync(userId);
    }, [userId]);

    // Handle taps on notifications (foreground, background, or cold start).
    useEffect(() => {
        responseListener.current =
            Notifications.addNotificationResponseReceivedListener(() => {
                // MVP: garden-activity taps land the user on their home garden.
                // (Deep-linking straight to the activity log is a follow-up.)
                router.replace("/home");
            });

        return () => {
            responseListener.current?.remove();
        };
    }, []);
}

export default usePushNotifications;
