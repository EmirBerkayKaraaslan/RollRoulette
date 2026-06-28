import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

type ReportReason = 'inappropriate' | 'spam' | 'other';

interface ReportContentData {
  code: string;
  photoUrl: string;
  photoOwnerId: string;
  reason: ReportReason;
}

const VALID_REASONS: ReportReason[] = ['inappropriate', 'spam', 'other'];

export const reportContent = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli.');

  const uid = request.auth.uid;
  const { code, photoUrl, photoOwnerId, reason } = request.data as ReportContentData;

  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Geçersiz oda kodu.');
  }
  if (!photoUrl || typeof photoUrl !== 'string') {
    throw new HttpsError('invalid-argument', 'Geçersiz fotoğraf URL.');
  }
  if (!photoOwnerId || typeof photoOwnerId !== 'string') {
    throw new HttpsError('invalid-argument', 'Geçersiz içerik sahibi.');
  }
  if (!VALID_REASONS.includes(reason)) {
    throw new HttpsError('invalid-argument', 'Geçersiz rapor sebebi.');
  }
  if (photoOwnerId === uid) {
    throw new HttpsError('invalid-argument', 'Kendi içeriğinizi raporlayamazsınız.');
  }

  const db = admin.database();
  const playersSnap = await db.ref(`rooms/${code}/players/${uid}`).get();
  if (!playersSnap.exists()) {
    throw new HttpsError('permission-denied', 'Bu odanın üyesi değilsiniz.');
  }

  await admin.firestore().collection('reports').add({
    reporterUid: uid,
    roomCode: code,
    photoUrl,
    photoOwnerId,
    reason,
    status: 'pending',
    ts: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});
