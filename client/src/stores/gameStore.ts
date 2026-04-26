import { create } from 'zustand';
import type { Difficulty } from '../utils/difficultyMapping';

export type GameMode = 'human' | 'ai' | null;

export type GameResult = {
  winner: 'w' | 'b' | null;
  reason: 'checkmate' | 'stalemate' | 'draw';
} | null;

interface GameState {
  gameMode: GameMode;
  aiColor: 'w' | 'b';
  difficulty: Difficulty;
  gameResult: GameResult;
  currentTurn: 'w' | 'b';
  moveHistory: string[];
  capturedByWhite: string[];
  capturedByBlack: string[];
  checkKingSquare: string | null;
  setMode: (m: GameMode) => void;
  setAiColor: (c: 'w' | 'b') => void;
  setDifficulty: (d: Difficulty) => void;
  setGameResult: (r: GameResult) => void;
  setCurrentTurn: (t: 'w' | 'b') => void;
  setMoveHistory: (h: string[]) => void;
  setCapturedByWhite: (c: string[]) => void;
  setCapturedByBlack: (c: string[]) => void;
  setCheckKingSquare: (sq: string | null) => void;
  reset: () => void;
}

const DEFAULTS = {
  gameMode: null as GameMode,
  aiColor: 'b' as const,
  difficulty: 'medium' as Difficulty,
  gameResult: null as GameResult,
  currentTurn: 'w' as const,
  moveHistory: [] as string[],
  capturedByWhite: [] as string[],
  capturedByBlack: [] as string[],
  checkKingSquare: null as string | null,
};

export const useGameStore = create<GameState>((set) => ({
  ...DEFAULTS,
  setMode: (gameMode) => set({ gameMode }),
  setAiColor: (aiColor) => set({ aiColor }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setGameResult: (gameResult) => set({ gameResult }),
  setCurrentTurn: (currentTurn) => set({ currentTurn }),
  setMoveHistory: (moveHistory) => set({ moveHistory }),
  setCapturedByWhite: (capturedByWhite) => set({ capturedByWhite }),
  setCapturedByBlack: (capturedByBlack) => set({ capturedByBlack }),
  setCheckKingSquare: (checkKingSquare) => set({ checkKingSquare }),
  reset: () => set({ ...DEFAULTS }),
}));
