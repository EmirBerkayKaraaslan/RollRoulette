import { useEffect } from 'react';
import { metaRef, subscribeValue } from '@/src/services/firebase/rtdb';
import { useRoomStore } from '@/src/store/roomStore';
import type { RoomMeta } from '@/src/types/room';

export function useRoom(code: string) {
  const setMeta = useRoomStore((s) => s.setMeta);
  const meta = useRoomStore((s) => s.meta);

  useEffect(() => {
    const unsub = subscribeValue<RoomMeta>(metaRef(code), (val) => {
      if (val) setMeta(val);
    });
    return unsub;
  }, [code, setMeta]);

  return { meta };
}
