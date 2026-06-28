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
}
