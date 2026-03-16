/**
 * gltfPieceCache — preloads all 6 chess piece GLB models and caches them as
 * cloneable THREE.Group templates.
 *
 * Usage:
 *   // At app startup (before pieces are needed):
 *   preloadPieceModels();
 *
 *   // When building a piece:
 *   const template = getModelTemplate('pawn'); // null until loaded
 *   if (template) { ... clone and use ... }
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import type { PieceSymbol } from 'chess.js';

// Scale each model so its height matches our board unit system (~0.7–0.96 units tall).
// Derived from each model's bounding-box height at its native scale.
const PIECE_SCALE: Record<PieceSymbol, number> = {
  p: 14.9,
  r: 12.1,
  n: 14.9,
  b: 11.6,
  q: 10.1,
  k: 9.0,
};

const SYMBOL_TO_FILE: Record<PieceSymbol, string> = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king',
};

// Module-level cache — populated once, reused forever.
const _cache = new Map<PieceSymbol, THREE.Group>();
let _loading = false;
let _loaded = false;

const _loader = new GLTFLoader();

/** Returns true once all 6 models are cached and ready to clone. */
export function modelsReady(): boolean {
  return _loaded;
}

// Callbacks registered before load completes — called once when cache is ready.
const _onReadyCallbacks: (() => void)[] = [];

/** Register a callback to be invoked once all models finish loading. */
export function onModelsReady(cb: () => void): void {
  if (_loaded) {
    cb();
  } else {
    _onReadyCallbacks.push(cb);
  }
}

/**
 * Kicks off async loading of all 6 GLBs. Safe to call multiple times — only
 * loads once. Resolves when all models are cached.
 */
export async function preloadPieceModels(): Promise<void> {
  if (_loaded || _loading) return;
  _loading = true;

  const symbols: PieceSymbol[] = ['p', 'r', 'n', 'b', 'q', 'k'];

  await Promise.all(
    symbols.map(
      (sym) =>
        new Promise<void>((resolve, reject) => {
          _loader.load(
            `/models/pieces/${SYMBOL_TO_FILE[sym]}.glb`,
            (gltf) => {
              const template = gltf.scene.clone(true);
              template.scale.setScalar(PIECE_SCALE[sym]);
              // Bake scale into geometry so clones don't need updateMatrixWorld
              template.updateMatrixWorld(true);
              _cache.set(sym, template);
              resolve();
            },
            undefined,
            reject,
          );
        }),
    ),
  );

  _loaded = true;
  for (const cb of _onReadyCallbacks) cb();
  _onReadyCallbacks.length = 0;
}

/**
 * Returns a deep clone of the cached model group for a given piece symbol,
 * with all mesh materials replaced by `mat`.
 * Returns null if models haven't loaded yet (falls back to procedural).
 */
export function cloneModelGroup(
  sym: PieceSymbol,
  mat: THREE.MeshStandardMaterial,
): THREE.Group | null {
  const template = _cache.get(sym);
  if (!template) return null;

  const clone = template.clone(true);
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Replace the original material with our PBR material
      child.material = mat;
      child.castShadow = true;
      child.receiveShadow = false;
    }
  });
  return clone;
}
