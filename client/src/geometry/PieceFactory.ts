/**
 * PieceFactory — builds Three.js meshes for chess pieces.
 *
 * Each piece type uses LatheGeometry derived from its cross-section profile.
 * King and queen get an extra cross / crown extruded on top via merged geometry.
 * PBR materials are keyed on piece colour (w/b) and optionally house name.
 */

import * as THREE from 'three';
import type { Color, PieceSymbol } from 'chess.js';
import { PIECE_PROFILES } from './chessPieceProfiles';
import type { HouseName } from '../../../shared/src/index';

// ── Material configs ─────────────────────────────────────────────────────────

interface MaterialConfig {
  color: number;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
}

// White pieces are always ivory/cream — house accent is the subtle tint on black pieces only.
const BASE_MATERIALS: Record<'w' | 'b', MaterialConfig> = {
  w: { color: 0xf0ece0, roughness: 0.2, metalness: 0.65, envMapIntensity: 1.4 },
  b: { color: 0x111111, roughness: 0.2, metalness: 0.85, envMapIntensity: 1.8 },
};

// Applied only to BLACK pieces to give them a house-flavoured dark tint.
const HOUSE_OVERRIDES_BLACK: Record<HouseName, Partial<MaterialConfig>> = {
  gryffindor: { color: 0x3a0000, metalness: 0.75, roughness: 0.25 },
  slytherin: { color: 0x001a00, metalness: 0.9, roughness: 0.15 },
  ravenclaw: { color: 0x00002a, metalness: 0.8, roughness: 0.2 },
  hufflepuff: { color: 0x1a1400, metalness: 0.7, roughness: 0.3 },
};

// ── Geometry helpers ─────────────────────────────────────────────────────────

function buildLatheGeometry(type: PieceSymbol): THREE.BufferGeometry {
  const profile = PIECE_PROFILES[type];
  const vectors = profile.points.map(([r, h]) => new THREE.Vector2(r, h));
  const geo = new THREE.LatheGeometry(vectors, profile.segments);
  geo.computeVertexNormals();
  return geo;
}

/** Adds a king cross (vertical + horizontal bar) merged on top of the lathe mesh. */
function addKingCross(group: THREE.Group, topY: number): void {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
  const vertGeo = new THREE.BoxGeometry(0.06, 0.22, 0.06);
  const horizGeo = new THREE.BoxGeometry(0.18, 0.06, 0.06);
  const vert = new THREE.Mesh(vertGeo, mat);
  const horiz = new THREE.Mesh(horizGeo, mat);
  vert.position.y = topY + 0.11;
  horiz.position.y = topY + 0.18;
  group.add(vert, horiz);
}

/** Adds 5 crown spike points around the queen rim. */
function addQueenCrown(group: THREE.Group, rimY: number, rimR: number): void {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
  const spikeCount = 5;
  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI * 2;
    const geo = new THREE.ConeGeometry(0.04, 0.12, 6);
    const spike = new THREE.Mesh(geo, mat);
    spike.position.set(Math.cos(angle) * (rimR * 0.8), rimY + 0.06, Math.sin(angle) * (rimR * 0.8));
    group.add(spike);
  }
}

// ── Public factory ────────────────────────────────────────────────────────────

/**
 * Returns a THREE.Group containing the piece mesh (and decorations for k/q).
 * Caller is responsible for positioning the group.
 */
export function createPieceGroup(
  type: PieceSymbol,
  side: Color,
  house: HouseName | null = null,
  envMap: THREE.Texture | null = null,
): THREE.Group {
  const profile = PIECE_PROFILES[type];
  const geo = buildLatheGeometry(type);

  const base = { ...BASE_MATERIALS[side] };
  // Only tint black pieces with the house colour; white stays ivory.
  if (side === 'b' && house && HOUSE_OVERRIDES_BLACK[house]) {
    Object.assign(base, HOUSE_OVERRIDES_BLACK[house]);
  }

  const mat = new THREE.MeshStandardMaterial({
    color: base.color,
    roughness: base.roughness,
    metalness: base.metalness,
    envMap: envMap ?? undefined,
    envMapIntensity: base.envMapIntensity,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = false;

  const group = new THREE.Group();
  group.add(mesh);

  if (type === 'k') addKingCross(group, profile.height);
  if (type === 'q') addQueenCrown(group, profile.height, 0.24);

  return group;
}

/** Dispose all geometries and materials inside a piece group. */
export function disposePieceGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}
