import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useProfileStore } from '@/src/store/profileStore';

export default function IndexScreen() {
  const hydrated = useProfileStore((s) => s.hydrated);
  const nickname = useProfileStore((s) => s.nickname);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return nickname ? <Redirect href="/(home)" /> : <Redirect href="/(setup)" />;
}
