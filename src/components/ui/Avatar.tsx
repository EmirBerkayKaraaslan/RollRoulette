import { Image, StyleSheet, Text, View } from 'react-native';

interface AvatarProps {
  uri?: string | null;
  initials?: string;
  size?: number;
}

export function Avatar({ uri, initials = '?', size = 48 }: AvatarProps) {
  const radius = size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: radius }]}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
        {initials.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#E5E5EA',
  },
  fallback: {
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
  },
});
