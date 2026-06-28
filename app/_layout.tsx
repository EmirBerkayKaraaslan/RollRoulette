import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useAuth } from '@/src/hooks/useAuth';
import { useProfileStore } from '@/src/store/profileStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready: authReady } = useAuth();
  const hydrated = useProfileStore((s) => s.hydrated);

  useEffect(() => {
    if (authReady && hydrated) {
      SplashScreen.hideAsync();
    }
  }, [authReady, hydrated]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(setup)" />
      <Stack.Screen name="(home)" />
      <Stack.Screen name="room/[code]" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
