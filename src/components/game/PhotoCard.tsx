import { Image, StyleSheet, View } from 'react-native';

interface Props {
  url: string;
}

export function PhotoCard({ url }: Props) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E5EA',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
