import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ROUND_DURATION_MS, TIMER_WARN_RATIO, ANIM_TIMER_PULSE_MS } from '@/src/services/game/constants';
import { useServerTime } from '@/src/hooks/useServerTime';

interface Props {
  startedAt: number;
  onExpire: () => void;
}

export function CountdownTimer({ startedAt, onExpire }: Props) {
  const { serverNow } = useServerTime();
  const progress = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const expired = useRef(false);
  const warningTriggered = useRef(false);

  useEffect(() => {
    expired.current = false;
    warningTriggered.current = false;

    const tick = () => {
      const elapsed = serverNow() - startedAt;
      const remaining = Math.max(0, ROUND_DURATION_MS - elapsed);
      const ratio = remaining / ROUND_DURATION_MS;
      progress.value = withTiming(ratio, { duration: 250 });

      if (ratio < TIMER_WARN_RATIO && !warningTriggered.current) {
        warningTriggered.current = true;
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.04, { duration: ANIM_TIMER_PULSE_MS / 2 }),
            withTiming(1, { duration: ANIM_TIMER_PULSE_MS / 2 }),
          ),
          -1,
          false,
        );
      }

      if (remaining <= 0 && !expired.current) {
        expired.current = true;
        pulseScale.value = withTiming(1);
        onExpire();
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [startedAt, onExpire, serverNow, progress, pulseScale]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor:
      progress.value > 0.4 ? '#34C759' : progress.value > TIMER_WARN_RATIO ? '#FF9500' : '#FF3B30',
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.track}>
        <Animated.View style={[styles.bar, barStyle]} />
      </View>
    </Animated.View>
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
