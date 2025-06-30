import { router } from 'expo-router';
import { useEffect } from 'react';
import { InteractionManager, Text, View } from 'react-native';

export default function Index() {
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      router.replace('/login');
    });

    return () => task.cancel();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text>Redirecting to login...</Text>
    </View>
  );
}
