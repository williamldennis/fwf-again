import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Dimensions, Image } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../utils/supabase';

const { width: screenWidth } = Dimensions.get('window');
const CAMERA_SIZE = Math.min(screenWidth * 0.8, 300);

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
            <View style={styles.container}>
                <ActivityIndicator size="large" />
                <Text>Saving your selfies...</Text>
            </View>
        );
    }

    if (!permission) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
                <Text>Loading camera permissions...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Camera permission is required to take selfies.</Text>
                <TouchableOpacity style={styles.captureButton} onPress={requestPermission}>
                    <Text style={styles.captureButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{currentWeather.label}</Text>
            <View style={styles.cameraCircleWrapper}>
                {capturedPhoto ? (
                    <Image source={{ uri: capturedPhoto }} style={styles.cameraCircle} />
                ) : (
                    <CameraView
                        ref={cameraRef}
                        style={styles.cameraCircle}
                        facing="front"
                        ratio="1:1"
                    />
                )}
            </View>
            {!capturedPhoto ? (
                <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
                    <Text style={styles.captureButtonText}>Capture</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                        <Text style={styles.retakeButtonText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                        <Text style={styles.nextButtonText}>{currentIndex < WEATHER_TYPES.length - 1 ? 'Next' : 'Finish'}</Text>
                    </TouchableOpacity>
                </View>
            )}
            <View style={styles.progressContainer}>
                {WEATHER_TYPES.map((weather, index) => (
                    <View
                        key={weather.key}
                        style={[
                            styles.progressDot,
                            { backgroundColor: index <= currentIndex ? weather.color : '#ddd' }
                        ]}
                    />
                ))}
            </View>
            <Text style={styles.progressText}>
                {currentIndex + 1} of {WEATHER_TYPES.length}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 40,
        color: '#333',
    },
    cameraCircleWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    cameraCircle: {
        width: CAMERA_SIZE,
        height: CAMERA_SIZE,
        borderRadius: CAMERA_SIZE / 2,
        overflow: 'hidden',
    },
    captureButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
        marginBottom: 20,
    },
    captureButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    retakeButton: {
        backgroundColor: '#ccc',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        marginRight: 16,
    },
    retakeButtonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: 'bold',
    },
    nextButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    progressDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginHorizontal: 4,
    },
    progressText: {
        fontSize: 16,
        color: '#666',
    },
});
