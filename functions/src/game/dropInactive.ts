import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

interface PlayerSnap {
  isConnected: boolean;
  isSpectator?: boolean;
  photosReady?: boolean;
}

export const dropInactive = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli.');

  const { code } = request.data as { code: string };
  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Geçersiz parametre.');
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
    throw new HttpsError('permission-denied', 'Yalnız host yapabilir.');
  }

  const status = meta.status as string;
  if (status !== 'photo_select' && status !== 'curation') {
    throw new HttpsError('failed-precondition', 'Bu fazda bekleyenler atlanamaz.');
  }

  const players = (playersSnap.val() ?? {}) as Record<string, PlayerSnap>;
  const updates: Record<string, unknown> = {};

  if (status === 'photo_select') {
    for (const [playerUid, p] of Object.entries(players)) {
      if (p.isConnected && !p.isSpectator && !p.photosReady) {
        updates[`rooms/${code}/players/${playerUid}/isSpectator`] = true;
        updates[`rooms/${code}/players/${playerUid}/isAfk`] = true;
      }
    }
  } else {
    // curation: drop connected players who haven't submitted ready
    const curationReadySnap = await db.ref(`rooms/${code}/game/curation/ready`).get();
    const curationReady = (curationReadySnap.val() ?? {}) as Record<string, boolean>;

    for (const [playerUid, p] of Object.entries(players)) {
      if (p.isConnected && !p.isSpectator && !curationReady[playerUid]) {
        updates[`rooms/${code}/players/${playerUid}/isSpectator`] = true;
        updates[`rooms/${code}/players/${playerUid}/isAfk`] = true;
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
  }

  return { success: true, dropped: Object.keys(updates).length / 2 };
});
