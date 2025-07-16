import { Stack } from "expo-router";
import { View } from "react-native";
import { ErrorBoundary } from "../components/ErrorBoundary";
import "../../global.css";

export default function RootLayout() {
    return (
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
    );
}
