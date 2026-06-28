import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

export const revealRound = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli.');

  const { code, roundNumber } = request.data as { code: string; roundNumber: number };
  if (!code || typeof roundNumber !== 'number') {
    throw new HttpsError('invalid-argument', 'Geçersiz parametre.');
  }

  const uid = request.auth.uid;
  const db = admin.database();

  const metaSnap = await db.ref(`rooms/${code}/meta`).get();
  if (!metaSnap.exists()) throw new HttpsError('not-found', 'Oda bulunamadı.');
  const meta = metaSnap.val();

  if (meta.hostId !== uid) {
    throw new HttpsError('permission-denied', 'Yalnız host reveal edebilir.');
  }

  const roundRef = db.ref(`rooms/${code}/game/rounds/${roundNumber}`);

  // Idempotency: zaten revealed ise no-op
  const roundResult = await roundRef.transaction((round) => {
    if (!round) return round;
    if (round.status === 'revealed') return; // abort — no-op
    return {
      ...round,
      status: 'revealed',
      revealedAt: admin.database.ServerValue.TIMESTAMP,
    };
  });

  if (!roundResult.committed) {
    // Zaten revealed — güvenli no-op
    return { success: true };
  }

  // Skor toplama: bu turun tahminlerini oyuncuların totalScore'una ekle
  const roundSnap = await roundRef.get();
  const round = roundSnap.val();
  const guesses = (round?.guesses ?? {}) as Record<string, { score: number }>;

  const scoreUpdates = await Promise.allSettled(
    Object.entries(guesses).map(async ([gUid, guess]) => {
      if (!guess.score) return;
      await db.ref(`rooms/${code}/players/${gUid}/totalScore`).transaction((current) => {
        return (current ?? 0) + guess.score;
      });
    }),
  );

  // Hatalar varsa logla ama exception fırlatma (kısmi başarı kabul edilir)
  scoreUpdates.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`Score update failed for guess ${i}:`, r.reason);
    }
  });

  // Son tur mu?
  if (roundNumber >= meta.totalRounds) {
    await db.ref(`rooms/${code}/meta/status`).set('ended');
  }

  return { success: true };
});
