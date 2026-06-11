/**
 * PieceFactory — builds Three.js meshes for chess pieces.
 *
 * Each piece type uses LatheGeometry derived from its cross-section profile.
 * King and queen get an extra cross / crown extruded on top via merged geometry.
 * PBR materials are keyed on piece colour (w/b) and optionally house name.
 */

import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';
import type { Color, PieceSymbol } from 'chess.js';
import { PIECE_PROFILES } from './chessPieceProfiles';
import type { HouseName } from '../../../shared/src/index';
import { createStoneMaterial, createTrimMaterial } from './pieceMaterials';
import type { RimUniforms } from './pieceMaterials';

export type { RimUniforms } from './pieceMaterials';

/** The two materials every piece is sculpted from: carved stone + metallic trim. */
export interface PieceMats {
  stone: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
}

// ── Geometry merge helper ─────────────────────────────────────────────────────

/**
 * Takes a THREE.Group built from many sub-meshes (all sharing one material),
 * bakes each sub-mesh's world transform into its geometry, merges everything
 * into a single BufferGeometry, and returns a new single-mesh Group.
 * This collapses N draw calls → 1 draw call per piece.
 */
function mergeGroupToSingleMesh(group: THREE.Group, mat: THREE.MeshStandardMaterial): THREE.Group {
  group.updateMatrixWorld(true);

  const geos: THREE.BufferGeometry[] = [];
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geo = child.geometry.clone() as THREE.BufferGeometry;
      geo.applyMatrix4(child.matrixWorld);
      geos.push(geo);
    }
  });

  const merged = mergeBufferGeometries(geos, false);
  // Dispose intermediates
  for (const geo of geos) geo.dispose();

  const result = new THREE.Group();
  if (merged) {
    merged.computeVertexNormals();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    result.add(mesh);
  }
  return result;
}

/**
 * Merges the stone group and the trim group separately (one draw call per
 * material) and returns a single Group containing both meshes.
 * Skips the trim merge when the trim group is empty.
 */
function mergeStoneAndTrim(gStone: THREE.Group, gTrim: THREE.Group, mats: PieceMats): THREE.Group {
  const result = mergeGroupToSingleMesh(gStone, mats.stone);
  let hasTrim = false;
  gTrim.traverse((c) => {
    if (c instanceof THREE.Mesh) hasTrim = true;
  });
  if (hasTrim) {
    const trimMerged = mergeGroupToSingleMesh(gTrim, mats.trim);
    for (const c of [...trimMerged.children]) result.add(c);
  }
  return result;
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

function buildLatheGeometry(type: PieceSymbol): THREE.BufferGeometry {
  const profile = PIECE_PROFILES[type];
  const vectors = profile.points.map(([r, h]) => new THREE.Vector2(r, h));
  const geo = new THREE.LatheGeometry(vectors, profile.segments);
  geo.computeVertexNormals();
  return geo;
}

/** Smooth revolve from [radius, y] profile points — robes, towers, plinths. */
function latheFromPoints(points: [number, number][], segments = 24): THREE.BufferGeometry {
  const vectors = points.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(vectors, segments);
  geo.computeVertexNormals();
  return geo;
}

// ── Rook: armored warrior on octagonal pedestal ──────────────────────────────

/**
 * Builds a rook as a tall tapered castle tower with banded stonework rings,
 * four corner battlements at the top, and an armored knight standing on the
 * parapet pointing forward — HP wizard chess aesthetic.
 * White faces -Z (toward opponent); pass facingAngleY=0 for black.
 */
export function buildRookGroup(mats: PieceMats, facingAngleY = 0): THREE.Group {
  const mat = mats.stone;
  const g = new THREE.Group();
  const gTrim = new THREE.Group();

  const add = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const addT = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mats.trim);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    gTrim.add(m);
    return m;
  };

  // ── Octagonal stepped base ────────────────────────────────────────────────
  add(new THREE.CylinderGeometry(0.36, 0.38, 0.06, 8), 0, 0.03);
  add(new THREE.CylinderGeometry(0.3, 0.34, 0.055, 8), 0, 0.085);
  add(new THREE.CylinderGeometry(0.25, 0.28, 0.05, 8), 0, 0.135);

  // ── Tower body: single smooth lathe with entasis (subtle convex taper) ────
  // One continuous silhouette instead of stacked cylinders — reads as carved stone
  add(
    latheFromPoints(
      [
        [0.0, 0.16],
        [0.245, 0.16],
        [0.24, 0.2],
        [0.228, 0.32],
        [0.215, 0.45],
        [0.203, 0.58],
        [0.193, 0.7],
        [0.187, 0.8],
        [0.185, 0.86],
        [0.2, 0.875], // flare into parapet
        [0.205, 0.95],
        [0.16, 0.95],
        [0.16, 0.88],
        [0.0, 0.88],
      ],
      28,
    ),
    0,
    0,
  );

  // ── Metallic banding rings (trim accents replacing stone belt discs) ──────
  for (const [by, br] of [
    [0.3, 0.232],
    [0.55, 0.207],
    [0.78, 0.19],
  ] as const) {
    addT(new THREE.TorusGeometry(br, 0.009, 6, 28), 0, by, 0, Math.PI / 2, 0, 0);
  }

  // ── Eight merlons (battlements) around the parapet rim ───────────────────
  const mR = 0.183;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const mx = Math.cos(a) * mR;
    const mz = Math.sin(a) * mR;
    const merlon = add(new THREE.BoxGeometry(0.085, 0.1, 0.05), mx, 1.0, mz, 0, -a + Math.PI / 2);
    merlon.rotation.y = -a + Math.PI / 2;
  }

  // ── Arrow slits — narrow recessed boxes on the tower face ─────────────────
  for (const [sy, sa] of [
    [0.42, 0.35],
    [0.62, -0.4],
  ] as const) {
    const sr = 0.205;
    add(
      new THREE.BoxGeometry(0.025, 0.09, 0.02),
      Math.cos(sa) * sr,
      sy,
      Math.sin(sa) * sr,
      0,
      -sa + Math.PI / 2,
    );
  }

  // ── Armored knight standing on parapet (rounded sculpted forms) ───────────
  // Legs / lower body
  add(new THREE.CylinderGeometry(0.055, 0.07, 0.14, 12), 0, 0.975);
  // Torso — rounded cuirass instead of a box
  add(new THREE.SphereGeometry(0.115, 16, 12).scale(0.95, 1.05, 0.78), 0, 1.12, 0.0);
  // Pauldron left
  add(new THREE.SphereGeometry(0.062, 10, 8), -0.12, 1.21, 0.0);
  // Pauldron right
  add(new THREE.SphereGeometry(0.062, 10, 8), 0.12, 1.21, 0.0);

  // ── Left arm — holding large kite shield ─────────────────────────────────
  add(new THREE.CapsuleGeometry(0.038, 0.11, 4, 10), -0.155, 1.12, 0.02, 0, 0, 0.7);
  // Shield face (kite shape — cylinder for face + cone for lower point)
  add(
    new THREE.CylinderGeometry(0.175, 0.175, 0.022, 18),
    -0.275,
    1.1,
    -0.02,
    Math.PI / 2,
    0,
    0.15,
  );
  add(new THREE.ConeGeometry(0.09, 0.13, 8), -0.275, 0.945, -0.02, 0, 0, Math.PI);
  // Shield emblem cross — metallic trim
  addT(new THREE.BoxGeometry(0.14, 0.016, 0.016), -0.275, 1.1, -0.035);
  addT(new THREE.BoxGeometry(0.016, 0.12, 0.016), -0.275, 1.1, -0.035);
  // Shield rim — metallic trim
  addT(new THREE.TorusGeometry(0.17, 0.013, 6, 22), -0.275, 1.1, -0.02, Math.PI / 2, 0, 0.15);

  // ── Right arm — extended forward pointing / holding sword ────────────────
  add(new THREE.CapsuleGeometry(0.038, 0.12, 4, 10), 0.14, 1.16, 0.02, 0, 0, -0.5);
  add(new THREE.CapsuleGeometry(0.03, 0.1, 4, 10), 0.21, 1.09, 0.04, 0, 0, -0.9);
  // Gauntlet fist
  add(new THREE.SphereGeometry(0.038, 10, 8), 0.255, 1.0, 0.06);
  // Sword — metallic blade extending forward from fist
  addT(new THREE.BoxGeometry(0.016, 0.016, 0.35), 0.26, 0.99, 0.23);
  // Crossguard
  addT(new THREE.BoxGeometry(0.085, 0.012, 0.012), 0.26, 0.99, 0.06);

  // ── Helmet ────────────────────────────────────────────────────────────────
  add(new THREE.CylinderGeometry(0.06, 0.072, 0.048, 12), 0, 1.255);
  add(new THREE.SphereGeometry(0.088, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), 0, 1.31, 0.01);
  add(new THREE.CylinderGeometry(0.108, 0.104, 0.022, 16), 0, 1.263);
  // Curved face guard
  add(
    new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10, 1, true, -Math.PI / 3, Math.PI / 1.5),
    0,
    1.278,
    0.01,
  );
  // Visor slit — trim accent
  addT(new THREE.BoxGeometry(0.058, 0.011, 0.01), 0, 1.284, 0.09);
  // Crest
  addT(new THREE.ConeGeometry(0.014, 0.075, 8), 0, 1.41, 0.0);

  // Apply facing before merge
  g.rotation.y = facingAngleY;
  gTrim.rotation.y = facingAngleY;
  return mergeStoneAndTrim(g, gTrim, mats);
}

