import { View, Text, Button } from 'react-native';
import { router } from 'expo-router';

export default function ContactsPermission() {
  const handleApprove = () => {
    // Here you would request contacts permission, then navigate as needed
    router.replace('/'); // Or wherever you want to go next
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>We need access to your contacts to continue.</Text>
      <Button title="Approve" onPress={handleApprove} />
    </View>
  );
}
