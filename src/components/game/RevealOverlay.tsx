import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Avatar } from '@/src/components/ui/Avatar';
import type { Player } from '@/src/types/player';
import type { Round } from '@/src/types/game';

interface Props {
  round: Round;
  players: Record<string, Player>;
}

export function RevealOverlay({ round, players }: Props) {
  const owner = players[round.photoOwnerId];

  return (
    <View style={styles.container}>
      <View style={styles.ownerRow}>
        <Text style={styles.label}>Bu fotoğraf</Text>
        <Avatar uri={owner?.photoUrl ?? null} size={48} />
        <Text style={styles.ownerName}>{owner?.nickname ?? '?'}</Text>
        <Text style={styles.label}>kişiye aitti</Text>
      </View>

      <ScrollView style={styles.guessList}>
        {Object.entries(round.guesses ?? {}).map(([uid, guess]) => {
          const guesser = players[uid];
          return (
            <View key={uid} style={styles.guessRow}>
              <Avatar uri={guesser?.photoUrl ?? null} size={28} />
              <Text style={styles.guesserName} numberOfLines={1}>
                {guesser?.nickname ?? uid}
              </Text>
              <Text style={[styles.guessResult, { color: guess.isCorrect ? '#34C759' : '#FF3B30' }]}>
                {guess.isCorrect ? `+${guess.score}` : '0'}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
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
