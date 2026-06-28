import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

interface KickPlayerData {
  code: string;
  targetUid: string;
}

export const kickPlayer = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli.');

  const callerUid = request.auth.uid;
  const { code, targetUid } = request.data as KickPlayerData;

  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Geçersiz oda kodu.');
  }
  if (!targetUid || typeof targetUid !== 'string') {
    throw new HttpsError('invalid-argument', 'Geçersiz hedef oyuncu.');
  }
  if (callerUid === targetUid) {
    throw new HttpsError('invalid-argument', 'Kendinizi atamazsınız.');
  }

  const db = admin.database();
  const [metaSnap, callerSnap, targetSnap] = await Promise.all([
    db.ref(`rooms/${code}/meta`).get(),
    db.ref(`rooms/${code}/players/${callerUid}`).get(),
    db.ref(`rooms/${code}/players/${targetUid}`).get(),
  ]);

  if (!metaSnap.exists()) throw new HttpsError('not-found', 'Oda bulunamadı.');
  if (!callerSnap.exists()) throw new HttpsError('permission-denied', 'Bu odanın üyesi değilsiniz.');
  if (!targetSnap.exists()) throw new HttpsError('not-found', 'Hedef oyuncu odada değil.');

  const caller = callerSnap.val() as { isHost?: boolean };
  if (!caller.isHost) throw new HttpsError('permission-denied', 'Yalnız host oyuncu atabilir.');

  const meta = metaSnap.val() as { status: string };

  if (meta.status === 'lobby') {
    // Lobby: oyuncuyu tamamen kaldır
    await db.ref(`rooms/${code}/players/${targetUid}`).remove();
  } else {
    // Oyun devam ederken: spectator yap ve bağlantısını kes
    await db.ref(`rooms/${code}/players/${targetUid}`).update({
      isSpectator: true,
      isConnected: false,
      lastSeen: admin.database.ServerValue.TIMESTAMP,
    });
  }

  return { success: true };
});
