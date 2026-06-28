import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface Props {
  score: number;
  onDone?: () => void;
}

export function ScorePopup({ score, onDone }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 1200 }),
      withTiming(0, { duration: 400 }, (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      }),
    );
    translateY.value = withSequence(
      withSpring(-20, { damping: 8 }),
      withTiming(-40, { duration: 1200 }),
      withTiming(-60, { duration: 400 }),
    );
  }, [score]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (score === 0) return null;

  return (
    <Animated.View style={[styles.container, style]}>
      <Text style={styles.text}>+{score}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#34C759',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 100,
  },
  text: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
});
