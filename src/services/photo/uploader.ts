import { compressImage } from './compressor';
import { uploadAvatar } from '@/src/services/firebase/storage';

export async function processAndUploadAvatar(uid: string, localUri: string): Promise<string> {
  const compressed = await compressImage(localUri);
  return uploadAvatar(uid, compressed);
}
