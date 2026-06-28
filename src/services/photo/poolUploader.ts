import { ref as dbRef, set as dbSet } from 'firebase/database';
import { db } from '@/src/services/firebase/config';
import { compressImage } from './compressor';
import { uploadPoolPhoto } from '@/src/services/firebase/storage';

export async function uploadPhotoPool(
  uid: string,
  code: string,
  uris: string[],
  onProgress: (uploaded: number, total: number) => void,
): Promise<void> {
  for (let index = 0; index < uris.length; index++) {
    const compressed = await compressImage(uris[index]);
    const url = await uploadPoolPhoto(code, uid, index, compressed);
    const entryRef = dbRef(db, `rooms/${code}/game/photoPool/${uid}/${index}`);
    await dbSet(entryRef, { url, used: false });
    onProgress(index + 1, uris.length);
  }
}
