import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firestore } from './config';
import type { UserProfile } from '@/src/types/firebase';

export async function upsertUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await setDoc(doc(firestore, 'users', uid), data, { merge: true });
}

export async function touchLastActive(uid: string): Promise<void> {
  await setDoc(
    doc(firestore, 'users', uid),
    { lastActiveAt: serverTimestamp() },
    { merge: true },
  );
}
