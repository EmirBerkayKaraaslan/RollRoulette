import * as admin from 'firebase-admin';

admin.initializeApp();

export { createRoom } from './room/createRoom';
export { joinRoom } from './room/joinRoom';
export { cleanupExpiredRooms } from './room/cleanupExpiredRooms';
