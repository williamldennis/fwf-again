import { View, Text, Button, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Contacts from 'expo-contacts';

export default function ContactsPermission() {
  const handleApprove = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      // Permission granted, you can now access contacts
      Alert.alert('Permission granted!', 'You can now access contacts.');
      router.replace('/'); // Or navigate to your next screen
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
