import { router } from "expo-router";
import { useEffect } from "react";
import { InteractionManager, Text, View } from "react-native";
import { supabase } from "../utils/supabase";

export default function Index() {
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(async () => {
            try {
                // Check if user is already authenticated
                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (error) {
                    console.log(
                        "[Index] ❌ Session check error:",
                        error.message
                    );
                    router.replace("/login");
                    return;
                }

                if (!session) {
                    console.log(
                        "[Index] ℹ️  No session found, redirecting to login"
                    );
                    router.replace("/login");
                    return;
                }

                console.log(
                    "[Index] ✅ Session found, checking user profile..."
                );

                // User is authenticated, check their profile completion
                const user = session.user;
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select(
                        "phone_number, full_name, contacts_approved, location_approved, selfie_urls"
                    )
                    .eq("id", user.id)
                    .single();

                if (profileError || !profile) {
                    console.log(
                        "[Index] ❌ Profile fetch error, redirecting to login"
                    );
                    router.replace("/login");
                    return;
                }

                // Check profile completion and redirect accordingly
                if (!profile.phone_number) {
                    console.log(
                        "[Index] 📱 No phone number, redirecting to phone input"
                    );
                    router.replace("/phone-number-add");
                } else if (!profile.full_name) {
                    console.log(
                        "[Index] 👤 No full name, redirecting to name input"
                    );
                    router.replace("/name-input");
                } else if (!profile.contacts_approved) {
                    console.log(
                        "[Index] 📞 Contacts not approved, redirecting to contacts permission"
                    );
                    router.replace("/contacts-permission");
                } else if (!profile.location_approved) {
                    console.log(
                        "[Index] 📍 Location not approved, redirecting to location permission"
                    );
                    router.replace("/location-permission");
                } else {
                    const requiredSelfies = [
                        "sunny",
                        "cloudy",
                        "rainy",
                        "snowy",
                        "thunderstorm",
                    ];
                    const selfies = profile.selfie_urls || {};
                    const hasAllSelfies = requiredSelfies.every(
                        (key) =>
                            selfies[key] &&
                            typeof selfies[key] === "string" &&
                            selfies[key].trim().length > 0
                    );
                    console.log("[Index] hasAllSelfies result:", hasAllSelfies);

                    if (!hasAllSelfies) {
                        console.log(
                            "[Index] 📸 Missing selfies, redirecting to selfie"
                        );
                        router.replace("/selfie");
                    } else {
                        console.log(
                            "[Index] 🏠 Profile complete, redirecting to home"
                        );
                        router.replace("/home");
                    }
                }
            } catch (error) {
                console.log("[Index] ❌ Unexpected error:", error);
                router.replace("/login");
            }
        });

        return () => task.cancel();
    }, []);

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <Text>Loading...</Text>
        </View>
    );
}
