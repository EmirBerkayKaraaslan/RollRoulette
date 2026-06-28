import * as FileSystem from 'expo-file-system/legacy';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { storage } from './config';

// RN'de Firebase JS SDK uploadBytes(Blob) "Creating blobs from ArrayBuffer not supported"
// hatası veriyor. Blob'u atlayıp dosyayı base64 okuyup uploadString ile yüklüyoruz.
async function uploadLocalJpeg(path: string, localUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fileRef = ref(storage, path);
  await uploadString(fileRef, base64, 'base64', { contentType: 'image/jpeg' });
  return getDownloadURL(fileRef);
}

export async function uploadAvatar(uid: string, localUri: string): Promise<string> {
  return uploadLocalJpeg(`avatars/${uid}.jpg`, localUri);
}

export async function uploadPoolPhoto(
  code: string,
  uid: string,
  index: number,
  localUri: string,
): Promise<string> {
  return uploadLocalJpeg(`rooms/${code}/pool/${uid}/${index}.jpg`, localUri);
}
