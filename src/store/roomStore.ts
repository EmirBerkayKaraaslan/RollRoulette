import { create } from 'zustand';
import type { RoomMeta } from '@/src/types/room';
import type { Player } from '@/src/types/player';

interface RoomState {
  code: string | null;
  meta: RoomMeta | null;
  players: Record<string, Player>;
  myRole: 'host' | 'guest' | null;
  setRoom: (code: string, role: 'host' | 'guest') => void;  // players sıfırlanır
  setMeta: (meta: RoomMeta) => void;
  setPlayers: (players: Record<string, Player>) => void;
  leave: () => void;
}

export const useRoomStore = create<RoomState>()((set) => ({
  code: null,
  meta: null,
  players: {},
  myRole: null,
  setRoom: (code, myRole) => set({ code, myRole, players: {}, meta: null }),
  setMeta: (meta) => set({ meta }),
  setPlayers: (players) => set({ players }),
  leave: () => set({ code: null, meta: null, players: {}, myRole: null }),
}));

export const selectPlayerList = (state: RoomState): Player[] =>
  Object.values(state.players).sort((a, b) => a.joinedAt - b.joinedAt);

export const selectIsHost = (uid: string | null) => (state: RoomState): boolean =>
  uid != null && state.players[uid]?.isHost === true;
