import { onValue } from 'firebase/database';
import { useEffect } from 'react';
import { roundRef } from '@/src/services/firebase/rtdb';
import { useGameStore } from '@/src/store/gameStore';
import { useRoomStore } from '@/src/store/roomStore';
import type { Round } from '@/src/types/game';

export function useGameRound(code: string) {
  const meta = useRoomStore((s) => s.meta);
  const currentRoundNumber = meta?.currentRound ?? 0;
  const setRound = useGameStore((s) => s.setRound);

  useEffect(() => {
    if (!code || currentRoundNumber < 1) return;

    const unsub = onValue(roundRef(code, currentRoundNumber), (snap) => {
      const round: Round | null = snap.exists() ? (snap.val() as Round) : null;
      setRound(round, currentRoundNumber);
    });

    return () => unsub();
  }, [code, currentRoundNumber, setRound]);
}
