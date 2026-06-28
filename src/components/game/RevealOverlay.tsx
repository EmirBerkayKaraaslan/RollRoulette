import { useEffect } from 'react';
import { StyleSheet, Text, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Avatar } from '@/src/components/ui/Avatar';
import { ANIM_REVEAL_MS } from '@/src/services/game/constants';
import { revealSpring } from '@/src/utils/animations';
import type { Player } from '@/src/types/player';
import type { Round } from '@/src/types/game';

interface Props {
  round: Round;
  players: Record<string, Player>;
}

export function RevealOverlay({ round, players }: Props) {
  const owner = players[round.photoOwnerId];
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: ANIM_REVEAL_MS });
    translateY.value = withSpring(0, revealSpring);
    scale.value = withSpring(1, revealSpring);
  }, [opacity, translateY, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Animated.View style={styles.ownerRow}>
        <Text style={styles.label}>Bu fotoğraf</Text>
        <Avatar uri={owner?.photoUrl ?? null} size={48} />
        <Text style={styles.ownerName}>{owner?.nickname ?? '?'}</Text>
        <Text style={styles.label}>kişiye aitti</Text>
      </Animated.View>

      <ScrollView style={styles.guessList}>
        {Object.entries(round.guesses ?? {}).map(([uid, guess]) => {
          const guesser = players[uid];
          return (
            <Animated.View key={uid} style={styles.guessRow}>
              <Avatar uri={guesser?.photoUrl ?? null} size={28} />
              <Text style={styles.guesserName} numberOfLines={1}>
                {guesser?.nickname ?? uid}
              </Text>
              <Text style={[styles.guessResult, { color: guess.isCorrect ? '#34C759' : '#FF3B30' }]}>
                {guess.isCorrect ? `+${guess.score}` : '0'}
              </Text>
            </Animated.View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  label: {
    color: '#ffffffcc',
    fontSize: 14,
  },
  ownerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  guessList: {
    maxHeight: 200,
  },
  guessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  guesserName: {
    flex: 1,
    color: '#ffffffcc',
    fontSize: 14,
  },
  guessResult: {
    fontSize: 15,
    fontWeight: '700',
  },
});
