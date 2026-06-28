import * as admin from 'firebase-admin';

admin.initializeApp();

export { createRoom } from './room/createRoom';
export { joinRoom } from './room/joinRoom';
export { cleanupExpiredRooms } from './room/cleanupExpiredRooms';
export { startGame } from './game/startGame';
export { startRound } from './game/startRound';
export { startCuration } from './game/startCuration';
export { finalizeCuration } from './game/finalizeCuration';
export { submitGuess } from './game/submitGuess';
export { revealRound } from './game/revealRound';
export { migrateHost } from './game/migrateHost';
export { dropInactive } from './game/dropInactive';
