import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

interface JoinRoomData {
  code: string;
}

export const joinRoom = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli.');

  const uid = request.auth.uid;
  const { code } = request.data as JoinRoomData;

  if (!code || typeof code !== 'string' || code.length !== 6) {
    throw new HttpsError('invalid-argument', 'Geçersiz oda kodu.');
  }

  const db = admin.database();
  const firestore = admin.firestore();

  const [metaSnap, profileSnap] = await Promise.all([
    db.ref(`rooms/${code}/meta`).get(),
    firestore.collection('users').doc(uid).get(),
  ]);

  if (!metaSnap.exists()) {
    throw new HttpsError('not-found', 'Oda bulunamadı.');
  }

  const meta = metaSnap.val();

  if (meta.status === 'ended') {
    throw new HttpsError('failed-precondition', 'Oyun sona ermiş.');
  }

  if (Date.now() > meta.expiresAt) {
    throw new HttpsError('failed-precondition', 'Odanın süresi dolmuş.');
  }

  const profile = profileSnap.data();
  const nickname: string = profile?.nickname ?? 'Oyuncu';
  const photoUrl: string | null = profile?.photoUrl ?? null;

  const playersSnap = await db.ref(`rooms/${code}/players`).get();
  const players = (playersSnap.val() ?? {}) as Record<string, { isSpectator?: boolean }>;

  // Idempotent: already a member → refresh connection
  if (players[uid]) {
    await db.ref(`rooms/${code}/players/${uid}`).update({
      isConnected: true,
      lastSeen: admin.database.ServerValue.TIMESTAMP,
    });
    return { success: true };
  }

  const isSpectator = meta.status !== 'lobby';

  // Regular players capped at 10; spectators get an extra +10 headroom
  const regularCount = Object.values(players).filter((p) => !p.isSpectator).length;
  const spectatorCount = Object.values(players).filter((p) => p.isSpectator).length;

  if (isSpectator && spectatorCount >= 10) {
    throw new HttpsError('resource-exhausted', 'İzleyici kapasitesi dolu (maks +10).');
  }
  if (!isSpectator && regularCount >= 10) {
    throw new HttpsError('resource-exhausted', 'Oda dolu (maks 10 oyuncu).');
  }

  await db.ref(`rooms/${code}/players/${uid}`).set({
    uid,
    nickname,
    photoUrl,
    isHost: false,
    isReady: false,
    isConnected: true,
    isSpectator,
    lastSeen: admin.database.ServerValue.TIMESTAMP,
    totalScore: 0,
    joinedAt: admin.database.ServerValue.TIMESTAMP,
  });

  return { success: true, isSpectator };
});
