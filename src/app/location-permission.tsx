import { useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';

export default function LocationPermission() {
  // Check permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        router.replace('/selfie');
      }
    })();
  }, []);

  const handleApprove = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      router.replace('/selfie');
    } else {
      Alert.alert('Permission denied', 'You need to allow location access to continue.');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>We need access to your location to continue.</Text>
      <Button title="Approve" onPress={handleApprove} />
    </View>
  );
}
