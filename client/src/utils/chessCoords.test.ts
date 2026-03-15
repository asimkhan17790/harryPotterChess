import { describe, it, expect } from 'vitest';
import { squareToXZ, indicesToSquare, isLightSquare } from './chessCoords';

describe('squareToXZ', () => {
  it('maps a1 to (-3.5, 3.5) — white queen-rook corner', () => {
    expect(squareToXZ('a1')).toEqual([-3.5, 3.5]);
  });

  it('maps h8 to (3.5, -3.5) — black king-rook corner', () => {
    expect(squareToXZ('h8')).toEqual([3.5, -3.5]);
  });

  it('maps e4 correctly', () => {
    // file e = index 4 → x = 0.5 ; rank 4 − 1 = 3 → z = 3.5 − 3 = 0.5
    expect(squareToXZ('e4')).toEqual([0.5, 0.5]);
  });

  it('maps h1 to (3.5, 3.5)', () => {
    expect(squareToXZ('h1')).toEqual([3.5, 3.5]);
  });
});

describe('indicesToSquare', () => {
  it('converts (0, 0) → a1', () => expect(indicesToSquare(0, 0)).toBe('a1'));
  it('converts (7, 7) → h8', () => expect(indicesToSquare(7, 7)).toBe('h8'));
  it('converts (4, 3) → e4', () => expect(indicesToSquare(4, 3)).toBe('e4'));
});

describe('isLightSquare', () => {
  it('h1 is light', () => expect(isLightSquare('h1')).toBe(true));
  it('a1 is dark', () => expect(isLightSquare('a1')).toBe(false));
  it('a2 is light', () => expect(isLightSquare('a2')).toBe(true));
  it('h8 is dark', () => expect(isLightSquare('h8')).toBe(false));
  it('a8 is light', () => expect(isLightSquare('a8')).toBe(true));
});
