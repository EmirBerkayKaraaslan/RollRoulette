export interface ChatMessage {
  uid: string;
  nickname: string;
  text: string;
  ts: number;
}

export interface UserProfile {
  nickname: string;
  photoUrl: string | null;
  createdAt: number;
  lastActiveAt: number;
  gamesPlayed: number;
}
