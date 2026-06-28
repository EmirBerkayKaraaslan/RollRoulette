import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const MAX_ROUNDS = 15;

export const startRound = onCall(async (request) => {
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
    throw new HttpsError('permission-denied', 'Yalnız host turu başlatabilir.');
  }

  if (roundNumber === 1) {
    const mode: string = meta.mode ?? 'blind';
    if (mode === 'curated') {
      if (meta.status !== 'curation' || !meta.curationDone) {
        throw new HttpsError('failed-precondition', 'Küratörlük tamamlanmadı.');
      }
    } else {
      if (meta.status !== 'photo_select') {
        throw new HttpsError('failed-precondition', 'Henüz foto seçim aşamasında değil.');
      }
    }
  } else {
    if (meta.status !== 'playing') {
      throw new HttpsError('failed-precondition', 'Oyun playing durumunda değil.');
    }
    const prevRoundSnap = await db.ref(`rooms/${code}/game/rounds/${roundNumber - 1}`).get();
    if (!prevRoundSnap.exists() || prevRoundSnap.val().status !== 'revealed') {
      throw new HttpsError('failed-precondition', 'Önceki tur henüz reveal edilmedi.');
    }
    if (roundNumber !== meta.currentRound + 1) {
      throw new HttpsError('failed-precondition', 'Hatalı tur numarası.');
    }
  }

  const roundRef = db.ref(`rooms/${code}/game/rounds/${roundNumber}`);

  // --- Atomik idempotency: transaction ile tur yuvası rezerv et ---
  // İlk transaction: turu "claimed" olarak rezerve et (var mı kontrol + yaz aynı anda)
  const claimResult = await roundRef.transaction((existing) => {
    if (existing !== null) return; // zaten var → abort (idempotent)
    return { __claimed: true }; // yer tut
  });

  if (!claimResult.committed) {
    // Zaten başlatılmış — idempotent no-op
    return { success: true };
  }

  // --- Havuzdan atomik foto seçimi ---
  const poolSnap = await db.ref(`rooms/${code}/game/photoPool`).get();
  if (!poolSnap.exists()) {
    await roundRef.remove(); // claim'i geri al
    await db.ref(`rooms/${code}/meta/status`).set('ended');
    return { success: true, ended: true };
  }

  const pool = poolSnap.val() as Record<string, Record<string, { url: string; used: boolean; approved?: boolean }>>;
  const isCurated = (meta.mode ?? 'blind') === 'curated';

  const available: Array<{ ownerUid: string; index: string; url: string }> = [];
  for (const [ownerUid, photos] of Object.entries(pool)) {
    for (const [idx, photo] of Object.entries(photos)) {
      const eligible = !photo.used && (!isCurated || photo.approved === true);
      if (eligible) {
        available.push({ ownerUid, index: idx, url: photo.url });
      }
    }
  }

  if (available.length === 0) {
    await roundRef.remove();
    await db.ref(`rooms/${code}/meta/status`).set('ended');
    return { success: true, ended: true };
  }

  // İlk turda totalRounds hesapla (mod farkındalıklı)
  let totalRounds = meta.totalRounds;
  if (roundNumber === 1) {
    totalRounds = Math.min(available.length, MAX_ROUNDS);
  }

  if (roundNumber > totalRounds) {
    await roundRef.remove();
    await db.ref(`rooms/${code}/meta/status`).set('ended');
    return { success: true, ended: true };
  }

  // Rastgele seç
  const chosen = available[Math.floor(Math.random() * available.length)];
  const usedRef = db.ref(`rooms/${code}/game/photoPool/${chosen.ownerUid}/${chosen.index}/used`);

  // Atomik "used" işareti: false → true, başkası aldıysa yeniden dene değil — tek host sürücü
  const usedResult = await usedRef.transaction((current) => {
    if (current === true) return; // başkası aldı → abort
    return true;
  });

  if (!usedResult.committed) {
    // Çok nadir: eşzamanlı çağrı bu fotoyu aldı. Kurtarma: tur claim'ini kaldır, yeniden dene.
    await roundRef.remove();
    throw new HttpsError('aborted', 'Fotoğraf seçim çakışması, tekrar deneyin.');
  }

  // Turu claim'den gerçek veriye yükse
  await roundRef.set({
    photoUrl: chosen.url,
    photoOwnerId: chosen.ownerUid,
    startedAt: admin.database.ServerValue.TIMESTAMP,
    revealedAt: null,
    status: 'active',
    guesses: null,
  });

  const updates: Record<string, unknown> = {
    [`rooms/${code}/meta/currentRound`]: roundNumber,
    [`rooms/${code}/meta/status`]: 'playing',
  };
  if (roundNumber === 1) {
    updates[`rooms/${code}/meta/totalRounds`] = totalRounds;
  }
  await db.ref().update(updates);

  return { success: true };
});
