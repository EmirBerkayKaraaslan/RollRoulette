import { onValue } from 'firebase/database';
import { useEffect, useRef } from 'react';
import { serverTimeOffsetRef } from '@/src/services/firebase/rtdb';

// Shared offset — updated once per app session is enough
let serverTimeOffset = 0;

export function useServerTime() {
  const offsetRef = useRef(serverTimeOffset);

  useEffect(() => {
    const unsub = onValue(serverTimeOffsetRef(), (snap) => {
      if (snap.exists()) {
        serverTimeOffset = snap.val() as number;
        offsetRef.current = serverTimeOffset;
      }
    });
    return () => unsub();
  }, []);

  return {
    serverNow: () => Date.now() + offsetRef.current,
  };
}
