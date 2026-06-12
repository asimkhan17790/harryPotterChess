import type { PieceSymbol } from 'chess.js';

/**
 * Per-piece movement weight profiles.
 *
 * Each piece type moves with its own physicality: pawns hop briskly, the
 * knight's horse gallops in a high arc, robed bishops and queens glide,
 * and the heavy rook and king slide low with a landing thud.
 */
export interface MoveProfile {
  /** Peak lift height of the travel arc (world units). */
  arc: number;
  /** Duration of the lift-off tween (s). */
  liftDur: number;
  /** Horizontal travel duration (s). Captures run slightly faster. */
  travelDur: number;
  /** GSAP ease for the horizontal travel. */
  travelEase: string;
  /** Mid-air body bob amplitude (0 disables the bob). */
  gallopAmp: number;
  /** Mid-air bob frequency (rad/s). */
  gallopFreq: number;
  /** Landing squash-and-stretch intensity (0..1 scales the scale tweens). */
  squash: number;
  /** Camera shake intensity on landing (0 disables). */
  landShake: number;
}

export const MOVE_PROFILES: Record<PieceSymbol, MoveProfile> = {
  // Pawn — light, eager hop
  p: {
    arc: 0.9,
    liftDur: 0.14,
    travelDur: 0.36,
    travelEase: 'power2.inOut',
    gallopAmp: 0.02,
    gallopFreq: 22,
    squash: 1.0,
    landShake: 0,
  },
  // Knight — high galloping leap (legs animate separately)
  n: {
    arc: 1.8,
    liftDur: 0.18,
    travelDur: 0.42,
    travelEase: 'power2.inOut',
    gallopAmp: 0.025,
    gallopFreq: 18,
    squash: 0.8,
    landShake: 0.04,
  },
  // Bishop — robes glide on a long low arc
  b: {
    arc: 0.5,
    liftDur: 0.2,
    travelDur: 0.5,
    travelEase: 'power1.inOut',
    gallopAmp: 0,
    gallopFreq: 0,
    squash: 0.3,
    landShake: 0,
  },
  // Queen — regal, almost frictionless glide
  q: {
    arc: 0.4,
    liftDur: 0.22,
    travelDur: 0.55,
    travelEase: 'power1.inOut',
    gallopAmp: 0,
    gallopFreq: 0,
    squash: 0.25,
    landShake: 0,
  },
  // Rook — massive tower drags low and lands heavy
  r: {
    arc: 0.15,
    liftDur: 0.12,
    travelDur: 0.55,
    travelEase: 'power2.inOut',
    gallopAmp: 0,
    gallopFreq: 0,
    squash: 0.2,
    landShake: 0.06,
  },
  // King — slowest, heaviest slide
  k: {
    arc: 0.18,
    liftDur: 0.16,
    travelDur: 0.6,
    travelEase: 'power1.inOut',
    gallopAmp: 0,
    gallopFreq: 0,
    squash: 0.2,
    landShake: 0.07,
  },
};
