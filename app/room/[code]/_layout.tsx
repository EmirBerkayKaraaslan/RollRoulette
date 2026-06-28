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
  const meta = useRoomStore((s) => s.meta);
  const leave = useRoomStore((s) => s.leave);

  useRoom(code);
  usePlayers(code);
  usePresence(code, uid);

  useEffect(() => {
    return () => { leave(); };
  }, [leave]);

  // Odadan atıldıysa ana ekrana
  useEffect(() => {
    if (uid && Object.keys(players).length > 0 && !players[uid]) {
      router.replace('/(home)');
    }
  }, [players, uid]);

  // meta.status değişiminde otomatik yönlendir
  useEffect(() => {
    if (!meta) return;
    if (meta.status === 'photo_select') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace({ pathname: '/room/[code]/photo-select' as any, params: { code } });
    } else if (meta.status === 'playing') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace({ pathname: '/room/[code]/game' as any, params: { code } });
    } else if (meta.status === 'ended') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace({ pathname: '/room/[code]/results' as any, params: { code } });
    }
  }, [meta?.status, code]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="lobby" />
      <Stack.Screen name="photo-select" />
      <Stack.Screen name="game" />
      <Stack.Screen name="results" />
    </Stack>
  );
}
