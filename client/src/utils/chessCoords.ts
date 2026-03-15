import type { Square } from 'chess.js';

/**
 * Convert an algebraic square to Three.js world XZ coordinates.
 * Camera sits at positive Z → rank 1 (white back rank) is at z = +3.5.
 *
 *   file: a=0 … h=7  → x = file − 3.5
 *   rank: 1=0 … 8=7  → z = 3.5 − rank
 */
export function squareToXZ(square: Square): [x: number, z: number] {
  const file = square.charCodeAt(0) - 97; // 'a' = 97
  const rank = parseInt(square[1]) - 1;
  return [file - 3.5, 3.5 - rank];
}

/**
 * Convert zero-based (file, rank) indices to an algebraic square.
 *   file 0 = 'a', rank 0 = '1'
 */
export function indicesToSquare(file: number, rank: number): Square {
  return `${'abcdefgh'[file]}${rank + 1}` as Square;
}

/**
 * True when a square should be light-coloured.
 * h1 (the bottom-right from White's perspective) is always light.
 */
export function isLightSquare(square: Square): boolean {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1]) - 1;
  return (file + rank) % 2 === 1;
}
