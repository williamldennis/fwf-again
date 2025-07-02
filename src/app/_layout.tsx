import { Stack } from "expo-router";
import '../../global.css';

export default function RootLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="home" options={{ headerShown: true }} />
        </Stack>
    );
}
