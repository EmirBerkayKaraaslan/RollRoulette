import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const ROOM_TTL_MS = 4 * 60 * 60 * 1000; // 4 saat
const MAX_ATTEMPTS = 10;
const BASE36_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += BASE36_CHARS[Math.floor(Math.random() * BASE36_CHARS.length)];
  }
  return code;
}

export const createRoom = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli.');

  const uid = request.auth.uid;
  const { mode = 'blind' } = (request.data ?? {}) as { mode?: 'blind' | 'curated' };
  if (mode !== 'blind' && mode !== 'curated') {
    throw new HttpsError('invalid-argument', 'Geçersiz mod.');
  }

  const db = admin.database();
  const firestore = admin.firestore();

  // Firestore'dan profil al
  const profileSnap = await firestore.collection('users').doc(uid).get();
  const profile = profileSnap.data();
  const nickname: string = profile?.nickname ?? 'Oyuncu';
  const photoUrl: string | null = profile?.photoUrl ?? null;

  const now = Date.now();
  const expiresAt = now + ROOM_TTL_MS;

  let code: string | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateCode();
    const metaRef = db.ref(`rooms/${candidate}/meta`);

    const committed = await metaRef.transaction((existing) => {
      if (existing !== null) return; // çakışma — abort
      return {
        hostId: uid,
        status: 'lobby',
        mode,
        totalRounds: 0,
        currentRound: 0,
        createdAt: admin.database.ServerValue.TIMESTAMP,
        expiresAt,
      };
    });

    if (committed.committed) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    throw new HttpsError('internal', 'Oda kodu üretilemedi, tekrar dene.');
  }

  await db.ref(`rooms/${code}/players/${uid}`).set({
    uid,
    nickname,
    photoUrl,
    isHost: true,
    isReady: false,
    isConnected: true,
    isSpectator: false,
    lastSeen: admin.database.ServerValue.TIMESTAMP,
    totalScore: 0,
    joinedAt: admin.database.ServerValue.TIMESTAMP,
  });

  return { code };
});
