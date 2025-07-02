import React, { useState, useRef } from 'react';
import { View, Text, Alert, ActivityIndicator, TouchableOpacity, Dimensions, Image } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../utils/supabase';

const { width: screenWidth } = Dimensions.get('window');
const CAMERA_SIZE = Math.min(screenWidth * 0.3, 300);

const WEATHER_TYPES = [
    { key: 'sunny', label: 'How do you feel when it\'s sunny?', color: '#FFD700' },
    { key: 'cloudy', label: 'How do you feel when it\'s cloudy?', color: '#B0B0B0' },
    { key: 'rainy', label: 'How do you feel when it\'s rainy?', color: '#4A90E2' },
    { key: 'snowy', label: 'How do you feel when it\'s snowy?', color: '#F0F8FF' },
    { key: 'thunderstorm', label: 'How do you feel during a thunderstorm?', color: '#2C3E50' }
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
            const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
            setCapturedPhoto(photo.uri);
            setSelfies(prev => ({ ...prev, [currentWeather.key]: `data:image/jpeg;base64,${photo.base64}` }));
        }
    };

    const handleRetake = () => {
        setCapturedPhoto(null);
        setSelfies(prev => {
            const updated = { ...prev };
            delete updated[currentWeather.key];
            return updated;
        });
    };

    const handleNext = async () => {
        if (currentIndex < WEATHER_TYPES.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setCapturedPhoto(null);
        } else {
            await saveSelfies();
        }
    };

    const saveSelfies = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');
            const { error } = await supabase
                .from('profiles')
                .update({ selfie_urls: selfies })
                .eq('id', user.id);
            if (error) throw error;
            router.replace('/home');
        } catch (error) {
            Alert.alert('Error', 'Failed to save selfies');
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
                <Text className="text-xl font-bold text-center mb-8 text-gray-800">Camera permission is required to take selfies.</Text>
                <TouchableOpacity 
                    className="bg-blue-500 py-3 px-8 rounded-full mb-5" 
                    onPress={requestPermission}
                >
                    <Text className="text-white text-lg font-bold">Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            {/* Title at top */}
            <View className="flex justify-center items-center px-5 pt-10">
                <Text className="text-xl font-bold text-center text-gray-800">{currentWeather.label}</Text>
            </View>
            
            {/* Camera view in center */}
            <View className="flex-1 justify-center items-center">
                {capturedPhoto ? (
                    <Image 
                        source={{ uri: capturedPhoto }} 
                        className="rounded-full overflow-hidden"
                        style={{ 
                            width: CAMERA_SIZE, 
                            height: CAMERA_SIZE,
                            borderRadius: CAMERA_SIZE / 2
                        }}
                    />
                ) : (
                    <View 
                        className="rounded-full overflow-hidden"
                        style={{ 
                            width: CAMERA_SIZE, 
                            height: CAMERA_SIZE,
                            borderRadius: CAMERA_SIZE / 2
                        }}
                    >
                        <CameraView
                            ref={cameraRef}
                            style={{ 
                                width: CAMERA_SIZE, 
                                height: CAMERA_SIZE,
                                borderRadius: CAMERA_SIZE / 2
                            }}
                            facing="front"
                            ratio="1:1"
                        />
                    </View>
                )}
            </View>
            
            {/* Bottom section with progress and buttons */}
            <View className="px-5 pb-10">
                {/* Progress dots and text */}
                <View className="items-center mb-6">
                    <View className="flex-row mb-3">
                        {WEATHER_TYPES.map((weather, index) => (
                            <View
                                key={weather.key}
                                className="w-3 h-3 rounded-full mx-1"
                                style={{ backgroundColor: index <= currentIndex ? weather.color : '#ddd' }}
                            />
                        ))}
                    </View>
                    <Text className="text-base text-gray-600">
                        {currentIndex + 1} of {WEATHER_TYPES.length}
                    </Text>
                </View>
                
                {/* Buttons */}
                {!capturedPhoto ? (
                    <TouchableOpacity 
                        className="bg-blue-500 py-4 rounded-full w-full" 
                        onPress={handleCapture}
                    >
                        <Text className="text-white text-lg font-bold text-center">Capture</Text>
                    </TouchableOpacity>
                ) : (
                    <View className="flex-row gap-4">
                        <TouchableOpacity 
                            className="bg-gray-300 py-4 rounded-full flex-1" 
                            onPress={handleRetake}
                        >
                            <Text className="text-gray-800 text-base font-bold text-center">Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            className="bg-blue-500 py-4 rounded-full flex-1" 
                            onPress={handleNext}
                        >
                            <Text className="text-white text-base font-bold text-center">
                                {currentIndex < WEATHER_TYPES.length - 1 ? 'Next' : 'Finish'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}
