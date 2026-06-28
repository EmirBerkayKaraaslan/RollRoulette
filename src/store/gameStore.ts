import { create } from 'zustand';
import type { RoomStatus } from '@/src/types/room';
import type { Round, Guess } from '@/src/types/game';
import type { Player } from '@/src/types/player';

interface GameState {
  phase: RoomStatus | null;
  currentRound: Round | null;
  roundNumber: number;
  myGuess: Guess | null;
  timeLeftMs: number;
  poolUploadProgress: { uploaded: number; total: number } | null;
  leaderboard: Player[];
  setPhase: (phase: RoomStatus) => void;
  setRound: (round: Round | null, roundNumber: number) => void;
  setMyGuess: (guess: Guess | null) => void;
  setTimeLeft: (ms: number) => void;
  setPoolUploadProgress: (progress: { uploaded: number; total: number } | null) => void;
  setLeaderboard: (players: Player[]) => void;
  reset: () => void;
}

const initial = {
  phase: null as RoomStatus | null,
  currentRound: null as Round | null,
  roundNumber: 0,
  myGuess: null as Guess | null,
  timeLeftMs: 0,
  poolUploadProgress: null as { uploaded: number; total: number } | null,
  leaderboard: [] as Player[],
};

export const useGameStore = create<GameState>()((set) => ({
  ...initial,
  setPhase: (phase) => set({ phase }),
  setRound: (currentRound, roundNumber) =>
    set((prev) => ({
      currentRound,
      roundNumber,
      // Aynı turda myGuess'i sıfırlama — farklı tura geçince sıfırla
      myGuess: roundNumber !== prev.roundNumber ? null : prev.myGuess,
    })),
  setMyGuess: (myGuess) => set({ myGuess }),
  setTimeLeft: (timeLeftMs) => set({ timeLeftMs }),
  setPoolUploadProgress: (poolUploadProgress) => set({ poolUploadProgress }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  reset: () => set(initial),
}));
