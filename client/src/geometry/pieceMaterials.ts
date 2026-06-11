/**
 * pieceMaterials — PBR material factories + unified shader injector for chess pieces.
 *
 * Look: carved marble (white side) vs dark obsidian stone (black side), with
 * metallic trim (gold / house accent). Marble veining is 3D procedural fbm noise
 * sampled at object-local position — merged piece geometry has per-primitive UVs
 * with mismatched scale/orientation, so any UV-based texturing would seam at
 * every primitive boundary. Object-space 3D noise needs no UVs and no textures.
 *
 * All shader features (marble + weathering + rim Fresnel) live in ONE
 * onBeforeCompile callback: assigning onBeforeCompile twice clobbers the first,
 * and Material.clone() drops it entirely — callers must never clone these
 * materials (mutate emissive for highlights instead).
 */

import * as THREE from 'three';
import type { Color } from 'chess.js';
import type { HouseName } from '../../../shared/src/index';

// Mirrors the mobile check in ChessScene — fewer fbm octaves on small GPUs.
const IS_MOBILE =
  typeof window !== 'undefined' &&
  (window.matchMedia('(max-width: 900px)').matches || 'ontouchstart' in window);

const FBM_OCTAVES = IS_MOBILE ? 3 : 4;

// ── Uniform handles returned to callers for animation ───────────────────────

export interface RimUniforms {
  uRimColor: { value: THREE.Color };
  uRimIntensity: { value: number };
}

// ── Stone / trim palettes ────────────────────────────────────────────────────

interface StoneConfig {
  base: number;
  vein: number;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  veinStrength: number;
}

const STONE: Record<'w' | 'b', StoneConfig> = {
  // White: aged ivory marble, soft grey veining
  w: {
    base: 0xf2eee4,
    vein: 0xb9b0a0,
    roughness: 0.45,
    metalness: 0.02,
    envMapIntensity: 0.7,
    veinStrength: 0.55,
  },
  // Black: near-black obsidian, faint lighter veining
  b: {
    base: 0x1c1c20,
    vein: 0x3a3a42,
    roughness: 0.3,
    metalness: 0.05,
    envMapIntensity: 1.0,
    veinStrength: 0.7,
  },
};

// House flavour for the black side lives in the veining, not the body colour —
// keeps the obsidian read while still telling houses apart.
const HOUSE_VEIN_BLACK: Record<HouseName, number> = {
  gryffindor: 0x4a1a14,
  slytherin: 0x14381e,
  ravenclaw: 0x1a2450,
  hufflepuff: 0x4a3c14,
};

interface TrimConfig {
  color: number;
  roughness: number;
  metalness: number;
  emissive: number;
  emissiveIntensity: number;
}

// White side always gold; black side defaults to silver, house accent if set.
const TRIM_WHITE: TrimConfig = {
  color: 0xc9a227,
  roughness: 0.25,
  metalness: 0.9,
  emissive: 0x6b520e,
  emissiveIntensity: 0.18,
};
const TRIM_BLACK_DEFAULT: TrimConfig = {
  color: 0xb8bcc4,
  roughness: 0.3,
  metalness: 0.9,
  emissive: 0x2a2d33,
  emissiveIntensity: 0.12,
};
const TRIM_BLACK_HOUSE: Record<HouseName, number> = {
  gryffindor: 0xd3a625, // gold
  slytherin: 0xc0c8cc, // silver
  ravenclaw: 0xcd7f32, // bronze
  hufflepuff: 0xe6c84a, // brass-yellow
};

// ── GLSL: 3D value noise + fbm + marble/weathering/rim chunks ────────────────

const NOISE_GLSL = /* glsl */ `
float pieceHash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float pieceVNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(pieceHash3(i + vec3(0,0,0)), pieceHash3(i + vec3(1,0,0)), f.x),
        mix(pieceHash3(i + vec3(0,1,0)), pieceHash3(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(pieceHash3(i + vec3(0,0,1)), pieceHash3(i + vec3(1,0,1)), f.x),
        mix(pieceHash3(i + vec3(0,1,1)), pieceHash3(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float pieceFbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < PIECE_FBM_OCTAVES; i++) {
    v += a * pieceVNoise(p);
    p = p * 2.03 + 19.19;
    a *= 0.5;
  }
  return v;
}
`;

// Computed in the color chunk, consumed again in the roughness chunk.
const MARBLE_GLOBALS = /* glsl */ `
float gPieceVein = 0.0;
float gPieceGrime = 0.0;
`;

const MARBLE_COLOR_CHUNK = /* glsl */ `
{
  vec3 mp = vObjPos * uStoneScale;
  float warp = pieceFbm(mp);
  float band = sin((vObjPos.y * 5.0 + warp * 5.5) * 2.2 + warp * 3.0);
  gPieceVein = smoothstep(0.62, 0.97, abs(band)) * uVeinStrength;
  diffuseColor.rgb = mix(diffuseColor.rgb, uVeinColor, gPieceVein);

  // Weathering: grime gathering at the base + broad faint stains
  gPieceGrime = smoothstep(0.3, 0.0, vObjPos.y) * 0.16;
  float stain = (pieceFbm(mp * 0.45 + 31.7) - 0.5) * 0.1;
  diffuseColor.rgb *= 1.0 - gPieceGrime + stain;
}
`;

