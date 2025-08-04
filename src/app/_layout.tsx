import { Stack } from "expo-router";
import { View } from "react-native";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSessionRefresh } from "../hooks/useSessionRefresh";
import "../../global.css";

export default function RootLayout() {
    // Initialize session refresh functionality
    useSessionRefresh();

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
