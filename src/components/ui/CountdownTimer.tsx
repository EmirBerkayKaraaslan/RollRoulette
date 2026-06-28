import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ROUND_DURATION_MS } from '@/src/services/game/constants';
import { useServerTime } from '@/src/hooks/useServerTime';

interface Props {
  startedAt: number;
  onExpire: () => void;
}

export function CountdownTimer({ startedAt, onExpire }: Props) {
  const { serverNow } = useServerTime();
  const progress = useSharedValue(1);
  const secondsLeft = useRef(Math.ceil(ROUND_DURATION_MS / 1000));
  const expired = useRef(false);

  useEffect(() => {
    expired.current = false;

    const tick = () => {
      const elapsed = serverNow() - startedAt;
      const remaining = Math.max(0, ROUND_DURATION_MS - elapsed);
      secondsLeft.current = Math.ceil(remaining / 1000);
      progress.value = withTiming(remaining / ROUND_DURATION_MS, { duration: 250 });

      if (remaining <= 0 && !expired.current) {
        expired.current = true;
        onExpire();
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [startedAt, onExpire, serverNow, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor: progress.value > 0.4 ? '#34C759' : progress.value > 0.2 ? '#FF9500' : '#FF3B30',
  }));

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View style={[styles.bar, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  track: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
});
