import { onDisconnect, onValue, update } from 'firebase/database';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { connectedRef, playerRef, serverTimestamp } from '@/src/services/firebase/rtdb';
import { HEARTBEAT_MS } from '@/src/services/game/constants';

export function usePresence(code: string, uid: string | null) {
  useEffect(() => {
    if (!uid) return;

    const pRef = playerRef(code, uid);
    let isCurrentlyConnected = false;

    async function setupPresence() {
      const disconnHandler = onDisconnect(pRef);
      // Cancel stale handler first (prevents writing to a different room on re-mount)
      await disconnHandler.cancel();
      await disconnHandler.update({ isConnected: false, lastSeen: serverTimestamp() });
      await update(pRef, { isConnected: true, lastSeen: serverTimestamp() });
      isCurrentlyConnected = true;
    }

    // /.info/connected: true when SDK has an active connection
    const unsubConnected = onValue(connectedRef(), (snap) => {
      if (snap.val() === true) {
        setupPresence();
      } else {
        isCurrentlyConnected = false;
      }
    });

    // Heartbeat — only while connected
    const interval = setInterval(() => {
      if (isCurrentlyConnected) {
        update(pRef, { lastSeen: serverTimestamp() });
      }
    }, HEARTBEAT_MS);

    // App foregrounded → treat as reconnect (clears stale onDisconnect, refreshes presence)
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        setupPresence();
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppState);

    return () => {
      unsubConnected();
      clearInterval(interval);
      appStateSub.remove();
      onDisconnect(pRef).cancel();
      update(pRef, { isConnected: false, lastSeen: serverTimestamp() });
      isCurrentlyConnected = false;
    };
  }, [code, uid]);
}
