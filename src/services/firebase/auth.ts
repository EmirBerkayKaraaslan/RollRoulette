import { onAuthStateChanged, signInAnonymously, type Unsubscribe } from 'firebase/auth';
import { auth } from './config';

export async function ensureSignedIn(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  const { user } = await signInAnonymously(auth);
  return user.uid;
}

export function subscribeAuth(cb: (uid: string | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, (user) => cb(user?.uid ?? null));
}