// ── House crest colors for king's shield ─────────────────────────────────────

const HOUSE_SHIELD_COLORS: Record<string, { base: number; accent: number }> = {
  gryffindor: { base: 0x8b0000, accent: 0xffd700 }, // scarlet + gold
  slytherin: { base: 0x1a4a1a, accent: 0xc0c0c0 }, // green + silver
  ravenclaw: { base: 0x000080, accent: 0xcd7f32 }, // navy + bronze
  hufflepuff: { base: 0x1a1a00, accent: 0xffee00 }, // black + yellow
};

// ── King: standing armored knight with planted sword + house shield ───────────

/**
 * Builds a king as a tall standing armored knight matching the HP wizard chess
 * reference — full plate armour, both gauntleted hands gripping a great-sword
 * planted tip-down in front, large heater shield carried on the back/left arm,
 * spiked great helm with a bold gold crown band and crown points.
 * Shield face is painted in house colours with a cross emblem.
 */
export function buildKingGroup(
  mats: PieceMats,
  facingAngleY = 0,
  house: string | null = null,
): THREE.Group {
  const mat = mats.stone;
  const g = new THREE.Group();

  const add = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
  };

  // ── Ornate tiered octagonal base (matches pawn/knight language) ───────────
  add(new THREE.CylinderGeometry(0.34, 0.37, 0.06, 8), 0, 0.03);
  add(new THREE.CylinderGeometry(0.28, 0.32, 0.055, 8), 0, 0.088);
  add(new THREE.CylinderGeometry(0.22, 0.26, 0.048, 8), 0, 0.139);
  // 6 decorative columns around base perimeter
  const COL_R = 0.21;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    add(
      new THREE.CylinderGeometry(0.026, 0.03, 0.1, 7),
      Math.cos(a) * COL_R,
      0.213,
      Math.sin(a) * COL_R,
    );
    add(
      new THREE.CylinderGeometry(0.038, 0.038, 0.016, 7),
      Math.cos(a) * COL_R,
      0.271,
      Math.sin(a) * COL_R,
    );
    add(
      new THREE.CylinderGeometry(0.038, 0.038, 0.016, 7),
      Math.cos(a) * COL_R,
      0.163,
      Math.sin(a) * COL_R,
    );
  }
  // Seat platform
  add(new THREE.CylinderGeometry(0.2, 0.21, 0.038, 8), 0, 0.3);

  // ── Greaved boots / feet ──────────────────────────────────────────────────
  add(new THREE.BoxGeometry(0.08, 0.12, 0.12), -0.055, 0.378, 0.01);
  add(new THREE.BoxGeometry(0.08, 0.12, 0.12), 0.055, 0.378, 0.01);
  // Toe caps
  add(new THREE.SphereGeometry(0.045, 7, 5), -0.055, 0.365, 0.065);
  add(new THREE.SphereGeometry(0.045, 7, 5), 0.055, 0.365, 0.065);

  // ── Armoured legs ─────────────────────────────────────────────────────────
  add(new THREE.CylinderGeometry(0.058, 0.068, 0.22, 8), -0.058, 0.516, 0.0);
  add(new THREE.CylinderGeometry(0.058, 0.068, 0.22, 8), 0.058, 0.516, 0.0);
  // Knee cops
  add(new THREE.SphereGeometry(0.06, 8, 6), -0.058, 0.62, 0.012);
  add(new THREE.SphereGeometry(0.06, 8, 6), 0.058, 0.62, 0.012);
  // Upper legs (cuisses)
  add(new THREE.CylinderGeometry(0.062, 0.07, 0.18, 8), -0.055, 0.72, 0.0);
  add(new THREE.CylinderGeometry(0.062, 0.07, 0.18, 8), 0.055, 0.72, 0.0);

  // ── Fauld / waist tassets ─────────────────────────────────────────────────
  add(new THREE.CylinderGeometry(0.155, 0.172, 0.06, 10), 0, 0.812);

  // ── Torso: broad plate cuirass ────────────────────────────────────────────
  add(new THREE.BoxGeometry(0.3, 0.34, 0.22), 0, 0.985, 0.01);
  // Breastplate ridge (center line)
  add(new THREE.BoxGeometry(0.035, 0.28, 0.04), 0, 0.985, 0.11);
  // Back plate
  add(new THREE.BoxGeometry(0.26, 0.3, 0.09), 0, 0.98, -0.1);

  // ── Huge billowing cloak ───────────────────────────────────────────────────
  // The cloak hangs from the shoulders and flows dramatically behind/below.
  // Built from overlapping curved panels to give a layered, flowing look.

  // Collar / yoke — wide flat panel across shoulder blades
  add(new THREE.BoxGeometry(0.38, 0.06, 0.06), 0, 1.08, -0.13);

  // Main cloak body — 5 vertical panels of increasing width fanning outward
  // Each panel is a tapered box (wider at bottom) with a slight backward lean
  for (let i = 0; i < 5; i++) {
    const t = (i - 2) / 2; // -1 .. +1 side spread
    const xOff = t * 0.22;
    const wTop = 0.09 + Math.abs(t) * 0.04;
    const wBot = 0.13 + Math.abs(t) * 0.06;
    // Simulate taper with two stacked boxes (top narrower, bottom wider)
    add(new THREE.BoxGeometry(wTop, 0.3, 0.055), xOff, 0.92, -0.16 - Math.abs(t) * 0.02);
    add(new THREE.BoxGeometry(wBot, 0.35, 0.06), xOff, 0.6, -0.17 - Math.abs(t) * 0.03);
    add(new THREE.BoxGeometry(wBot + 0.04, 0.22, 0.055), xOff, 0.35, -0.17 - Math.abs(t) * 0.04);
  }

  // Lower hem — wide sweeping panel that fans out at ground level
  add(new THREE.BoxGeometry(0.52, 0.1, 0.06), 0, 0.21, -0.18);
  add(new THREE.BoxGeometry(0.6, 0.07, 0.055), 0, 0.148, -0.19);

  // Outer wing panels — dramatic wide flanges at the sides of the cloak
  add(new THREE.BoxGeometry(0.08, 0.55, 0.05), -0.32, 0.65, -0.155, 0, 0, 0.12);
  add(new THREE.BoxGeometry(0.08, 0.55, 0.05), 0.32, 0.65, -0.155, 0, 0, -0.12);

  // Depth layer — a second set of slightly recessed panels for thickness/volume
  add(new THREE.BoxGeometry(0.3, 0.7, 0.04), 0, 0.68, -0.21);
  add(new THREE.BoxGeometry(0.4, 0.3, 0.04), 0, 0.33, -0.21);

  // Interior shadow strip — thin dark-ish (same mat) sliver gives depth illusion
  add(new THREE.BoxGeometry(0.24, 0.6, 0.018), 0, 0.66, -0.235);

  // Rerebraces (upper arm armour) — left
  add(new THREE.CylinderGeometry(0.058, 0.068, 0.2, 8), -0.205, 0.96, 0.0, 0, 0, 0.15);
  // Rerebraces — right
  add(new THREE.CylinderGeometry(0.058, 0.068, 0.2, 8), 0.205, 0.96, 0.0, 0, 0, -0.15);
  // Pauldrons (shoulder domes)
  add(new THREE.SphereGeometry(0.088, 9, 7), -0.218, 1.068, 0.0);
  add(new THREE.SphereGeometry(0.088, 9, 7), 0.218, 1.068, 0.0);
  // Pauldron flanges (overlapping plates)
  add(new THREE.BoxGeometry(0.11, 0.04, 0.11), -0.215, 1.01, 0.0);
  add(new THREE.BoxGeometry(0.11, 0.04, 0.11), 0.215, 1.01, 0.0);

  // ── Couter (elbow armour) + vambraces ─────────────────────────────────────
  add(new THREE.SphereGeometry(0.05, 8, 6), -0.19, 0.835, 0.02);
  add(new THREE.SphereGeometry(0.05, 8, 6), 0.19, 0.835, 0.02);
  // Vambrace left (forearm angled inward + down, gripping sword)
  add(new THREE.CylinderGeometry(0.04, 0.05, 0.19, 7), -0.095, 0.755, 0.08, 0, 0, 0.55);
  // Vambrace right (mirror)
  add(new THREE.CylinderGeometry(0.04, 0.05, 0.19, 7), 0.095, 0.755, 0.08, 0, 0, -0.55);
  // Gauntlets
  add(new THREE.BoxGeometry(0.065, 0.065, 0.07), -0.03, 0.685, 0.1);
  add(new THREE.BoxGeometry(0.065, 0.065, 0.07), 0.03, 0.685, 0.1);
  // Knuckle ridges
  add(new THREE.BoxGeometry(0.055, 0.018, 0.022), -0.03, 0.714, 0.128);
  add(new THREE.BoxGeometry(0.055, 0.018, 0.022), 0.03, 0.714, 0.128);

  // ── Great-sword planted tip-down in front ─────────────────────────────────
  // Grip (wrapped in gauntlets, centered between hands)
  add(new THREE.CylinderGeometry(0.022, 0.026, 0.2, 7), 0.0, 0.69, 0.11);
  // Pommel (round sphere at base of grip)
  add(new THREE.SphereGeometry(0.04, 8, 6), 0.0, 0.58, 0.11);
  // Crossguard — wide horizontal bar
  add(new THREE.BoxGeometry(0.32, 0.03, 0.028), 0.0, 0.78, 0.11);
  // Crossguard quillons (flared tips)
  add(new THREE.SphereGeometry(0.026, 7, 5), -0.155, 0.78, 0.11);
  add(new THREE.SphereGeometry(0.026, 7, 5), 0.155, 0.78, 0.11);
  // Blade — long thin box running from guard down to floor
  add(new THREE.BoxGeometry(0.038, 0.44, 0.016), 0.0, 0.54, 0.11);
  add(new THREE.BoxGeometry(0.022, 0.18, 0.012), 0.0, 0.28, 0.11);
  // Blade tip (narrowing cone)
  add(new THREE.ConeGeometry(0.022, 0.07, 5), 0.0, 0.163, 0.11, 0, 0, 0);
  // Blade fuller (center ridge — slightly proud of blade face)
  add(new THREE.BoxGeometry(0.01, 0.38, 0.006), 0.0, 0.53, 0.123);

  // ── Great helm — tall visored barrel helm ─────────────────────────────────
  // Gorget (neck guard)
  add(new THREE.CylinderGeometry(0.092, 0.108, 0.075, 10), 0, 1.098);
  // Helm barrel (tall cylinder body)
  add(new THREE.CylinderGeometry(0.11, 0.118, 0.22, 12), 0, 1.26, 0.0);
  // Helm top dome
  add(new THREE.SphereGeometry(0.112, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, 1.368, 0.0);
  // Brim / lower flange
  add(new THREE.CylinderGeometry(0.138, 0.132, 0.026, 12), 0, 1.148);
  // Face plate (front flat)
  add(new THREE.BoxGeometry(0.125, 0.14, 0.028), 0, 1.245, 0.105);
  // Visor slit — narrow horizontal gap
  add(new THREE.BoxGeometry(0.09, 0.016, 0.014), 0, 1.265, 0.116);
  // Breathing holes (lower face plate)
  for (let i = -1; i <= 1; i++) {
    add(
      new THREE.CylinderGeometry(0.008, 0.008, 0.015, 5),
      i * 0.028,
      1.215,
      0.116,
      Math.PI / 2,
      0,
      0,
    );
  }
  // Helm crest / plume holder spike
  add(new THREE.ConeGeometry(0.02, 0.14, 6), 0, 1.486, 0.0);
  // Plume spikes (fan of narrow cones fanning back like reference image)
  for (let i = 0; i < 7; i++) {
    const t = i / 6 - 0.5;
    add(
      new THREE.ConeGeometry(0.008, 0.13, 5),
      t * 0.055,
      1.54 + Math.abs(t) * 0.02,
      -0.025 + Math.abs(t) * 0.01,
      -0.15,
      0,
      t * 0.3,
    );
  }

  // ── Crown band + points (metallic trim material) ──────────────────────────
  // Use a separate group so trim material can be merged independently
  const gGold = new THREE.Group();
  const goldMat = mats.trim;
  const addGold = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, goldMat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    gGold.add(m);
  };

  // Crown band — thick gold ring sitting just below helm dome
  addGold(new THREE.TorusGeometry(0.116, 0.018, 8, 24), 0, 1.37, 0.0, Math.PI / 2, 0, 0);
  // 5 tall crown points
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    addGold(new THREE.ConeGeometry(0.02, 0.095, 6), Math.cos(a) * 0.1, 1.428, Math.sin(a) * 0.1);
  }
  // 5 small round jewel spheres between points
  for (let i = 0; i < 5; i++) {
    const a = ((i + 0.5) / 5) * Math.PI * 2;
    addGold(new THREE.SphereGeometry(0.014, 6, 5), Math.cos(a) * 0.116, 1.38, Math.sin(a) * 0.116);
  }

  // ── House-coloured heater shield carried on left arm / back ───────────────
  const shieldColors = HOUSE_SHIELD_COLORS[house ?? 'gryffindor'] ?? HOUSE_SHIELD_COLORS.gryffindor;

  const shieldBaseMat = new THREE.MeshStandardMaterial({
    color: shieldColors.base,
    metalness: 0.3,
    roughness: 0.6,
  });
  const shieldAccentMat = new THREE.MeshStandardMaterial({
    color: shieldColors.accent,
    metalness: 0.5,
    roughness: 0.3,
  });

  // Two separate groups for the two shield materials so we can merge cleanly
  const gShieldBase = new THREE.Group(); // house base colour
  const gShieldAccent = new THREE.Group(); // house accent colour

  const addSB = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, shieldBaseMat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    gShieldBase.add(m);
  };
  const addSA = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, shieldAccentMat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    gShieldAccent.add(m);
  };

  // Shield body — wide heater shape: cylinder face + cone lower point
  addSB(new THREE.CylinderGeometry(0.215, 0.215, 0.028, 16), 0, 0.93, 0.0, Math.PI / 2, 0, 0.12);
  addSB(new THREE.ConeGeometry(0.12, 0.18, 4), 0, 0.74, 0.0, 0, 0, Math.PI);
  // Shield rim (accent colour)
  addSA(new THREE.TorusGeometry(0.21, 0.014, 5, 20), 0, 0.93, 0.0, Math.PI / 2, 0, 0.12);
  // House cross — vertical bar
  addSA(new THREE.BoxGeometry(0.028, 0.28, 0.022), 0, 0.93, 0.014);
  // House cross — horizontal bar
  addSA(new THREE.BoxGeometry(0.26, 0.028, 0.022), 0, 0.99, 0.014);
  // Shield boss dome (centre accent)
  addSA(new THREE.SphereGeometry(0.04, 8, 6), 0, 0.93, 0.022);

  // Rotate shield pivot position around Y by facingAngleY (same pattern as knight legs)
  const spx = 0.28 * Math.cos(facingAngleY) - -0.06 * Math.sin(facingAngleY);
  const spz = 0.28 * Math.sin(facingAngleY) + -0.06 * Math.cos(facingAngleY);
  for (const sg of [gShieldBase, gShieldAccent]) {
    sg.position.set(spx, 0.0, spz);
    sg.rotation.set(0, facingAngleY - 0.25, 0.1);
  }

  // ── Merge all geometry groups ─────────────────────────────────────────────
  g.rotation.y = facingAngleY;
  gGold.rotation.y = facingAngleY;

  const result = mergeGroupToSingleMesh(g, mat);
  const goldResult = mergeGroupToSingleMesh(gGold, goldMat);
  const shBase = mergeGroupToSingleMesh(gShieldBase, shieldBaseMat);
  const shAccent = mergeGroupToSingleMesh(gShieldAccent, shieldAccentMat);

  // Attach shield meshes directly as children (they keep their own materials)
  for (const c of [...shBase.children, ...shAccent.children]) {
    result.add(c.clone());
  }
  shBase.traverse((c) => {
    if (c instanceof THREE.Mesh) c.geometry.dispose();
  });
  shAccent.traverse((c) => {
    if (c instanceof THREE.Mesh) c.geometry.dispose();
  });

  // Add gold meshes to result
  goldResult.children.forEach((c) => result.add(c.clone()));
  goldResult.traverse((c) => {
    if (c instanceof THREE.Mesh) c.geometry.dispose();
  });

  return result;
}

