import * as admin from 'firebase-admin';

admin.initializeApp();

export { createRoom } from './room/createRoom';
export { joinRoom } from './room/joinRoom';
export { cleanupExpiredRooms } from './room/cleanupExpiredRooms';
export { startGame } from './game/startGame';
export { startRound } from './game/startRound';
export { submitGuess } from './game/submitGuess';
export { revealRound } from './game/revealRound';
