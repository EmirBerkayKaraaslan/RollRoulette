import { onValue } from 'firebase/database';
import { useEffect, useState } from 'react';
import { photoPoolRef } from '@/src/services/firebase/rtdb';
import type { PoolPhoto } from '@/src/types/game';

export function usePhotoPool(code: string) {
  const [pool, setPool] = useState<Record<string, Record<string, PoolPhoto>> | null>(null);

  useEffect(() => {
    if (!code) return;
    const unsub = onValue(photoPoolRef(code), (snap) => {
      setPool(snap.exists() ? snap.val() : null);
    });
    return () => unsub();
  }, [code]);

  return pool;
}