/** Adds 5 crown spike points around the queen rim. */
function addQueenCrown(
  group: THREE.Group,
  rimY: number,
  rimR: number,
  mat: THREE.MeshStandardMaterial,
): void {
  const spikeCount = 5;
  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI * 2;
    const geo = new THREE.ConeGeometry(0.04, 0.12, 6);
    const spike = new THREE.Mesh(geo, mat);
    spike.position.set(Math.cos(angle) * (rimR * 0.8), rimY + 0.06, Math.sin(angle) * (rimR * 0.8));
    group.add(spike);
  }
}

// ── Bishop: robed wizard bishop with mitre and crozier ───────────────────────

/**
 * Builds a bishop as a tall robed wizard figure — octagonal stepped base,
 * long layered vestment robes, raised blessing hand, crozier staff with
 * curved crook, and a pointed mitre hat.
 */
export function buildBishopGroup(mats: PieceMats, facingAngleY = 0): THREE.Group {
  const mat = mats.stone;
  const g = new THREE.Group();
  const gTrim = new THREE.Group();

  const add = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const addT = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mats.trim);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    gTrim.add(m);
    return m;
  };

  // ── Octagonal stepped base ────────────────────────────────────────────────
  add(new THREE.CylinderGeometry(0.3, 0.33, 0.06, 8), 0, 0.03); // bottom slab
  add(new THREE.CylinderGeometry(0.24, 0.28, 0.055, 8), 0, 0.088); // mid tier
  add(new THREE.CylinderGeometry(0.2, 0.23, 0.05, 8), 0, 0.138); // top platform

  // ── Long outer vestment robe (wide flared cone) ───────────────────────────
  // Base of robe — widest at hem
  add(new THREE.CylinderGeometry(0.19, 0.21, 0.36, 10), 0, 0.34);
  // Upper robe — tapers toward chest
  add(new THREE.CylinderGeometry(0.14, 0.18, 0.28, 10), 0, 0.6);
  // Central vestment panel (decorative front slab)
  add(new THREE.BoxGeometry(0.1, 0.42, 0.03), 0, 0.45, 0.17);

  // ── Shoulder mantle / cape collar ────────────────────────────────────────
  add(new THREE.CylinderGeometry(0.155, 0.18, 0.06, 10), 0, 0.775); // shoulder cape
  // Gorget / neck band
  add(new THREE.CylinderGeometry(0.075, 0.09, 0.055, 10), 0, 0.835);

  // ── Head ─────────────────────────────────────────────────────────────────
  add(new THREE.SphereGeometry(0.075, 10, 8), 0, 0.915);

  // ── Mitre (bishop's pointed hat) — two-part tapered form ─────────────────
  // Wide brim band of mitre
  add(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 10), 0, 0.975);
  // Lower mitre body
  add(new THREE.CylinderGeometry(0.065, 0.082, 0.1, 8), 0, 1.045);
  // Upper mitre point
  add(new THREE.ConeGeometry(0.052, 0.15, 8), 0, 1.17);

  // ── Right arm — raised in blessing ───────────────────────────────────────
  // Upper arm angled outward and up
  add(new THREE.CylinderGeometry(0.036, 0.044, 0.16, 7), 0.12, 0.75, 0.02, 0, 0, -0.75);
  // Forearm raised upward
  add(new THREE.CylinderGeometry(0.028, 0.036, 0.14, 7), 0.19, 0.83, 0.02, 0, 0, -1.2);
  // Hand (small sphere)
  add(new THREE.SphereGeometry(0.032, 7, 6), 0.195, 0.94, 0.02);

  // ── Left arm — holding crozier staff ─────────────────────────────────────
  add(new THREE.CylinderGeometry(0.036, 0.044, 0.16, 7), -0.11, 0.75, 0.02, 0, 0, 0.5);
  add(new THREE.CylinderGeometry(0.028, 0.036, 0.12, 7), -0.15, 0.65, 0.03, 0, 0, 0.3);

  // ── Crozier staff (gold trim — tall vertical rod held in left hand) ───────
  // Shaft — tall cylinder beside figure
  addT(new THREE.CylinderGeometry(0.016, 0.016, 0.8, 7), -0.21, 0.6, 0.03);
  // Neck of crook
  addT(new THREE.CylinderGeometry(0.013, 0.016, 0.1, 6), -0.21, 1.01, 0.03, 0, 0, 0.3);
  // The curl — torus segment approximated with a torus
  addT(
    new THREE.TorusGeometry(0.055, 0.012, 6, 12, Math.PI * 1.5),
    -0.245,
    1.075,
    0.03,
    0,
    0,
    -0.4,
  );

  g.rotation.y = facingAngleY;
  gTrim.rotation.y = facingAngleY;
  return mergeStoneAndTrim(g, gTrim, mats);
}

