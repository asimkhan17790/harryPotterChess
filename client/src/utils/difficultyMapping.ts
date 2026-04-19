export type Difficulty = 'easy' | 'medium' | 'hard';

interface DifficultyConfig {
  skillLevel: number;
  movetime: number;
}

const DIFFICULTY_MAP: Record<Difficulty, DifficultyConfig> = {
  easy: { skillLevel: 2, movetime: 300 },
  medium: { skillLevel: 10, movetime: 1000 },
  hard: { skillLevel: 20, movetime: 3000 },
};

export function difficultyToConfig(d: Difficulty): DifficultyConfig {
  return DIFFICULTY_MAP[d];
}
