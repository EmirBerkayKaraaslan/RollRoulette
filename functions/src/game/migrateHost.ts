import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

interface PlayerSnap {
  isConnected: boolean;
  isSpectator?: boolean;
  joinedAt: number;
  isHost?: boolean;
}

export const migrateHost = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli.');

  const { code } = request.data as { code: string };
  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Geçersiz oda kodu.');
  }

  const db = admin.database();

  // Read players snapshot before transaction (for candidate selection)
  const playersSnap = await db.ref(`rooms/${code}/players`).get();
  if (!playersSnap.exists()) throw new HttpsError('not-found', 'Oda bulunamadı.');

  const players = playersSnap.val() as Record<string, PlayerSnap>;

  let oldHostUid: string | null = null;
  let newHostUid: string | null = null;

  // Transaction on meta/hostId — guarantees single winner when multiple clients trigger
  const txResult = await db.ref(`rooms/${code}/meta/hostId`).transaction(
    (currentHostId: string | null) => {
      if (!currentHostId) return; // abort — no host set

      const currentHost = players[currentHostId];
      // Idempotent: if current host is already connected, no-op
      if (currentHost && currentHost.isConnected === true) return; // abort

      // Oldest connected non-spectator (excluding current host) becomes new host
      const candidates = Object.entries(players)
        .filter(
          ([uid, p]) =>
            uid !== currentHostId && p.isConnected === true && p.isSpectator !== true,
        )
        .sort(([, a], [, b]) => a.joinedAt - b.joinedAt);

      if (candidates.length === 0) return; // abort — nobody to migrate to

      oldHostUid = currentHostId;
      newHostUid = candidates[0][0];
      return newHostUid;
    },
  );

  if (!txResult.committed || !newHostUid || !oldHostUid) {
    return { success: true, migrated: false };
  }

  // Flip isHost flags and record migration timestamp
  await db.ref().update({
    [`rooms/${code}/players/${oldHostUid}/isHost`]: false,
    [`rooms/${code}/players/${newHostUid}/isHost`]: true,
    [`rooms/${code}/meta/hostMigratedAt`]: admin.database.ServerValue.TIMESTAMP,
  });

  return { success: true, migrated: true, newHostUid };
});
