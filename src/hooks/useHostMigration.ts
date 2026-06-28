import { httpsCallable } from 'firebase/functions';
import { useEffect, useRef } from 'react';
import { functions } from '@/src/services/firebase/config';
import { useRoomStore, selectPlayerList } from '@/src/store/roomStore';
import { HOST_GRACE_MS } from '@/src/services/game/constants';

export function useHostMigration(code: string, uid: string | null) {
  const meta = useRoomStore((s) => s.meta);
  const players = useRoomStore((s) => s.players);
  const playerList = useRoomStore(selectPlayerList);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uid || !meta) return;

    const hostPlayer = players[meta.hostId];
    const hostIsConnected = hostPlayer?.isConnected !== false;

    if (hostIsConnected) {
      // Host reconnected or never disconnected — cancel pending migration
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Host is disconnected — only the oldest connected non-spectator player triggers migration
    // to avoid thundering-herd (CF transaction ensures single winner anyway)
    const connectedPlayers = playerList
      .filter((p) => p.isConnected && !p.isSpectator)
      .sort((a, b) => a.joinedAt - b.joinedAt);

    if (connectedPlayers.length === 0 || connectedPlayers[0].uid !== uid) return;

    // Start grace-period timer exactly once
    if (!timerRef.current) {
      timerRef.current = setTimeout(async () => {
        timerRef.current = null;
        try {
          await httpsCallable(functions, 'migrateHost')({ code });
        } catch (_e) {
          // CF transaction is idempotent; silently ignore errors
        }
      }, HOST_GRACE_MS);
    }
    // Intentionally no cleanup return here: the timer must survive dependency-change re-runs.
    // It is cleared either in the hostIsConnected branch above or on unmount (effect below).
  }, [uid, meta, players, playerList, code]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
}
