import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

export const startCuration = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli.');

  const { code } = request.data as { code: string };
  if (!code) throw new HttpsError('invalid-argument', 'Geçersiz parametre.');

  const uid = request.auth.uid;
  const db = admin.database();

  const metaSnap = await db.ref(`rooms/${code}/meta`).get();
  if (!metaSnap.exists()) throw new HttpsError('not-found', 'Oda bulunamadı.');
  const meta = metaSnap.val();

  if (meta.hostId !== uid) {
    throw new HttpsError('permission-denied', 'Yalnız host küratörlüğü başlatabilir.');
  }
  if (meta.mode !== 'curated') {
    throw new HttpsError('failed-precondition', 'Bu oda curated modda değil.');
  }
  if (meta.status !== 'photo_select') {
    throw new HttpsError('failed-precondition', 'Henüz foto seçim aşamasında değil.');
  }

  const playersSnap = await db.ref(`rooms/${code}/players`).get();
  if (!playersSnap.exists()) throw new HttpsError('not-found', 'Oyuncular bulunamadı.');
  const players = playersSnap.val() as Record<
    string,
    { photosReady?: boolean; isConnected?: boolean; isSpectator?: boolean }
  >;

  const connectedPlayers = Object.values(players).filter(
    (p) => p.isConnected !== false && !p.isSpectator,
  );
  const allReady = connectedPlayers.every((p) => p.photosReady === true);
  if (!allReady) {
    throw new HttpsError('failed-precondition', 'Tüm oyuncular fotoğraflarını yüklemedi.');
  }

  await db.ref(`rooms/${code}/meta/status`).set('curation');

  return { success: true };
});
