import { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../utils/supabase';

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

    const currentWeather = WEATHER_TYPES[currentIndex];

    const takeSelfie = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
                setSelfies(prev => ({ ...prev, [currentWeather.key]: base64Image }));

                if (currentIndex < WEATHER_TYPES.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                } else {
                    await saveSelfies();
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to take photo');
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

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{currentWeather.label}</Text>

            <View style={[styles.cameraCircle, { backgroundColor: currentWeather.color }]}>
                {selfies[currentWeather.key] ? (
                    <View style={styles.previewContainer}>
                        <Text style={styles.checkmark}>✓</Text>
                        <Text style={styles.completed}>Completed!</Text>
                    </View>
                ) : (
                    <View style={styles.cameraPlaceholder}>
                        <Text style={styles.cameraIcon}>📷</Text>
                        <Text style={styles.tapText}>Tap to take photo</Text>
                    </View>
                )}
            </View>

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
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 40,
        color: '#333',
    },
    cameraCircle: {
        width: 250,
        height: 250,
        borderRadius: 125,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    cameraPlaceholder: {
        alignItems: 'center',
    },
    cameraIcon: {
        fontSize: 48,
        marginBottom: 10,
    },
    tapText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
    previewContainer: {
        alignItems: 'center',
    },
    checkmark: {
        fontSize: 48,
        color: '#fff',
        fontWeight: 'bold',
    },
    completed: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
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
