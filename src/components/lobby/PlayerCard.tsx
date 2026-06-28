import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/src/components/ui/Avatar';
import type { Player } from '@/src/types/player';

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.avatarWrap}>
        <Avatar uri={player.photoUrl} initials={player.nickname} size={44} />
        <View style={[styles.dot, player.isConnected ? styles.dotOnline : styles.dotOffline]} />
      </View>

      <View style={styles.info}>
        <Text style={styles.nickname} numberOfLines={1}>
          {player.nickname}
        </Text>
        {player.isHost && <Text style={styles.badge}>HOST</Text>}
      </View>

      <Text style={styles.status}>{player.isReady ? '✓ Hazır' : 'Bekliyor'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#F2F2F7',
  },
  dotOnline: { backgroundColor: '#34C759' },
  dotOffline: { backgroundColor: '#8E8E93' },
  info: {
    flex: 1,
    gap: 2,
  },
  nickname: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: 0.5,
  },
  status: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '500',
  },
});
