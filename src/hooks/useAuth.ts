import { useEffect, useState } from 'react';
import { ensureSignedIn, subscribeAuth } from '@/src/services/firebase/auth';
import { useProfileStore } from '@/src/store/profileStore';

export function useAuth() {
  const setUid = useProfileStore((s) => s.setUid);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureSignedIn().then((uid) => {
      setUid(uid);
      setReady(true);
    });

    const unsub = subscribeAuth((uid) => {
      if (uid) setUid(uid);
    });
    return unsub;
  }, [setUid]);

  return { ready };
}
