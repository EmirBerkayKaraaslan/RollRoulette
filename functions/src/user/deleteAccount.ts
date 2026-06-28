import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

export const deleteAccount = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli.');

  const uid = request.auth.uid;
  const db = admin.database();
  const firestore = admin.firestore();
  const storage = admin.storage();

  // Firestore kullanıcı profilini sil
  await firestore.collection('users').doc(uid).delete();

  // Storage avatar'ı sil (yoksa hata fırlatma)
  try {
    await storage.bucket().file(`avatars/${uid}.jpg`).delete();
  } catch {
    // Avatar hiç yüklenmediyse yoksay
  }

  // Aktif oda bağlantılarını temizle
  const roomsSnap = await db.ref('rooms').orderByChild(`players/${uid}/uid`).equalTo(uid).get();
  if (roomsSnap.exists()) {
    const updates: Record<string, null> = {};
    roomsSnap.forEach((roomSnap) => {
      updates[`rooms/${roomSnap.key}/players/${uid}`] = null;
    });
    await db.ref().update(updates);
  }

  // Firebase Auth hesabını sil
  await admin.auth().deleteUser(uid);

  return { success: true };
});
