import { useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '../utils/supabase';

export default function LocationPermission() {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        setLoading(true);
        console.log('Requesting location permissions...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('Location permission status:', status);
        if (status === 'granted') {
            console.log('Getting current position...');
            const location = await Location.getCurrentPositionAsync({});
            console.log('Location received:', location);
            const { data: { user } } = await supabase.auth.getUser();
            console.log('Supabase user:', user);
            if (!user) {
                console.log('Could not get user info.');
                Alert.alert('Could not get user info.');
                setLoading(false);
                return;
            }
            console.log('Updating profile in Supabase...');
            const { error } = await supabase.from('profiles').update({
                location_approved: true,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            }).eq('id', user.id);
            if (error) {
                console.log('Failed to save location:', error.message);
                Alert.alert('Failed to save location:', error.message);
            } else {
                console.log('Location saved, redirecting to selfie step.');
                router.replace('/selfie');
            }
        } else {
            console.log('Permission denied');
            Alert.alert('Permission denied', 'You need to allow location access to continue.');
        }
        setLoading(false);
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>We need access to your location to continue.</Text>
            <Button title={loading ? 'Saving...' : 'Approve'} onPress={handleApprove} disabled={loading} />
        </View>
    );
}
