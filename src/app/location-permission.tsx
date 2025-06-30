import { useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '../utils/supabase';

export default function LocationPermission() {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({});
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Could not get user info.');
                setLoading(false);
                return;
            }
            const { error } = await supabase.from('profiles').update({
                location_approved: true,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            }).eq('id', user.id);
            if (error) {
                Alert.alert('Failed to save location:', error.message);
            } else {
                router.replace('/selfie');
            }
        } else {
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
