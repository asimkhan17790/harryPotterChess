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

// ── Rook: armored warrior on octagonal pedestal ──────────────────────────────

/**
 * Builds a rook as a crouching armored warrior on a stepped octagonal base,
 * inspired by the Harry Potter wizard chess set aesthetic.
 * All sub-meshes share the same material instance passed in.
 */
export function buildRookGroup(mat: THREE.MeshStandardMaterial): THREE.Group {
  const g = new THREE.Group();

  const add = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  // ── Pedestal: two stepped octagonal tiers ────────────────────────────────
  // Bottom tier — wide, thin
  add(new THREE.CylinderGeometry(0.34, 0.36, 0.08, 8), 0, 0.04);
  // Middle tier — narrower
  add(new THREE.CylinderGeometry(0.28, 0.32, 0.07, 8), 0, 0.115);
  // Top platform
  add(new THREE.CylinderGeometry(0.24, 0.26, 0.06, 8), 0, 0.18);

  // ── Torso: crouching, broad warrior body ─────────────────────────────────
  // Main body — slightly forward lean via z-offset on a box
  add(new THREE.BoxGeometry(0.3, 0.28, 0.22), 0, 0.37, 0.02);
  // Back plate / backpack hump — thicker behind
  add(new THREE.BoxGeometry(0.24, 0.2, 0.1), 0, 0.38, -0.1);
  // Belt / waist band
  add(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 8), 0, 0.245);
  // Chainmail skirt flair at hips
  add(new THREE.CylinderGeometry(0.2, 0.22, 0.06, 8), 0, 0.215);

  // ── Arms ─────────────────────────────────────────────────────────────────
  // Left upper arm
  add(new THREE.CylinderGeometry(0.055, 0.065, 0.18, 7), -0.19, 0.37, 0.0, 0, 0, 0.55);
  // Left forearm (angled down, resting on base)
  add(new THREE.CylinderGeometry(0.045, 0.055, 0.16, 7), -0.24, 0.26, 0.06, 0, 0, 0.9);
  // Right arm stub (hidden behind shield)
  add(new THREE.CylinderGeometry(0.055, 0.065, 0.14, 7), 0.17, 0.37, 0.0, 0, 0, -0.45);

  // ── Shield — large round-top oval disc on the left arm ───────────────────
  // Outer shield face (wide flat disc)
  const shieldOuter = new THREE.CylinderGeometry(0.22, 0.22, 0.025, 14);
  add(shieldOuter, -0.26, 0.4, -0.04, Math.PI / 2, 0.3, -0.15);
  // Shield boss (central raised dome)
  add(new THREE.SphereGeometry(0.055, 8, 6), -0.3, 0.41, -0.14);
  // Shield rim edge
  const shieldRim = new THREE.TorusGeometry(0.21, 0.018, 6, 16);
  add(shieldRim, -0.26, 0.4, -0.04, Math.PI / 2, 0.3, -0.15);

  // ── Helmet ────────────────────────────────────────────────────────────────
  // Dome
  add(new THREE.SphereGeometry(0.115, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, 0.56, 0.0);
  // Wide flat brim
  add(new THREE.CylinderGeometry(0.16, 0.155, 0.03, 10), 0, 0.555, 0.0);
  // Face guard — small flat plate
  add(new THREE.BoxGeometry(0.08, 0.06, 0.025), 0, 0.52, 0.1);

  return g;
}

// ── King: tall armored knight standing upright ───────────────────────────────

/**
 * Builds a king as a tall standing armored knight — full plate/chainmail,
 * crossed arms holding weapons, flowing cape, visored great helm with crown.
 * Inspired by the Harry Potter wizard chess king piece.
 */
