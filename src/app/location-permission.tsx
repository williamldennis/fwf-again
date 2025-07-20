import { useState } from "react";
import {
    View,
    Text,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    Image,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { supabase } from "../utils/supabase";
import locationImg from "../../assets/images/location.png";

export default function LocationPermission() {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        setLoading(true);

        // First request foreground permissions
        const { status: foregroundStatus } =
            await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== "granted") {
            Alert.alert(
                "Permission denied",
                "You need to allow location access to continue."
            );
            setLoading(false);
            return;
        }

        // Then request background permissions for "Always Allow" (optional)
        const { status: backgroundStatus } =
            await Location.requestBackgroundPermissionsAsync();

        // Continue with foreground permissions even if background is denied
        const location = await Location.getCurrentPositionAsync({});
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            Alert.alert("Could not get user info.");
            setLoading(false);
            return;
        }
        const { error } = await supabase
            .from("profiles")
            .update({
                location_approved: true,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            })
            .eq("id", user.id);
        if (error) {
            Alert.alert("Failed to save location:", error.message);
        } else {
            router.replace("/selfie");
        }
        setLoading(false);
    };

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#F3F6FB",
                padding: 24,
            }}
        >
            <Image
                source={locationImg}
                style={{ width: 200, height: 200, marginBottom: 12 }}
                resizeMode="contain"
            />
            <Text
                style={{
                    fontSize: 22,
                    fontWeight: "600",
                    textAlign: "center",
                    marginBottom: 16,
                    color: "#222",
                }}
            >
                We need access to your location
            </Text>
            <Text
                style={{
                    fontSize: 16,
                    textAlign: "center",
                    color: "#555",
                    marginBottom: 32,
                }}
            >
                This helps us show your local weather.
            </Text>
            <TouchableOpacity
                onPress={handleApprove}
                disabled={loading}
                style={{
                    backgroundColor: "#007AFF",
                    borderRadius: 24,
                    paddingVertical: 14,
                    paddingHorizontal: 48,
                    alignItems: "center",
                    width: "100%",
                    maxWidth: 320,
                    shadowColor: "#007AFF",
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                }}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text
                        style={{
                            color: "#fff",
                            fontSize: 18,
                            fontWeight: "bold",
                        }}
                    >
                        Allow Location
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
}