// ── Knight: rearing warhorse with armored rider on columned pedestal ─────────

/**
 * Builds a knight as a rearing armored warhorse with a mounted knight rider —
 * matching the HP wizard chess aesthetic from the reference images.
 * Structure: hexagonal columned pedestal → rearing horse body → armored rider
 * with lance/sword, large shield on left, spiked armor details.
 */
export function buildKnightGroup(mats: PieceMats, facingAngleY = 0): THREE.Group {
  const mat = mats.stone;
  const g = new THREE.Group();

  const add = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  // ── Pedestal base ─────────────────────────────────────────────────────────
  add(new THREE.CylinderGeometry(0.34, 0.36, 0.055, 8), 0, 0.027);
  add(new THREE.CylinderGeometry(0.29, 0.32, 0.05, 8), 0, 0.077);

  // ── 6 columns in a ring (same language as pawn) ───────────────────────────
  const COL_R = 0.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const cx = Math.cos(a) * COL_R;
    const cz = Math.sin(a) * COL_R;
    add(new THREE.CylinderGeometry(0.028, 0.032, 0.11, 7), cx, 0.155, cz);
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.018, 7), cx, 0.218, cz);
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.018, 7), cx, 0.102, cz);
  }

  // Seat platform
  add(new THREE.CylinderGeometry(0.26, 0.27, 0.04, 8), 0, 0.246);

  // ── Horse: rearing pose — hindquarters low, forelegs raised ───────────────

  // Hindquarters / rump — large rounded mass, sits low and back
  add(new THREE.SphereGeometry(0.18, 10, 8), 0.0, 0.48, -0.06);
  // Main barrel / belly
  add(new THREE.CylinderGeometry(0.14, 0.17, 0.4, 10), 0.0, 0.6, 0.04, 0.55, 0, 0);
  // Chest — angled forward as horse rears
  add(new THREE.SphereGeometry(0.155, 10, 8), 0.0, 0.78, 0.12);

  // Neck — long cylinder angling up and forward
  add(new THREE.CylinderGeometry(0.075, 0.1, 0.38, 9), 0.0, 0.98, 0.1, -0.7, 0, 0);

  // Mane — series of flat overlapping plates along neck top
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const ny = 0.83 + t * 0.28;
    const nz = 0.22 - t * 0.12;
    add(new THREE.BoxGeometry(0.025, 0.07, 0.05), 0, ny, nz + 0.07, -0.3, 0, 0);
  }

  // Head — elongated box + snout
  add(new THREE.BoxGeometry(0.13, 0.17, 0.22), 0.0, 1.155, 0.195);
  // Snout / jaw extension
  add(new THREE.BoxGeometry(0.1, 0.1, 0.14), 0.0, 1.09, 0.3);
  // Nostril bumps
  add(new THREE.SphereGeometry(0.028, 6, 5), -0.038, 1.07, 0.37);
  add(new THREE.SphereGeometry(0.028, 6, 5), 0.038, 1.07, 0.37);
  // Eye sockets (slight recess)
  add(new THREE.SphereGeometry(0.022, 6, 5), -0.063, 1.16, 0.27);
  add(new THREE.SphereGeometry(0.022, 6, 5), 0.063, 1.16, 0.27);
  // Ear spikes
  add(new THREE.ConeGeometry(0.022, 0.08, 6), -0.045, 1.255, 0.18, -0.2, 0, 0.15);
  add(new THREE.ConeGeometry(0.022, 0.08, 6), 0.045, 1.255, 0.18, -0.2, 0, -0.15);
  // Horn / helmet spike on forehead
  add(new THREE.ConeGeometry(0.018, 0.12, 6), 0.0, 1.28, 0.21, -0.35, 0, 0);

  // Armor banding on neck (horizontal rings)
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const ny = 0.855 + t * 0.22;
    const nz = 0.165 - t * 0.06;
    add(
      new THREE.TorusGeometry(0.085 - t * 0.008, 0.012, 5, 12),
      0,
      ny,
      nz,
      Math.PI / 2 - 0.7,
      0,
      0,
    );
  }

  // ── Legs — kept as SEPARATE groups (not merged) so they can be animated ────
  // Each leg group pivots from the hip/shoulder attachment point.
  // userData.role tags them for the animation system in ChessScene.

  const makeMesh = (
    geo: THREE.BufferGeometry,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    return m;
  };

  // Left foreleg (pivot at shoulder ~y=0.72, z=0.16)
  const legFL = new THREE.Group();
  legFL.position.set(-0.09, 0.72, 0.16);
  legFL.userData.role = 'legFL';
  legFL.add(makeMesh(new THREE.CylinderGeometry(0.052, 0.065, 0.22, 8), 0, 0, 0.04, -0.9, 0, 0.1));
  legFL.add(
    makeMesh(new THREE.CylinderGeometry(0.038, 0.05, 0.18, 8), -0.03, -0.17, 0.16, -0.5, 0, 0.05),
  );
  legFL.add(makeMesh(new THREE.SphereGeometry(0.048, 7, 6), -0.05, -0.28, 0.24));

  // Right foreleg
  const legFR = new THREE.Group();
  legFR.position.set(0.09, 0.72, 0.16);
  legFR.userData.role = 'legFR';
  legFR.add(makeMesh(new THREE.CylinderGeometry(0.052, 0.065, 0.22, 8), 0, 0, 0.04, -0.9, 0, -0.1));
  legFR.add(
    makeMesh(new THREE.CylinderGeometry(0.038, 0.05, 0.18, 8), 0.03, -0.17, 0.16, -0.5, 0, -0.05),
  );
  legFR.add(makeMesh(new THREE.SphereGeometry(0.048, 7, 6), 0.05, -0.28, 0.24));

  // Left hind leg (pivot at hip ~y=0.38, z=-0.08)
  const legHL = new THREE.Group();
  legHL.position.set(-0.11, 0.38, -0.08);
  legHL.userData.role = 'legHL';
  legHL.add(
    makeMesh(new THREE.CylinderGeometry(0.062, 0.075, 0.24, 8), 0, -0.02, -0.02, 0.3, 0, 0.05),
  );
  legHL.add(makeMesh(new THREE.CylinderGeometry(0.045, 0.06, 0.2, 8), 0, -0.185, 0.04, 0.1, 0, 0));
  legHL.add(makeMesh(new THREE.CylinderGeometry(0.052, 0.048, 0.04, 8), 0, -0.11, 0.08));

  // Right hind leg
  const legHR = new THREE.Group();
  legHR.position.set(0.11, 0.38, -0.08);
  legHR.userData.role = 'legHR';
  legHR.add(
    makeMesh(new THREE.CylinderGeometry(0.062, 0.075, 0.24, 8), 0, -0.02, -0.02, 0.3, 0, -0.05),
  );
  legHR.add(makeMesh(new THREE.CylinderGeometry(0.045, 0.06, 0.2, 8), 0, -0.185, 0.04, 0.1, 0, 0));
  legHR.add(makeMesh(new THREE.CylinderGeometry(0.052, 0.048, 0.04, 8), 0, -0.11, 0.08));

  // Tail — thick tapered cylinder sweeping back and down
  add(new THREE.CylinderGeometry(0.018, 0.055, 0.28, 8), 0.0, 0.4, -0.22, 0.5, 0, 0);
  add(new THREE.CylinderGeometry(0.01, 0.02, 0.18, 7), 0.0, 0.29, -0.32, 0.7, 0, 0);

  // ── Rider: armored knight sitting on horse's back ─────────────────────────

  // Rider lower body / saddle seat
  add(new THREE.BoxGeometry(0.18, 0.1, 0.16), 0.0, 0.75, -0.02);
  // Rider torso — upright plate armor
  add(new THREE.BoxGeometry(0.2, 0.26, 0.16), 0.0, 0.91, 0.01);
  // Back plate
  add(new THREE.BoxGeometry(0.18, 0.22, 0.07), 0.0, 0.91, -0.1);
  // Pauldron left
  add(new THREE.SphereGeometry(0.068, 8, 6), -0.13, 1.0, 0.0);
  // Pauldron right
  add(new THREE.SphereGeometry(0.068, 8, 6), 0.13, 1.0, 0.0);

  // ── Large shield on rider's left arm ─────────────────────────────────────
  // Shield face (wide kite/heater shape approximated as cylinder + box)
  add(new THREE.CylinderGeometry(0.19, 0.19, 0.022, 14), -0.26, 0.88, 0.03, Math.PI / 2, 0.0, 0.18);
  // Shield lower point (triangle extension)
  add(new THREE.ConeGeometry(0.1, 0.14, 4), -0.26, 0.72, 0.03, 0, 0, Math.PI);
  // Shield boss dome
  add(new THREE.SphereGeometry(0.048, 8, 6), -0.3, 0.88, 0.06);
  // Shield rim
  add(new THREE.TorusGeometry(0.185, 0.014, 5, 16), -0.26, 0.88, 0.03, Math.PI / 2, 0.0, 0.18);
  // Left arm holding shield
  add(new THREE.CylinderGeometry(0.038, 0.046, 0.2, 7), -0.18, 0.88, 0.02, 0, 0, 1.2);

  // ── Right arm raised holding lance/sword — kept as a SEPARATE group so ──────
  // it can be rotated by the KnightCharge animation (sword swing).
  // Pivot is at the shoulder attachment point (right pauldron).
  // All positions below are relative to the pivot.
  const swordArm = new THREE.Group();
  swordArm.position.set(0.14, 0.99, 0.02); // shoulder pivot in model space
  swordArm.userData.role = 'swordArm';

  const addArm = (
    geo: THREE.BufferGeometry,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    m: THREE.MeshStandardMaterial = mat,
  ) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x - 0.14, y - 0.99, z - 0.02); // offset relative to pivot
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    swordArm.add(mesh);
  };

  addArm(new THREE.CylinderGeometry(0.038, 0.046, 0.2, 7), 0.14, 0.99, 0.02, 0, 0, -0.6);
  addArm(new THREE.CylinderGeometry(0.03, 0.038, 0.18, 7), 0.22, 0.88, 0.02, 0, 0, -1.1);
  // Lance (metallic trim — swordArm meshes stay unmerged, so per-mesh material is fine)
  addArm(
    new THREE.CylinderGeometry(0.014, 0.018, 0.7, 7),
    0.3,
    1.1,
    0.05,
    0.0,
    0,
    -1.45,
    mats.trim,
  );
  // Lance tip
  addArm(new THREE.ConeGeometry(0.02, 0.07, 6), 0.647, 1.142, 0.05, 0.0, 0, -1.45, mats.trim);

  // ── Rider helmet ─────────────────────────────────────────────────────────
  // Gorget
  add(new THREE.CylinderGeometry(0.065, 0.078, 0.05, 9), 0.0, 1.055, 0.0);
  // Helm dome
  add(new THREE.SphereGeometry(0.095, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), 0.0, 1.115, 0.01);
  // Brim
  add(new THREE.CylinderGeometry(0.12, 0.115, 0.022, 10), 0.0, 1.068, 0.0);
  // Face guard
  add(new THREE.BoxGeometry(0.088, 0.065, 0.02), 0.0, 1.085, 0.092);
  // Visor slit
  add(new THREE.BoxGeometry(0.062, 0.012, 0.01), 0.0, 1.092, 0.101);
  // Crest spike atop helm
  add(new THREE.ConeGeometry(0.016, 0.09, 6), 0.0, 1.22, 0.0);

  // Spike details on horse armor (studs on chest and rump)
  for (let side = -1; side <= 1; side += 2) {
    add(new THREE.ConeGeometry(0.016, 0.05, 5), side * 0.1, 0.82, 0.18, Math.PI, 0, 0);
    add(new THREE.ConeGeometry(0.016, 0.05, 5), side * 0.12, 0.52, -0.04, Math.PI, 0, 0);
  }

  // ── Merge the static body, then attach animated children ────────────────────
  g.rotation.y = facingAngleY;
  const result = mergeGroupToSingleMesh(g, mat);

  // Rotate pivot positions by the same facing angle and add to result
  for (const child of [legFL, legFR, legHL, legHR, swordArm]) {
    const px =
      child.position.x * Math.cos(facingAngleY) - child.position.z * Math.sin(facingAngleY);
    const pz =
      child.position.x * Math.sin(facingAngleY) + child.position.z * Math.cos(facingAngleY);
    child.position.set(px, child.position.y, pz);
    child.rotation.y = facingAngleY;
    result.add(child);
  }

  return result;
}

