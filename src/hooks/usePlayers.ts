import { useEffect } from 'react';
import { playersRef, subscribeValue } from '@/src/services/firebase/rtdb';
import { useRoomStore } from '@/src/store/roomStore';
import type { Player } from '@/src/types/player';

export function usePlayers(code: string) {
  const setPlayers = useRoomStore((s) => s.setPlayers);
  const players = useRoomStore((s) => s.players);

  useEffect(() => {
    const unsub = subscribeValue<Record<string, Player>>(playersRef(code), (val) => {
      setPlayers(val ?? {});
    });
    return unsub;
  }, [code, setPlayers]);

  return { players };
}
