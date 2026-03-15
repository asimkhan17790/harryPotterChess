import type { HouseName } from '../../../shared/src/index';

export type { HouseName };

export interface HouseTheme {
  name: HouseName;
  displayName: string;
  description: string;
  /** Three.js hex color for light board tiles */
  lightTile: number;
  /** Three.js hex color for dark board tiles */
  darkTile: number;
  /** Three.js hex color for selected tile highlight */
  selectedTile: number;
  /** Three.js hex color for legal-move dots */
  legalMove: number;
  /** Three.js hex color for scene background */
  sceneBg: number;
  /** Three.js hex color for ambient light tint */
  ambientLight: number;
  /** Three.js hex color for white pieces */
  pieceWhite: number;
  /** Three.js hex color for black pieces */
  pieceBlack: number;
  /** THREE.Points particle color on capture */
  captureParticleColor: number;
  /** PointLight color for floating candles */
  candleColor: number;
  /** CSS primary color (used in UI) */
  primaryColor: string;
  /** CSS secondary / accent color (used in UI) */
  secondaryColor: string;
  /** CSS border / highlight color */
  accentColor: string;
  /** Texture path prefix under /public/textures/ (currently unused — Phase 4) */
  texturePath: string;
}

export const HOUSE_THEMES: Record<HouseName, HouseTheme> = {
  gryffindor: {
    name: 'gryffindor',
    displayName: 'Gryffindor',
    description: 'Brave, daring, and chivalrous',
    lightTile: 0xe8d8b0,
    darkTile: 0x5c1a1a,
    selectedTile: 0xff8800,
    legalMove: 0xffaa00,
    sceneBg: 0x0d0500,
    ambientLight: 0xff8844,
    pieceWhite: 0xffd700,
    pieceBlack: 0x8b0000,
    captureParticleColor: 0xff4400,
    candleColor: 0xff8800,
    primaryColor: '#8b0000',
    secondaryColor: '#ffd700',
    accentColor: '#ff6600',
    texturePath: '/textures/gryffindor/',
  },
  slytherin: {
    name: 'slytherin',
    displayName: 'Slytherin',
    description: 'Cunning, ambitious, and resourceful',
    lightTile: 0xc8d0c0,
    darkTile: 0x0d2010,
    selectedTile: 0x00ee77,
    legalMove: 0x00cc55,
    sceneBg: 0x000a04,
    ambientLight: 0x44ff88,
    pieceWhite: 0xd0d0d0,
    pieceBlack: 0x1a3a1a,
    captureParticleColor: 0x00ff66,
    candleColor: 0x44ff88,
    primaryColor: '#1a4a1a',
    secondaryColor: '#c0c0c0',
    accentColor: '#00cc44',
    texturePath: '/textures/slytherin/',
  },
  ravenclaw: {
    name: 'ravenclaw',
    displayName: 'Ravenclaw',
    description: 'Wise, creative, and witty',
    lightTile: 0xd0cce0,
    darkTile: 0x08081e,
    selectedTile: 0x4499ff,
    legalMove: 0x2266cc,
    sceneBg: 0x00000d,
    ambientLight: 0x4466ff,
    pieceWhite: 0xcd7f32,
    pieceBlack: 0x000099,
    captureParticleColor: 0x4499ff,
    candleColor: 0x4466ff,
    primaryColor: '#000080',
    secondaryColor: '#cd7f32',
    accentColor: '#4488ff',
    texturePath: '/textures/ravenclaw/',
  },
  hufflepuff: {
    name: 'hufflepuff',
    displayName: 'Hufflepuff',
    description: 'Loyal, patient, and hardworking',
    lightTile: 0xf0e8c0,
    darkTile: 0x1a1200,
    selectedTile: 0xffee00,
    legalMove: 0xddcc00,
    sceneBg: 0x080600,
    ambientLight: 0xffee44,
    pieceWhite: 0xffee44,
    pieceBlack: 0x1a1a00,
    captureParticleColor: 0xffcc00,
    candleColor: 0xffee44,
    primaryColor: '#1a1a00',
    secondaryColor: '#ffee00',
    accentColor: '#cc9900',
    texturePath: '/textures/hufflepuff/',
  },
};
