import { Stack } from "expo-router";
import { View } from "react-native";
import { useEffect } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSessionRefresh } from "../hooks/useSessionRefresh";
import { analytics } from "../services/analyticsService";
import "../../global.css";

export default function RootLayout() {
    // Initialize session refresh functionality
    useSessionRefresh();

    // Initialize analytics
    useEffect(() => {
        analytics.initialize();
        
        // Expose analytics for testing in development
        if (__DEV__) {
            (global as any).testAnalytics = () => analytics.sendTestEvent();
        }
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ErrorBoundary>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen
                        name="home"
                        options={{
                            headerShown: false,
                        }}
                    />
                </Stack>
            </ErrorBoundary>
        </GestureHandlerRootView>
    );
}
