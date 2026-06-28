import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const MIN_APPROVED = 3;

export const finalizeCuration = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli.');

  const { code } = request.data as { code: string };
  if (!code) throw new HttpsError('invalid-argument', 'Geçersiz parametre.');

  const uid = request.auth.uid;
  const db = admin.database();

  const metaSnap = await db.ref(`rooms/${code}/meta`).get();
  if (!metaSnap.exists()) throw new HttpsError('not-found', 'Oda bulunamadı.');
  const meta = metaSnap.val();

  if (meta.hostId !== uid) {
    throw new HttpsError('permission-denied', 'Yalnız host küratörlüğü bitirebilir.');
  }
  if (meta.status !== 'curation') {
    throw new HttpsError('failed-precondition', 'Küratörlük aşamasında değil.');
  }

  const [poolSnap, votesSnap] = await Promise.all([
    db.ref(`rooms/${code}/game/photoPool`).get(),
    db.ref(`rooms/${code}/game/curation/votes`).get(),
  ]);

  if (!poolSnap.exists()) throw new HttpsError('not-found', 'Fotoğraf havuzu bulunamadı.');

  const pool = poolSnap.val() as Record<string, Record<string, { url: string; used: boolean }>>;
  const votes = votesSnap.exists()
    ? (votesSnap.val() as Record<string, Record<string, Record<string, boolean>>>)
    : {};

  interface PhotoEntry {
    ownerUid: string;
    index: string;
    score: number;
    approved: boolean;
  }

  const entries: PhotoEntry[] = [];

  for (const [ownerUid, photos] of Object.entries(pool)) {
    for (const index of Object.keys(photos)) {
      const photoVotes = votes[ownerUid]?.[index] ?? {};
      let keeps = 0;
      let cuts = 0;
      for (const vote of Object.values(photoVotes)) {
        if (vote === true) keeps++;
        else cuts++;
      }
      // keeps >= cuts → onaylı (beraberlik dahil)
      entries.push({ ownerUid, index, score: keeps - cuts, approved: keeps >= cuts });
    }
  }

  let approvedCount = entries.filter((e) => e.approved).length;

  // Taban koruması: MIN_APPROVED'a kadar en yüksek skorluları dahil et
  if (approvedCount < MIN_APPROVED) {
    const notApproved = entries
      .filter((e) => !e.approved)
      .sort((a, b) => b.score - a.score);

    let needed = Math.min(MIN_APPROVED, entries.length) - approvedCount;
    for (const entry of notApproved) {
      if (needed <= 0) break;
      entry.approved = true;
      needed--;
      approvedCount++;
    }
  }

  // approved flag'lerini admin olarak yaz
  const updates: Record<string, boolean> = {};
  for (const { ownerUid, index, approved } of entries) {
    updates[`rooms/${code}/game/photoPool/${ownerUid}/${index}/approved`] = approved;
  }
  updates[`rooms/${code}/meta/curationDone`] = true;

  await db.ref().update(updates);

  return { success: true, approvedCount };
});
