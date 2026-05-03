import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { pb, isAuthenticated, initAuth } from "../utils/pocketbase";

export default function Index() {
    useEffect(() => {
        // Use requestAnimationFrame instead of deprecated InteractionManager
        const checkAuth = async () => {
            try {
                // Initialize auth from AsyncStorage first
                await initAuth();

                // Check if user is already authenticated
                if (!isAuthenticated() || !pb.authStore.model) {
                    console.log(
                        "[Index] No session found, redirecting to login"
                    );
                    router.replace("/login");
                    return;
                }

                console.log(
                    "[Index] Session found, checking user profile..."
                );

                // User is authenticated, check their profile completion
                const user = pb.authStore.model;

                // Check profile completion and redirect accordingly
                if (!user.phone_number) {
                    console.log(
                        "[Index] No phone number, redirecting to phone input"
                    );
                    router.replace("/phone-number-add");
                } else if (!user.full_name) {
                    console.log(
                        "[Index] No full name, redirecting to name input"
                    );
                    router.replace("/name-input");
                } else if (!user.contacts_approved) {
                    console.log(
                        "[Index] Contacts not approved, redirecting to contacts permission"
                    );
                    router.replace("/contacts-permission");
                } else if (!user.location_approved) {
                    console.log(
                        "[Index] Location not approved, redirecting to location permission"
                    );
                    router.replace("/location-permission");
                } else {
                    // Check for file fields (selfie_sunny, selfie_cloudy, etc.)
                    // This matches the check in selfie.tsx to avoid navigation bouncing
                    const requiredSelfies = [
                        "sunny",
                        "cloudy",
                        "rainy",
                        "snowy",
                        "thunderstorm",
                    ];
                    const hasAllSelfies = requiredSelfies.every((key) => {
                        const fieldName = `selfie_${key}`;
                        return user[fieldName] && user[fieldName].length > 0;
                    });
                    console.log("[Index] hasAllSelfies result:", hasAllSelfies);

                    if (!hasAllSelfies) {
                        console.log(
                            "[Index] Missing selfies, redirecting to selfie"
                        );
                        router.replace("/selfie");
                    } else {
                        console.log(
                            "[Index] Profile complete, redirecting to home"
                        );
                        router.replace("/home");
                    }
                }
            } catch (error) {
                console.log("[Index] Unexpected error:", error);
                router.replace("/login");
            }
        };

        checkAuth();
    }, []);

    // Minimal loading screen - just show background while redirecting
    // This prevents flashing of loading text during quick redirects
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#87CEEB", // Match default home background
            }}
        />
    );
}
