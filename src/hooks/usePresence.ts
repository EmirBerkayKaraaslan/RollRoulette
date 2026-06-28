import { onDisconnect, update } from 'firebase/database';
import { useEffect } from 'react';
import { playerRef, serverTimestamp } from '@/src/services/firebase/rtdb';

const HEARTBEAT_INTERVAL = 30_000;

export function usePresence(code: string, uid: string | null) {
  useEffect(() => {
    if (!uid) return;

    const pRef = playerRef(code, uid);

    update(pRef, { isConnected: true, lastSeen: serverTimestamp() });

    const disconnectHandler = onDisconnect(pRef);
    disconnectHandler.update({ isConnected: false, lastSeen: serverTimestamp() });

    const interval = setInterval(() => {
      update(pRef, { lastSeen: serverTimestamp() });
    }, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(interval);
      // Stale onDisconnect handler'ı iptal et (başka odada yanlış tetiklemesin)
      disconnectHandler.cancel();
      update(pRef, { isConnected: false, lastSeen: serverTimestamp() });
    };
  }, [code, uid]);
}
