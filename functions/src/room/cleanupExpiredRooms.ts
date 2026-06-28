import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const cleanupExpiredRooms = onSchedule('every 30 minutes', async () => {
  const db = admin.database();
  const roomsSnap = await db.ref('rooms').get();

  if (!roomsSnap.exists()) return;

  const now = Date.now();
  const deletions: Promise<void>[] = [];

  roomsSnap.forEach((roomSnap) => {
    const meta = roomSnap.child('meta').val();
    if (meta?.expiresAt && meta.expiresAt < now) {
      deletions.push(roomSnap.ref.remove());
    }
  });

  await Promise.all(deletions);
});
