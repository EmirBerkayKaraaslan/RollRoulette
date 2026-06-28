import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const MIN_PLAYERS = 3;

export const startGame = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli.');

  const { code } = request.data as { code: string };
  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Geçersiz oda kodu.');
  }

  const uid = request.auth.uid;
  const db = admin.database();

  const [metaSnap, playersSnap] = await Promise.all([
    db.ref(`rooms/${code}/meta`).get(),
    db.ref(`rooms/${code}/players`).get(),
  ]);

  if (!metaSnap.exists()) throw new HttpsError('not-found', 'Oda bulunamadı.');

  const meta = metaSnap.val();

  if (meta.hostId !== uid) {
    throw new HttpsError('permission-denied', 'Yalnız host başlatabilir.');
  }
  if (meta.status !== 'lobby') {
    throw new HttpsError('failed-precondition', 'Oyun lobide değil.');
  }

  const players = (playersSnap.val() ?? {}) as Record<string, unknown>;
  const playerCount = Object.keys(players).length;

  if (playerCount < MIN_PLAYERS) {
    throw new HttpsError('failed-precondition', `En az ${MIN_PLAYERS} oyuncu gerekli.`);
  }

  await db.ref(`rooms/${code}/meta/status`).set('photo_select');

  return { success: true };
});