const MARBLE_ROUGHNESS_CHUNK = /* glsl */ `
roughnessFactor = clamp(roughnessFactor - gPieceVein * 0.12 + gPieceGrime * 0.25, 0.05, 1.0);
`;

const RIM_CHUNK = /* glsl */ `
vec3 rimViewDir = normalize(vViewPosition);
float rim = 1.0 - max(dot(rimViewDir, normalize(vNormal)), 0.0);
rim = pow(rim, 3.0);
outgoingLight += uRimColor * rim * uRimIntensity;
`;

// ── Unified shader injector ──────────────────────────────────────────────────

export interface PieceShaderOpts {
  /** Marble veining + weathering. Omit for trim (rim-only) materials. */
  marble?: {
    veinColor: THREE.Color;
    veinStrength: number;
    /** Noise frequency in object units. Pieces are ~1 unit tall. */
    scale: number;
  };
}

/**
 * Injects marble/weathering and the Fresnel rim-light into a
 * MeshStandardMaterial via a single onBeforeCompile callback.
 * Returns the rim uniform handles for animation (selection glow).
 */
export function injectPieceShader(
  mat: THREE.MeshStandardMaterial,
  opts: PieceShaderOpts = {},
  sharedRim?: RimUniforms,
): RimUniforms {
  // Sharing rim uniform objects across a piece's stone + trim materials lets
  // one GSAP tween drive the glow on both.
  const rim: RimUniforms = sharedRim ?? {
    uRimColor: { value: new THREE.Color(0x4488ff) },
    uRimIntensity: { value: 0.0 },
  };
  const marble = opts.marble;
  const marbleUniforms = marble
    ? {
        uVeinColor: { value: marble.veinColor },
        uVeinStrength: { value: marble.veinStrength },
        uStoneScale: { value: marble.scale },
      }
    : null;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = rim.uRimColor;
    shader.uniforms.uRimIntensity = rim.uRimIntensity;

    let fragPrelude = `uniform vec3 uRimColor;\nuniform float uRimIntensity;\n`;

    if (marbleUniforms) {
      Object.assign(shader.uniforms, marbleUniforms);
      fragPrelude +=
        `#define PIECE_FBM_OCTAVES ${FBM_OCTAVES}\n` +
        `uniform vec3 uVeinColor;\nuniform float uVeinStrength;\nuniform float uStoneScale;\n` +
        `varying vec3 vObjPos;\n` +
        NOISE_GLSL +
        MARBLE_GLOBALS;

      // Object-space position varying (geometry is pre-baked into piece-local space)
      shader.vertexShader = `varying vec3 vObjPos;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvObjPos = transformed;`,
      );

      shader.fragmentShader = shader.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>\n${MARBLE_COLOR_CHUNK}`)
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>\n${MARBLE_ROUGHNESS_CHUNK}`,
        );
    }

    shader.fragmentShader = fragPrelude + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `${RIM_CHUNK}\n#include <dithering_fragment>`,
    );
  };
  // One compiled program shared across all pieces of the same variant —
  // uniforms stay per-material, so animation is still independent.
  mat.customProgramCacheKey = () => `piece-${marble ? 'stone' : 'trim'}-v1-oct${FBM_OCTAVES}`;
  mat.needsUpdate = true;
  return rim;
}

// ── Material factories ───────────────────────────────────────────────────────

/** Carved stone body material: marble (white) / obsidian (black). */
export function createStoneMaterial(
  side: Color,
  house: HouseName | null = null,
  envMap: THREE.Texture | null = null,
  sharedRim?: RimUniforms,
): { material: THREE.MeshStandardMaterial; rimUniforms: RimUniforms } {
  const cfg = STONE[side];
  const veinHex = side === 'b' && house ? HOUSE_VEIN_BLACK[house] : cfg.vein;

  const material = new THREE.MeshStandardMaterial({
    color: cfg.base,
    roughness: cfg.roughness,
    metalness: cfg.metalness,
    envMap: envMap ?? undefined,
    envMapIntensity: cfg.envMapIntensity,
  });
  const rimUniforms = injectPieceShader(
    material,
    {
      marble: {
        veinColor: new THREE.Color(veinHex),
        veinStrength: cfg.veinStrength,
        scale: 4.0,
      },
    },
    sharedRim,
  );
  return { material, rimUniforms };
}

/** Metallic trim material: gold (white side) / silver or house accent (black). */
export function createTrimMaterial(
  side: Color,
  house: HouseName | null = null,
  envMap: THREE.Texture | null = null,
  sharedRim?: RimUniforms,
): { material: THREE.MeshStandardMaterial; rimUniforms: RimUniforms } {
  const cfg: TrimConfig =
    side === 'w'
      ? TRIM_WHITE
      : house
        ? { ...TRIM_BLACK_DEFAULT, color: TRIM_BLACK_HOUSE[house] }
        : TRIM_BLACK_DEFAULT;

  const material = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: cfg.roughness,
    metalness: cfg.metalness,
    emissive: cfg.emissive,
    emissiveIntensity: cfg.emissiveIntensity,
    envMap: envMap ?? undefined,
    envMapIntensity: 1.2,
  });
  const rimUniforms = injectPieceShader(material, {}, sharedRim);
  return { material, rimUniforms };
}