export function buildKingGroup(mat: THREE.MeshStandardMaterial): THREE.Group {
  const g = new THREE.Group();

  const add = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  // Gold accent material for crown
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.9,
    roughness: 0.1,
  });
  const addGold = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, goldMat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
  };

  // ── Ornate tiered base ────────────────────────────────────────────────────
  add(new THREE.CylinderGeometry(0.33, 0.36, 0.07, 8), 0, 0.035); // bottom slab
  add(new THREE.CylinderGeometry(0.27, 0.31, 0.06, 8), 0, 0.095); // mid tier
  add(new THREE.CylinderGeometry(0.22, 0.25, 0.05, 8), 0, 0.148); // top platform

  // ── Chainmail skirt / lower robes ─────────────────────────────────────────
  // Wide flared skirt from hips to ankles
  add(new THREE.CylinderGeometry(0.18, 0.22, 0.32, 10), 0, 0.34);
  // Inner skirt layer (slightly narrower, decorative depth)
  add(new THREE.CylinderGeometry(0.14, 0.17, 0.28, 10), 0, 0.32);
  // Belt / waist cinch
  add(new THREE.CylinderGeometry(0.155, 0.165, 0.045, 10), 0, 0.498);

  // ── Torso: broad plate armour ─────────────────────────────────────────────
  // Main chest plate
  add(new THREE.BoxGeometry(0.28, 0.3, 0.2), 0, 0.67, 0.01);
  // Back plate
  add(new THREE.BoxGeometry(0.24, 0.26, 0.08), 0, 0.67, -0.1);
  // Pauldron left shoulder guard
  add(new THREE.SphereGeometry(0.085, 8, 6), -0.175, 0.8, 0.0);
  // Pauldron right shoulder guard
  add(new THREE.SphereGeometry(0.085, 8, 6), 0.175, 0.8, 0.0);

  // ── Cape / cloak flowing behind ───────────────────────────────────────────
  // Cape body — wide flat box angled slightly outward
  add(new THREE.BoxGeometry(0.3, 0.5, 0.06), 0, 0.55, -0.13);
  // Cape lower flare (wider at bottom)
  add(new THREE.BoxGeometry(0.34, 0.1, 0.05), 0, 0.3, -0.14);

  // ── Crossed arms holding weapons ─────────────────────────────────────────
  // Left upper arm (angled inward across chest)
  add(new THREE.CylinderGeometry(0.048, 0.058, 0.2, 7), -0.12, 0.73, 0.05, 0, 0, 0.9);
  // Left forearm (crossing right)
  add(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 7), 0.02, 0.65, 0.06, 0, 0, 0.6);
  // Right upper arm (angled inward across chest)
  add(new THREE.CylinderGeometry(0.048, 0.058, 0.2, 7), 0.12, 0.73, 0.05, 0, 0, -0.9);
  // Right forearm (crossing left)
  add(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 7), -0.02, 0.65, 0.06, 0, 0, -0.6);

  // ── Weapons (crossed swords / sceptre) ───────────────────────────────────
  // Left sword blade (thin tall box, angled)
  add(new THREE.BoxGeometry(0.025, 0.3, 0.018), -0.1, 0.52, 0.07, 0, 0, 0.25);
  // Right sword/sceptre blade
  add(new THREE.BoxGeometry(0.025, 0.3, 0.018), 0.1, 0.52, 0.07, 0, 0, -0.25);
  // Crossguard left
  add(new THREE.BoxGeometry(0.1, 0.022, 0.022), -0.1, 0.44, 0.07);
  // Crossguard right
  add(new THREE.BoxGeometry(0.1, 0.022, 0.022), 0.1, 0.44, 0.07);

  // ── Great helm / visored helmet ───────────────────────────────────────────
  // Neck guard (gorget)
  add(new THREE.CylinderGeometry(0.085, 0.1, 0.07, 10), 0, 0.865);
  // Helm dome (full sphere top)
  add(new THREE.SphereGeometry(0.115, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), 0, 0.935, 0.0);
  // Helm face plate (flat front visor)
  add(new THREE.BoxGeometry(0.115, 0.1, 0.025), 0, 0.9, 0.108);
  // Visor slit (recessed bar — slightly inset)
  add(new THREE.BoxGeometry(0.085, 0.018, 0.012), 0, 0.908, 0.118);
  // Helm brim / aventail
  add(new THREE.CylinderGeometry(0.135, 0.13, 0.028, 12), 0, 0.875);

  // ── Crown atop helm ───────────────────────────────────────────────────────
  const crownRimY = 0.998;
  addGold(new THREE.CylinderGeometry(0.108, 0.112, 0.035, 12), 0, crownRimY);
  // 5 crown points
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    addGold(
      new THREE.ConeGeometry(0.022, 0.075, 6),
      Math.cos(a) * 0.09,
      crownRimY + 0.055,
      Math.sin(a) * 0.09,
    );
  }

  return g;
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

  // Rook and king use composite warrior groups instead of lathe profiles.
  if (type === 'r') return buildRookGroup(mat);
  if (type === 'k') return buildKingGroup(mat);

  const profile = PIECE_PROFILES[type];
  const geo = buildLatheGeometry(type);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = false;

  const group = new THREE.Group();
  group.add(mesh);

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