// ── Pawn: crouching armored soldier on a columned pedestal ───────────────────

/**
 * Builds a pawn as a crouching armored warrior sitting on a wide hexagonal
 * pedestal supported by 6 short columns — matching the HP wizard chess aesthetic
 * from the reference images (hunched forward, helmet, sword held across knees).
 */
export function buildPawnGroup(mats: PieceMats, facingAngleY = 0): THREE.Group {
  const mat = mats.stone;
  const g = new THREE.Group();
  const gTrim = new THREE.Group();

  const add = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const addT = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mats.trim);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    gTrim.add(m);
    return m;
  };

  // ── Pedestal base: wide octagonal slab ───────────────────────────────────
  add(new THREE.CylinderGeometry(0.32, 0.34, 0.055, 8), 0, 0.027); // bottom slab
  add(new THREE.CylinderGeometry(0.27, 0.3, 0.05, 8), 0, 0.077); // mid tier

  // ── 6 short columns arranged in a ring under the seat ────────────────────
  // Each column: narrow cylinder (shaft) + small cap disc
  const COL_R = 0.18; // ring radius
  const COL_COUNT = 6;
  for (let i = 0; i < COL_COUNT; i++) {
    const a = (i / COL_COUNT) * Math.PI * 2 + Math.PI / 6;
    const cx = Math.cos(a) * COL_R;
    const cz = Math.sin(a) * COL_R;
    // Shaft
    add(new THREE.CylinderGeometry(0.028, 0.032, 0.1, 7), cx, 0.15, cz);
    // Cap
    add(new THREE.CylinderGeometry(0.038, 0.038, 0.018, 7), cx, 0.207, cz);
    // Base disc
    add(new THREE.CylinderGeometry(0.038, 0.038, 0.018, 7), cx, 0.102, cz);
  }

  // ── Seat / platform the figure sits on ───────────────────────────────────
  add(new THREE.CylinderGeometry(0.24, 0.25, 0.04, 8), 0, 0.236);

  // ── Lower body: crouching legs / greaves (rounded sculpted masses) ────────
  // Hunched lap — wide flattened ellipsoid instead of a box
  add(new THREE.SphereGeometry(0.15, 16, 12).scale(1.0, 0.62, 0.85), 0, 0.325, 0.03);
  // Left knee guard (rounded lump forward)
  add(new THREE.SphereGeometry(0.068, 12, 10), -0.08, 0.32, 0.13);
  // Right knee guard
  add(new THREE.SphereGeometry(0.068, 12, 10), 0.08, 0.32, 0.13);
  // Greave shins angled down (capsules read more organic than cylinders)
  add(new THREE.CapsuleGeometry(0.05, 0.1, 4, 10), -0.085, 0.235, 0.12, 0.55, 0, 0);
  add(new THREE.CapsuleGeometry(0.05, 0.1, 4, 10), 0.085, 0.235, 0.12, 0.55, 0, 0);

  // ── Torso: hunched forward, rounded chest + cloaked back hump ─────────────
  // Chest — forward-tilted ellipsoid
  add(new THREE.SphereGeometry(0.15, 16, 12).scale(0.95, 0.8, 0.72), 0, 0.485, 0.01, 0.18, 0, 0);
  // Back hump (cloak over hunched shoulders)
  add(new THREE.SphereGeometry(0.13, 14, 10).scale(0.9, 0.78, 0.7), 0, 0.51, -0.07, -0.3, 0, 0);
  // Belt / waist cinch
  add(new THREE.CylinderGeometry(0.13, 0.15, 0.04, 12), 0, 0.375);
  // Pauldrons — small rounded shoulder caps
  add(new THREE.SphereGeometry(0.055, 10, 8), -0.125, 0.565, 0.01);
  add(new THREE.SphereGeometry(0.055, 10, 8), 0.125, 0.565, 0.01);

  // ── Left arm: reaches forward resting on sword (capsule limbs) ────────────
  add(new THREE.CapsuleGeometry(0.044, 0.13, 4, 10), -0.16, 0.49, 0.04, 0, 0, 0.8);
  add(new THREE.CapsuleGeometry(0.036, 0.11, 4, 10), -0.24, 0.4, 0.08, 0, 0, 1.1);
  // Gauntlet fist
  add(new THREE.SphereGeometry(0.04, 10, 8), -0.255, 0.305, 0.1);

  // ── Right arm: angled across chest gripping sword ─────────────────────────
  add(new THREE.CapsuleGeometry(0.044, 0.13, 4, 10), 0.15, 0.49, 0.04, 0, 0, -0.7);
  add(new THREE.CapsuleGeometry(0.036, 0.11, 4, 10), 0.2, 0.39, 0.08, 0, 0, -1.1);
  add(new THREE.SphereGeometry(0.04, 10, 8), 0.215, 0.28, 0.1);

  // ── Sword held horizontally across the knees (metallic trim) ──────────────
  // Blade — long thin box running left to right
  addT(new THREE.BoxGeometry(0.42, 0.016, 0.012), 0, 0.285, 0.11);
  // Crossguard
  addT(new THREE.BoxGeometry(0.06, 0.012, 0.06), -0.12, 0.285, 0.11);
  // Pommel
  addT(new THREE.SphereGeometry(0.022, 6, 5), -0.215, 0.285, 0.11);

  // ── Helmet: wide rounded war-helm, hunched forward ────────────────────────
  // Neck / gorget
  add(new THREE.CylinderGeometry(0.075, 0.09, 0.055, 14), 0, 0.635);
  // Helm dome (slightly forward-tilted sphere, high segment count)
  add(new THREE.SphereGeometry(0.105, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), 0, 0.695, 0.01);
  // Wide brim / neckguard flange
  add(new THREE.CylinderGeometry(0.135, 0.128, 0.025, 16), 0, 0.648);
  // Brim trim band — thin metallic ring around the helm
  addT(new THREE.TorusGeometry(0.131, 0.008, 6, 20), 0, 0.66, 0, Math.PI / 2, 0, 0);
  // Face guard — curved plate (cylinder slice) instead of a flat box
  add(
    new THREE.CylinderGeometry(0.095, 0.095, 0.075, 12, 1, true, -Math.PI / 3, Math.PI / 1.5),
    0,
    0.668,
    0.01,
  );
  // Visor slit — metallic trim accent
  addT(new THREE.BoxGeometry(0.072, 0.012, 0.012), 0, 0.675, 0.102);

  g.rotation.y = facingAngleY;
  gTrim.rotation.y = facingAngleY;
  return mergeStoneAndTrim(g, gTrim, mats);
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
): { group: THREE.Group; rimUniforms: RimUniforms } {
  // Carved stone body: marble (white) / obsidian (black, house-tinted veins),
  // plus metallic trim (gold / house accent). Marble + weathering + rim Fresnel
  // all live in one shader injection; both materials share rim uniforms so a
  // single tween drives the glow on stone and trim together.
  const { material: stone, rimUniforms } = createStoneMaterial(side, house, envMap);
  const { material: trim } = createTrimMaterial(side, house, envMap, rimUniforms);
  const mats: PieceMats = { stone, trim };

  // ── Character pieces always use custom composite builders ────────────────
  // These are HP wizard chess figures — not replaceable by generic Staunton GLBs.
  // White pieces face -Z (toward black's side); black pieces face +Z (toward white's side)
  const facing = side === 'w' ? Math.PI : 0;
  if (type === 'p') return { group: buildPawnGroup(mats, facing), rimUniforms };
  if (type === 'n') return { group: buildKnightGroup(mats, facing), rimUniforms };
  if (type === 'r') return { group: buildRookGroup(mats, facing), rimUniforms };
  if (type === 'k') return { group: buildKingGroup(mats, facing, house), rimUniforms };
  if (type === 'b') return { group: buildBishopGroup(mats, facing), rimUniforms };

  const profile = PIECE_PROFILES[type];
  const geo = buildLatheGeometry(type);

  const mesh = new THREE.Mesh(geo, stone);
  mesh.castShadow = true;
  mesh.receiveShadow = false;

  const group = new THREE.Group();
  group.add(mesh);

  if (type === 'q') addQueenCrown(group, profile.height, 0.24, trim);

  return { group, rimUniforms };
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
