import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './config';

export async function uploadAvatar(uid: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const avatarRef = ref(storage, `avatars/${uid}.jpg`);
  await uploadBytes(avatarRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(avatarRef);
}
