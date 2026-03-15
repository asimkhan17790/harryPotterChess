/**
 * Chess piece cross-section profiles for THREE.LatheGeometry.
 * Each point is [radius, height] in Three.js units.
 * The LatheGeometry rotates these 360° around the Y axis.
 */

export interface PieceProfile {
  points: [number, number][];
  /** Height of the tallest point — used to centre the mesh on the board. */
  height: number;
  /** Lathe segments (higher = smoother). */
  segments: number;
}

export const PIECE_PROFILES: Record<string, PieceProfile> = {
  p: {
    // Pawn — squat ball on a narrow stem
    points: [
      [0.0, 0.0],
      [0.28, 0.0],
      [0.3, 0.04],
      [0.22, 0.08],
      [0.18, 0.12],
      [0.12, 0.14],
      [0.1, 0.18],
      [0.08, 0.22],
      [0.14, 0.26],
      [0.18, 0.32],
      [0.2, 0.38],
      [0.18, 0.44],
      [0.14, 0.48],
      [0.1, 0.52],
      [0.08, 0.54],
      [0.16, 0.58],
      [0.18, 0.62],
      [0.16, 0.66],
      [0.1, 0.68],
      [0.0, 0.7],
    ],
    height: 0.7,
    segments: 20,
  },

  r: {
    // Rook — straight shaft, wide battlement top
    points: [
      [0.0, 0.0],
      [0.32, 0.0],
      [0.34, 0.04],
      [0.28, 0.08],
      [0.24, 0.14],
      [0.2, 0.16],
      [0.2, 0.52],
      [0.24, 0.54],
      [0.28, 0.58],
      [0.28, 0.74],
      [0.0, 0.74],
    ],
    height: 0.74,
    segments: 20,
  },

  n: {
    // Knight — simplified horse-head proxy (real silhouette via SVG extrude isn't
    // possible without a DOM, so we use an elongated angular lathe that reads
    // as a knight from above. GLTF swap replaces this at runtime when available.)
    points: [
      [0.0, 0.0],
      [0.3, 0.0],
      [0.32, 0.04],
      [0.26, 0.08],
      [0.2, 0.14],
      [0.14, 0.18],
      [0.1, 0.28],
      [0.08, 0.4],
      [0.1, 0.5],
      [0.16, 0.58],
      [0.2, 0.64],
      [0.22, 0.7],
      [0.2, 0.78],
      [0.16, 0.82],
      [0.08, 0.86],
      [0.0, 0.88],
    ],
    height: 0.88,
    segments: 10, // fewer segments = faceted, angular look
  },

  b: {
    // Bishop — tall narrow body with pointed mitre top
    points: [
      [0.0, 0.0],
      [0.3, 0.0],
      [0.32, 0.04],
      [0.24, 0.08],
      [0.18, 0.14],
      [0.1, 0.16],
      [0.08, 0.22],
      [0.1, 0.28],
      [0.14, 0.36],
      [0.16, 0.44],
      [0.14, 0.52],
      [0.1, 0.58],
      [0.06, 0.64],
      [0.1, 0.7],
      [0.12, 0.74],
      [0.1, 0.8],
      [0.04, 0.86],
      [0.02, 0.9],
      [0.0, 0.92],
    ],
    height: 0.92,
    segments: 20,
  },

  q: {
    // Queen — curvy body with wide crown rim
    points: [
      [0.0, 0.0],
      [0.34, 0.0],
      [0.36, 0.04],
      [0.28, 0.1],
      [0.22, 0.16],
      [0.16, 0.18],
      [0.14, 0.26],
      [0.18, 0.34],
      [0.22, 0.44],
      [0.24, 0.52],
      [0.22, 0.58],
      [0.16, 0.64],
      [0.12, 0.68],
      [0.2, 0.74],
      [0.24, 0.78],
      [0.24, 0.82],
      [0.0, 0.82],
    ],
    height: 0.82,
    segments: 24,
  },

  k: {
    // King — same as queen but taller, with flat crown platform
    points: [
      [0.0, 0.0],
      [0.36, 0.0],
      [0.38, 0.04],
      [0.3, 0.1],
      [0.24, 0.16],
      [0.18, 0.18],
      [0.16, 0.28],
      [0.2, 0.38],
      [0.24, 0.48],
      [0.26, 0.56],
      [0.22, 0.62],
      [0.16, 0.66],
      [0.14, 0.7],
      [0.22, 0.76],
      [0.26, 0.8],
      [0.26, 0.86],
      [0.0, 0.86],
    ],
    height: 0.86,
    segments: 24,
  },
};
