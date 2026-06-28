import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { Avatar } from '@/src/components/ui/Avatar';
import { springConfig } from '@/src/utils/animations';
import type { Player } from '@/src/types/player';
import type { Guess } from '@/src/types/game';

interface Props {
  player: Player;
  onPress: () => void;
  locked: boolean;
  myGuess: Guess | null;
  revealed: boolean;
  isPhotoOwner: boolean;
}

export function GuessButton({ player, onPress, locked, myGuess, revealed, isPhotoOwner }: Props) {
  const isSelected = myGuess?.guessedPlayerId === player.uid;
  const scale = useSharedValue(1);
  // 0 = default, 1 = selected, 2 = correct, 3 = wrong, 4 = owner
  const colorState = useSharedValue(0);

  useEffect(() => {
    if (revealed && isPhotoOwner) {
      colorState.value = withTiming(4, { duration: 300 });
    } else if (revealed && isSelected) {
      colorState.value = withTiming(myGuess?.isCorrect ? 2 : 3, { duration: 300 });
    } else if (isSelected) {
      colorState.value = withTiming(1, { duration: 200 });
    } else {
      colorState.value = withTiming(0, { duration: 200 });
    }
  }, [revealed, isPhotoOwner, isSelected, myGuess, colorState]);

  const animStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      colorState.value,
      [0, 1, 2, 3, 4],
      ['#E5E5EA', '#007AFF', '#34C759', '#FF3B30', '#34C759'],
    );
    return {
      transform: [{ scale: scale.value }],
      borderColor,
    };
  });

  function handlePressIn() {
    if (!locked) scale.value = withSpring(0.96, springConfig);
  }

  function handlePressOut() {
    scale.value = withSpring(1, springConfig);
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={locked}
    >
      <Animated.View style={[styles.button, animStyle]}>
        <Avatar uri={player.photoUrl} size={36} />
        <Text style={styles.nickname} numberOfLines={1}>
          {player.nickname}
        </Text>
        {revealed && isPhotoOwner && <Text style={styles.badge}>📸</Text>}
        {revealed && isSelected && !isPhotoOwner && (
          <Text style={styles.badge}>{myGuess?.isCorrect ? '✓' : '✗'}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  nickname: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  badge: {
    fontSize: 16,
  },
});
