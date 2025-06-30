import { View, Text, Button } from 'react-native';
import { router } from 'expo-router';

export default function Selfie() {
  const handleTakeSelfie = () => {
    router.replace('/home');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Take a selfie to continue.</Text>
      <Button title="Take Selfie" onPress={handleTakeSelfie} />
    </View>
  );
}
