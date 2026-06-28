import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import type { CurationPhoto } from '@/src/types/game';
import { springConfig } from '@/src/utils/animations';

interface Props {
  photo: CurationPhoto;
  vote: boolean | undefined;
  onVote: (keep: boolean) => void;
}

export function CurationCard({ photo, vote, onVote }: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress(keep: boolean) {
    scale.value = withSpring(0.96, springConfig, () => {
      scale.value = withSpring(1, springConfig);
    });
    onVote(keep);
  }

  const keepActive = vote === true;
  const cutActive = vote === false;

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <Image source={{ uri: photo.url }} style={styles.image} resizeMode="cover" />

      {photo.isOwn && (
        <View style={styles.ownBadge}>
          <Text style={styles.ownBadgeText}>Senin fotoğrafın</Text>
        </View>
      )}

      {!photo.isOwn && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.voteBtn, keepActive && styles.keepActive]}
            onPress={() => handlePress(true)}
            accessibilityLabel="Beğen"
          >
            <Text style={styles.voteIcon}>👍</Text>
          </Pressable>
          <Pressable
            style={[styles.voteBtn, cutActive && styles.cutActive]}
            onPress={() => handlePress(false)}
            accessibilityLabel="Ele"
          >
            <Text style={styles.voteIcon}>👎</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E5E5EA',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  ownBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ownBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#fff',
  },
  voteBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  keepActive: {
    backgroundColor: '#E8F8EE',
    borderColor: '#34C759',
  },
  cutActive: {
    backgroundColor: '#FDECEA',
    borderColor: '#FF3B30',
  },
  voteIcon: {
    fontSize: 24,
  },
});
