import { StyleSheet, Text, View, FlatList } from 'react-native';
import { Avatar } from '@/src/components/ui/Avatar';
import type { Player } from '@/src/types/player';

interface Props {
  players: Player[];
}

export function Leaderboard({ players }: Props) {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <FlatList
      data={sorted}
      keyExtractor={(p) => p.uid}
      contentContainerStyle={styles.list}
      renderItem={({ item, index }) => (
        <View style={styles.row}>
          <Text style={styles.rank}>#{index + 1}</Text>
          <Avatar uri={item.photoUrl} size={36} />
          <Text style={styles.name} numberOfLines={1}>
            {item.nickname}
          </Text>
          <Text style={styles.score}>{item.totalScore}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  rank: {
    width: 28,
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    textAlign: 'center',
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
});
