import { describe, it, expect } from 'vitest';
import { difficultyToConfig } from '../utils/difficultyMapping';
import { clamp, prog } from '../utils/captureEffects';

describe('difficultyToConfig', () => {
  it('easy returns skillLevel 2 and movetime 300', () => {
    expect(difficultyToConfig('easy')).toEqual({ skillLevel: 2, movetime: 300 });
  });
  it('medium returns skillLevel 10 and movetime 1000', () => {
    expect(difficultyToConfig('medium')).toEqual({ skillLevel: 10, movetime: 1000 });
  });
  it('hard returns skillLevel 20 and movetime 3000', () => {
    expect(difficultyToConfig('hard')).toEqual({ skillLevel: 20, movetime: 3000 });
  });
});

describe('clamp', () => {
  it('returns value within range unchanged', () => expect(clamp(5, 0, 10)).toBe(5));
  it('clamps to min when below', () => expect(clamp(-1, 0, 10)).toBe(0));
  it('clamps to max when above', () => expect(clamp(11, 0, 10)).toBe(10));
  it('handles min === max', () => expect(clamp(5, 3, 3)).toBe(3));
});

describe('prog', () => {
  it('returns 0.5 at midpoint', () => expect(prog(0.5, 0, 1)).toBeCloseTo(0.5));
  it('clamps to 0 before start', () => expect(prog(-1, 0, 1)).toBe(0));
  it('clamps to 1 after end', () => expect(prog(2, 0, 1)).toBe(1));
});
