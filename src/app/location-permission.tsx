import { View, Text, Button } from 'react-native';
import { router } from 'expo-router';

export default function LocationPermission() {
  const handleApprove = () => {
    router.replace('/selfie');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>We need access to your location to continue.</Text>
      <Button title="Approve" onPress={handleApprove} />
    </View>
  );
}
