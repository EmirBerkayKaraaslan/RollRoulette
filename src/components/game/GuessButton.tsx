import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '@/src/components/ui/Avatar';
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

  let borderColor = '#E5E5EA';
  if (revealed && isPhotoOwner) borderColor = '#34C759';
  else if (revealed && isSelected) borderColor = myGuess?.isCorrect ? '#34C759' : '#FF3B30';
  else if (isSelected) borderColor = '#007AFF';

  return (
    <TouchableOpacity
      style={[styles.button, { borderColor }]}
      onPress={onPress}
      disabled={locked}
      activeOpacity={0.7}
    >
      <Avatar uri={player.photoUrl} size={36} />
      <Text style={styles.nickname} numberOfLines={1}>
        {player.nickname}
      </Text>
      {revealed && isPhotoOwner && <Text style={styles.badge}>📸</Text>}
      {revealed && isSelected && !isPhotoOwner && (
        <Text style={styles.badge}>{myGuess?.isCorrect ? '✓' : '✗'}</Text>
      )}
    </TouchableOpacity>
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
