import type { Player } from './player';

export type RoomStatus = 'lobby' | 'photo_select' | 'playing' | 'ended';
export type GameMode = 'blind' | 'curated';

export interface RoomMeta {
  hostId: string;
  status: RoomStatus;
  mode: GameMode;
  totalRounds: number;
  currentRound: number;
  createdAt: number;
  expiresAt: number;
}

export interface Room {
  code: string;
  meta: RoomMeta;
  players: Record<string, Player>;
}
