import { Stack } from "expo-router";
import { View } from "react-native";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../../global.css";

export default function RootLayout() {
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
