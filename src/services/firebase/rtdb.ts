import {
  ref,
  onValue,
  onChildAdded,
  serverTimestamp,
  type DataSnapshot,
  type Unsubscribe,
} from 'firebase/database';
import { db } from './config';

export { serverTimestamp };

export const roomRef = (code: string) => ref(db, `rooms/${code}`);
export const metaRef = (code: string) => ref(db, `rooms/${code}/meta`);
export const playersRef = (code: string) => ref(db, `rooms/${code}/players`);
export const playerRef = (code: string, uid: string) => ref(db, `rooms/${code}/players/${uid}`);
export const chatRef = (code: string) => ref(db, `rooms/${code}/chat`);

// Game refs
export const photoPoolRef = (code: string) => ref(db, `rooms/${code}/game/photoPool`);
export const photoPoolPlayerRef = (code: string, uid: string) =>
  ref(db, `rooms/${code}/game/photoPool/${uid}`);
export const roundRef = (code: string, n: number) => ref(db, `rooms/${code}/game/rounds/${n}`);
export const serverTimeOffsetRef = () => ref(db, '.info/serverTimeOffset');

// Curation refs
export const curationVotesRef = (code: string) =>
  ref(db, `rooms/${code}/game/curation/votes`);
export const curationVoteRef = (code: string, ownerUid: string, index: string, voterUid: string) =>
  ref(db, `rooms/${code}/game/curation/votes/${ownerUid}/${index}/${voterUid}`);
export const curationReadyRef = (code: string) =>
  ref(db, `rooms/${code}/game/curation/ready`);
export const curationReadyPlayerRef = (code: string, uid: string) =>
  ref(db, `rooms/${code}/game/curation/ready/${uid}`);

export function subscribeValue<T>(
  path: ReturnType<typeof ref>,
  cb: (val: T | null) => void,
): Unsubscribe {
  return onValue(path, (snap: DataSnapshot) => cb(snap.exists() ? (snap.val() as T) : null));
}

export function subscribeChildAdded<T>(
  path: ReturnType<typeof ref>,
  cb: (key: string, val: T) => void,
): Unsubscribe {
  return onChildAdded(path, (snap: DataSnapshot) => {
    if (snap.key && snap.exists()) cb(snap.key, snap.val() as T);
  });
}
