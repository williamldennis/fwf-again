import { useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Contacts from 'expo-contacts';

export default function ContactsPermission() {
  // Check permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Contacts.getPermissionsAsync();
      if (status === 'granted') {
        router.replace('/location-permission');
      }
    })();
  }, []);

  const handleApprove = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      router.replace('/location-permission');
    } else {
      Alert.alert('Permission denied', 'You need to allow contacts access to continue.');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>We need access to your contacts to continue.</Text>
      <Button title="Approve" onPress={handleApprove} />
    </View>
  );
}
