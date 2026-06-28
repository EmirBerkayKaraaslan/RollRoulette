import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { revealSpring } from '@/src/utils/animations';
import { ANIM_REVEAL_MS } from '@/src/services/game/constants';

interface Props {
  url: string;
}

export function PhotoCard({ url }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.94);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: ANIM_REVEAL_MS });
    scale.value = withSpring(1, revealSpring);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
    </Animated.View>
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
