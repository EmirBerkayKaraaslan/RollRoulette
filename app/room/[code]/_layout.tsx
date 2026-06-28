import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useRoom } from '@/src/hooks/useRoom';
import { usePlayers } from '@/src/hooks/usePlayers';
import { usePresence } from '@/src/hooks/usePresence';
import { useProfileStore } from '@/src/store/profileStore';
import { useRoomStore } from '@/src/store/roomStore';

export default function RoomLayout() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const uid = useProfileStore((s) => s.uid);
  const players = useRoomStore((s) => s.players);
  const leave = useRoomStore((s) => s.leave);

  useRoom(code);
  usePlayers(code);
  usePresence(code, uid);

  // Stale store'u temizle
  useEffect(() => {
    return () => { leave(); };
  }, [leave]);

  // Eğer bu uid odada yoksa ana ekrana çık
  useEffect(() => {
    if (uid && Object.keys(players).length > 0 && !players[uid]) {
      router.replace('/(home)');
    }
  }, [players, uid]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="lobby" />
    </Stack>
  );
}
