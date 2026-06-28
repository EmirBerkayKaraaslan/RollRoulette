import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Leaderboard } from '@/src/components/game/Leaderboard';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useRoomStore, selectPlayerList } from '@/src/store/roomStore';
import { useGameStore } from '@/src/store/gameStore';

export default function ResultsScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const playerList = useRoomStore(selectPlayerList);
  const reset = useGameStore((s) => s.reset);
  const leave = useRoomStore((s) => s.leave);

  function handleHome() {
    reset();
    leave();
    router.replace('/(home)');
  }

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Sonuçlar</Text>
      <Text style={styles.subtitle}>Oda: {code}</Text>

      <Leaderboard players={playerList} />

      <View style={styles.actions}>
        <Button label="Ana Ekrana Dön" onPress={handleHome} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
  },
  actions: {
    gap: 10,
    paddingTop: 8,
  },
});
