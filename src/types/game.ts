export type RoundStatus = 'active' | 'revealed';

export interface Guess {
  guessedPlayerId: string;
  submittedAt: number;
  score: number;
  isCorrect: boolean;
}

export interface Round {
  photoUrl: string;
  photoOwnerId: string;
  startedAt: number;
  revealedAt: number | null;
  status: RoundStatus;
  guesses: Record<string, Guess>;
}

export interface PoolPhoto {
  url: string;
  used: boolean;
  approved?: boolean;
}

export type CurationVote = boolean; // true=beğen, false=ele

export interface CurationPhoto {
  ownerUid: string;
  index: string;
  url: string;
  approved?: boolean;
  isOwn: boolean;
}

export interface CurationState {
  votes: Record<string, Record<string, Record<string, boolean>>>;
  ready: Record<string, boolean>;
}
