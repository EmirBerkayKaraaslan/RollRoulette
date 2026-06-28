import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const SCORE_BASE = 10000;

export const submitGuess = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli.');

  const { code, roundNumber, guessedPlayerId } = request.data as {
    code: string;
    roundNumber: number;
    guessedPlayerId: string;
  };

  if (!code || typeof roundNumber !== 'number' || !guessedPlayerId) {
    throw new HttpsError('invalid-argument', 'Geçersiz parametre.');
  }

  const uid = request.auth.uid;
  const db = admin.database();

  const [metaSnap, roundSnap, playerSnap] = await Promise.all([
    db.ref(`rooms/${code}/meta`).get(),
    db.ref(`rooms/${code}/game/rounds/${roundNumber}`).get(),
    db.ref(`rooms/${code}/players/${uid}`).get(),
  ]);

  if (!metaSnap.exists()) throw new HttpsError('not-found', 'Oda bulunamadı.');
  if (!playerSnap.exists()) throw new HttpsError('permission-denied', 'Oda üyesi değilsin.');
  if (!roundSnap.exists()) throw new HttpsError('not-found', 'Tur bulunamadı.');

  const meta = metaSnap.val();
  const round = roundSnap.val();

  if (meta.status !== 'playing') {
    throw new HttpsError('failed-precondition', 'Oyun playing durumunda değil.');
  }
  if (round.status !== 'active') {
    throw new HttpsError('failed-precondition', 'Tur aktif değil.');
  }
  if (round.photoOwnerId === uid) {
    throw new HttpsError('failed-precondition', 'Kendi fotoğrafını tahmin edemezsin.');
  }

  const guessRef = db.ref(`rooms/${code}/game/rounds/${roundNumber}/guesses/${uid}`);
  const existingGuess = await guessRef.get();
  if (existingGuess.exists()) {
    throw new HttpsError('failed-precondition', 'Zaten tahmin gönderdin.');
  }

  const now = Date.now();
  const startedAt: number = round.startedAt;
  const isCorrect = guessedPlayerId === round.photoOwnerId;
  const score = isCorrect ? Math.max(0, SCORE_BASE - Math.floor((now - startedAt) / 1000)) : 0;

  // Transaction ile tek yazım garantisi
  const result = await guessRef.transaction((existing) => {
    if (existing !== null) return; // zaten var, abort
    return {
      guessedPlayerId,
      submittedAt: now,
      score,
      isCorrect,
    };
  });

  if (!result.committed) {
    throw new HttpsError('failed-precondition', 'Zaten tahmin gönderdin.');
  }

  return { success: true, score };
});
