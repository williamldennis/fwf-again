import { Stack } from "expo-router";
import { View, Platform } from "react-native";
import { useEffect } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSessionRefresh } from "../hooks/useSessionRefresh";
import { analytics } from "../services/analyticsService";
import { WidgetService } from "../services/widgetService";
import "../../global.css";

export default function RootLayout() {
    // Initialize session refresh functionality
    useSessionRefresh();

    // Initialize analytics and iOS widget
    useEffect(() => {
        analytics.initialize();

        // Initialize iOS widget early so it has a layout registered
        // This ensures the widget shows something even before data loads
        if (Platform.OS === "ios") {
            WidgetService.initializeWidget();
        }

        // Expose analytics for testing in development
        if (__DEV__) {
            (global as any).testAnalytics = () => analytics.sendTestEvent();
        }
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ErrorBoundary>
                <Stack screenOptions={{ headerShown: false, animation: "none" }}>
                    <Stack.Screen
                        name="index"
                        options={{
                            headerShown: false,
                            animation: "none",
                        }}
                    />
                    <Stack.Screen
                        name="home"
                        options={{
                            headerShown: false,
                            animation: "none",
                        }}
                    />
                    <Stack.Screen
                        name="selfie"
                        options={{
                            headerShown: false,
                            animation: "none",
                        }}
                    />
                </Stack>
            </ErrorBoundary>
        </GestureHandlerRootView>
    );
}
