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
  setMode: (m: GameMode) => void;
  setAiColor: (c: 'w' | 'b') => void;
  setDifficulty: (d: Difficulty) => void;
  setGameResult: (r: GameResult) => void;
  setCurrentTurn: (t: 'w' | 'b') => void;
  reset: () => void;
}

const DEFAULTS = {
  gameMode: null as GameMode,
  aiColor: 'b' as const,
  difficulty: 'medium' as Difficulty,
  gameResult: null as GameResult,
  currentTurn: 'w' as const,
};

export const useGameStore = create<GameState>((set) => ({
  ...DEFAULTS,
  setMode: (gameMode) => set({ gameMode }),
  setAiColor: (aiColor) => set({ aiColor }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setGameResult: (gameResult) => set({ gameResult }),
  setCurrentTurn: (currentTurn) => set({ currentTurn }),
  reset: () => set({ ...DEFAULTS }),
}));
