import { onValue } from 'firebase/database';
import { useEffect, useState } from 'react';
import { connectedRef } from '@/src/services/firebase/rtdb';

export function useConnectionStatus(): boolean {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsub = onValue(connectedRef(), (snap) => {
      setIsConnected(snap.val() === true);
    });
    return unsub;
  }, []);

  return isConnected;
}
