import React, { useState, useRef } from "react";
import {
    View,
    Text,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
    Image,
} from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { supabase } from "../utils/supabase";
import LottieView from "lottie-react-native";

const { width: screenWidth } = Dimensions.get("window");
const CAMERA_SIZE = Math.min(screenWidth * 0.3, 300);

const WEATHER_TYPES = [
    {
        key: "sunny",
        label: "How do you feel when it's sunny?",
        color: "#FFD700",
        lottieSource: require("../../assets/lottie/sunny.json"),
    },
    {
        key: "cloudy",
        label: "How do you feel when it's cloudy?",
        color: "#B0B0B0",
        lottieSource: require("../../assets/lottie/cloudy.json"),
    },
    {
        key: "rainy",
        label: "How do you feel when it's rainy?",
        color: "#4A90E2",
        lottieSource: require("../../assets/lottie/rainy.json"),
    },
    {
        key: "snowy",
        label: "How do you feel when it's snowy?",
        color: "#F0F8FF",
        lottieSource: require("../../assets/lottie/snowy.json"),
    },
    {
        key: "thunderstorm",
        label: "How do you feel during a thunderstorm?",
        color: "#2C3E50",
        lottieSource: require("../../assets/lottie/thunderstorm.json"),
    },
];

export default function Selfie() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selfies, setSelfies] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();

    const currentWeather = WEATHER_TYPES[currentIndex];

    const handleCapture = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.7,
            });
            setCapturedPhoto(photo.uri);
            setSelfies((prev) => ({
                ...prev,
                [currentWeather.key]: `data:image/jpeg;base64,${photo.base64}`,
            }));

            // Auto-advance to next weather type after a short delay
            setTimeout(() => {
                if (currentIndex < WEATHER_TYPES.length - 1) {
                    setCurrentIndex((prev) => prev + 1);
                    setCapturedPhoto(null);
                } else {
                    saveSelfies();
                }
            }, 1000); // 1 second delay to show the captured photo
        }
    };

    const handleNext = async () => {
        if (currentIndex < WEATHER_TYPES.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setCapturedPhoto(null);
        } else {
            await saveSelfies();
        }
    };

    const saveSelfies = async () => {
        setLoading(true);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");
            const { error } = await supabase
                .from("profiles")
                .update({ selfie_urls: selfies })
                .eq("id", user.id);
            if (error) throw error;
            router.replace("/home");
        } catch (error) {
            Alert.alert("Error", "Failed to save selfies");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" />
                <Text className="mt-4">Saving your selfies...</Text>
            </View>
        );
    }

    if (!permission) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" />
                <Text className="mt-4">Loading camera permissions...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 justify-center items-center px-5">
                <Text className="mb-8 text-xl font-bold text-center text-gray-800">
                    Camera permission is required to take selfies.
                </Text>
                <TouchableOpacity
                    className="px-8 py-3 mb-5 bg-blue-500 rounded-full"
                    onPress={requestPermission}
                >
                    <Text className="text-lg font-bold text-white">
                        Grant Permission
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            {/* Title at top */}

            {/* Camera view in center */}
            <View className="flex-1 justify-center items-center">
                <LottieView
                    source={currentWeather.lottieSource}
                    autoPlay
                    loop
                    style={{
                        width: CAMERA_SIZE * 6,
                        height: CAMERA_SIZE * 6,
                        position: "absolute",
                        zIndex: 1,
                        opacity: 0.7,
                        marginBottom: 60,
                    }}
                />
                {capturedPhoto ? (
                    <Image
                        source={{ uri: capturedPhoto }}
                        className="overflow-hidden rounded-full"
                        style={{
                            width: CAMERA_SIZE,
                            height: CAMERA_SIZE,
                            borderRadius: CAMERA_SIZE,
                        }}
                    />
                ) : (
                    <View
                        className="overflow-hidden rounded-full"
                        style={{
                            width: CAMERA_SIZE,
                            height: CAMERA_SIZE,
                            borderRadius: CAMERA_SIZE / 2,
                        }}
                    >
                        <CameraView
                            ref={cameraRef}
                            style={{
                                width: CAMERA_SIZE,
                                height: CAMERA_SIZE,
                                borderRadius: CAMERA_SIZE / 2,
                            }}
                            facing="front"
                            ratio="1:1"
                        />
                    </View>
                )}
                <View className="flex justify-center items-center px-5 pt-10">
                    <Text className="text-xl font-bold text-center text-gray-800">
                        {currentWeather.label}
                    </Text>
                </View>
            </View>

            {/* Bottom section with progress and buttons */}
            <View className="px-5 pb-10">
                {/* Progress dots and text */}
                <View className="items-center mb-6">
                    <View className="flex-row mb-3">
                        {WEATHER_TYPES.map((weather, index) => (
                            <View key={weather.key} className="mx-1">
                                <LottieView
                                    source={weather.lottieSource}
                                    autoPlay={index <= currentIndex}
                                    loop={index <= currentIndex}
                                    style={{ width: 50, height: 50 }}
                                />
                            </View>
                        ))}
                    </View>
                    <Text className="text-base text-gray-600">
                        {currentIndex + 1} of {WEATHER_TYPES.length}
                    </Text>
                </View>

                {/* Buttons */}
                {!capturedPhoto ? (
                    <TouchableOpacity
                        className="py-4 w-full bg-blue-500 rounded-full"
                        onPress={handleCapture}
                    >
                        <Text className="text-lg font-bold text-center text-white">
                            Take Photo
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <View className="py-4 w-full bg-gray-300 rounded-full">
                        <Text className="text-lg font-bold text-center text-gray-600">
                            {currentIndex < WEATHER_TYPES.length - 1
                                ? "Moving to next..."
                                : "Saving..."}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}
