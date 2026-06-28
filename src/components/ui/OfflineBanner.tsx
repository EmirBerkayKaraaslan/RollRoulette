import { StyleSheet, Text, View } from 'react-native';
import { useConnectionStatus } from '@/src/hooks/useConnectionStatus';

export function OfflineBanner() {
  const isConnected = useConnectionStatus();
  if (isConnected) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Çevrimdışı — bağlantı bekleniyor</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FF3B30',
    paddingVertical: 6,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
