export interface Player {
  uid: string;
  nickname: string;
  photoUrl: string | null;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  isSpectator: boolean;
  isAfk?: boolean;
  lastSeen: number;
  totalScore: number;
  joinedAt: number;
  photosReady?: boolean;
}
