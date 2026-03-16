/**
 * ChessScene — React Three Fiber rewrite.
 *
 * Architecture:
 *  <ChessScene>  →  <Canvas>  →  <SceneContents>
 *
 * All chess game logic (chess.js, move execution, capture animations) lives
 * inside SceneContents via refs and useFrame — the same RAF-based pattern as
 * before, but expressed through R3F hooks instead of a raw imperative loop.
 *
 * Post-processing: Bloom + ChromaticAberration + Vignette via
 * @react-three/postprocessing.
 *
 * Pieces: LatheGeometry silhouettes via PieceFactory (no more BoxGeometry).
 */

import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import hogwartsBg from '../assets/hogwarts_BG.png';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
gsap.registerPlugin(CustomEase);

// ── GSAP custom eases ────────────────────────────────────────────────────────
// Pickup: tiny anticipation dip then arc upward
CustomEase.create('pickup', 'M0,0 C0.1,-0.08,0.3,0.04,0.5,0.3 C0.7,0.56,0.85,1.02,1,1');
// Land: fast fall, elastic micro-bounce settle
CustomEase.create('land', 'M0,0 C0.2,0,0.5,0.9,0.7,1.02 C0.85,1.05,0.95,0.98,1,1');
// Slam: violent deceleration into hard stop (capture moves)
CustomEase.create('slam', 'M0,0 C0.05,0,0.2,1.03,0.4,1.05 C0.6,1.07,0.8,0.99,1,1');
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Sparkles,
  MeshReflectorMaterial,
} from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Chess } from 'chess.js';
import type { Color, PieceSymbol, Square } from 'chess.js';
import { Howl } from 'howler';
import { squareToXZ, indicesToSquare, isLightSquare } from '../utils/chessCoords';
import { useHouseStore } from '../stores/houseStore';
import { HOUSE_THEMES } from '../data/houseThemes';
import { CAPTURE_ANIMATIONS } from '../data/captureAnimations';
import { createCaptureEffect } from '../effects/index';
import type { CaptureEffect } from '../effects/index';
import { createPieceGroup, disposePieceGroup } from '../geometry/PieceFactory';
import type { RimUniforms } from '../geometry/PieceFactory';
import { onModelsReady } from '../geometry/gltfPieceCache';
import { Spring } from '../utils/Spring';
import type { HouseName } from '../../../shared/src/index';

// ── Module-level singletons shared between PostFX and KnightChargeEffect ─────
// These are plain Three.js objects — not React state — so they live outside
// the component tree and can be mutated freely by both PostFX (useFrame) and
// KnightChargeEffect (GSAP tweens).
const sharedChromaticVec = new THREE.Vector2(0.0003, 0.0003);
const sharedBloomProxy = { intensity: 0.2 };

// ── Constants ────────────────────────────────────────────────────────────────

const ARC_HEIGHT = 1.8;
const CANDLE_COUNT = 12;
const CANDLE_RADIUS = 5.5;
const CANDLE_HEIGHT = 4.0;
const MAX_ACTIVE_EFFECTS = 3;

// Piece heights kept for future use (e.g. camera offset per piece type)
// @ts-expect-error — kept for future camera-offset-per-piece-type feature
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PIECE_HEIGHTS: Record<PieceSymbol, number> = {
  p: 0.7,
  n: 0.88,
  b: 0.92,
  r: 0.74,
  q: 0.82,
  k: 0.86,
};

// ── Types ────────────────────────────────────────────────────────────────────

interface PieceUserData {
  square: Square;
  pieceType: PieceSymbol;
  pieceColor: Color;
}

type PieceObject = THREE.Group & { userData: PieceUserData };

// ── Board component ──────────────────────────────────────────────────────────

// Pre-build the 64 square positions + light/dark flags once at module level
const BOARD_SQUARES: { sq: Square; x: number; z: number; isLight: boolean }[] = [];
for (let rank = 0; rank < 8; rank++) {
  for (let file = 0; file < 8; file++) {
    const sq = indicesToSquare(file, rank) as Square;
    const [x, z] = squareToXZ(sq);
    BOARD_SQUARES.push({ sq, x, z, isLight: isLightSquare(sq) });
  }
}

function ChessBoard({
  theme,
  tileMeshes,
  tileMats,
}: {
  theme: (typeof HOUSE_THEMES)[HouseName];
  tileMeshes: React.MutableRefObject<Map<Square, THREE.Mesh>>;
  tileMats: React.MutableRefObject<Map<Square, THREE.MeshStandardMaterial>>;
}) {
  return (
    <>
      {/* Dark wood frame */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[8.8, 0.12, 8.8]} />
        <meshStandardMaterial color={0x2a1a0a} roughness={0.4} metalness={0.3} />
      </mesh>

      {BOARD_SQUARES.map(({ sq, x, z, isLight }) =>
        isLight ? (
          // Light tiles — standard material, register mesh ref via callback
          <mesh
            key={sq}
            position={[x, 0, z]}
            receiveShadow
            ref={(m) => {
              if (m) {
                tileMeshes.current.set(sq, m);
                tileMats.current.set(sq, m.material as THREE.MeshStandardMaterial);
              }
            }}
          >
            <boxGeometry args={[0.97, 0.05, 0.97]} />
            <meshStandardMaterial color={theme.lightTile} roughness={0.15} metalness={0.05} />
          </mesh>
        ) : (
          // Dark tiles — reflective surface
          <mesh
            key={sq}
            position={[x, 0, z]}
            receiveShadow
            ref={(m) => {
              if (m) {
                tileMeshes.current.set(sq, m);
                // MeshReflectorMaterial replaces material — store it after mount
                tileMats.current.set(sq, m.material as THREE.MeshStandardMaterial);
              }
            }}
          >
            <boxGeometry args={[0.97, 0.05, 0.97]} />
            <MeshReflectorMaterial
              color={theme.darkTile}
              roughness={0.08}
              metalness={0.15}
              mirror={0.4}
              blur={[200, 100]}
              resolution={256}
              mixBlur={0.8}
              mixStrength={0.6}
              depthScale={0}
              minDepthThreshold={0.9}
              maxDepthThreshold={1}
            />
          </mesh>
        ),
      )}
    </>
  );
}

// ── Floating candles ─────────────────────────────────────────────────────────

// ── Realistic candle flame helpers ───────────────────────────────────────────

/** Layered teardrop flame: cone base + elongated sphere tip */
function buildFlameGroup(baseColor: number): {
  group: THREE.Group;
  mats: THREE.MeshBasicMaterial[];
} {
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const midMat = new THREE.MeshBasicMaterial({
    color: 0xffdd44,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const outerMat = new THREE.MeshBasicMaterial({
    color: baseColor,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  // Inner bright core — tiny upright cone
  const coreGeo = new THREE.ConeGeometry(0.018, 0.1, 6);
  const core = new THREE.Mesh(coreGeo, innerMat);
  core.position.y = 0.05;

  // Mid teardrop — slightly wider cone
  const midGeo = new THREE.ConeGeometry(0.03, 0.13, 7);
  const mid = new THREE.Mesh(midGeo, midMat);
  mid.position.y = 0.065;

  // Outer halo — squashed sphere
  const haloGeo = new THREE.SphereGeometry(0.045, 7, 5);
  const halo = new THREE.Mesh(haloGeo, outerMat);
  halo.scale.y = 1.6;
  halo.position.y = 0.06;

  const group = new THREE.Group();
  group.add(halo, mid, core);
  return { group, mats: [innerMat, midMat, outerMat] };
}

/** Smooth pseudo-random noise: sum of sines at different frequencies */
function flameNoise(t: number, seed: number): number {
  return (
    Math.sin(t * 7.3 + seed * 1.7) * 0.4 +
    Math.sin(t * 13.1 + seed * 2.3) * 0.25 +
    Math.sin(t * 23.7 + seed * 0.9) * 0.15 +
    Math.sin(t * 41.0 + seed * 3.1) * 0.08
  );
}

function FloatingCandles({ candleColor }: { candleColor: number }) {
  const candleGroupsRef = useRef<THREE.Group[]>([]);
  const flameGroupsRef = useRef<THREE.Group[]>([]);
  const lightsRef = useRef<THREE.PointLight[]>([]);
  const flameMatsRef = useRef<THREE.MeshBasicMaterial[][]>([]);
  // Per-candle seed for independent flicker
  const seedsRef = useRef<number[]>([]);
  const { scene } = useThree();

  useEffect(() => {
    const bodyGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.3, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xfff8e0,
      roughness: 0.95,
      metalness: 0,
    });
    // Melted wax pool at top of candle
    const waxGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.008, 8);
    const waxMat = new THREE.MeshStandardMaterial({
      color: 0xfffacc,
      roughness: 0.3,
      metalness: 0,
    });

    for (let i = 0; i < CANDLE_COUNT; i++) {
      const baseAngle = (i / CANDLE_COUNT) * Math.PI * 2;
      const x = Math.cos(baseAngle) * CANDLE_RADIUS;
      const z = Math.sin(baseAngle) * CANDLE_RADIUS;
      seedsRef.current.push(i * 1.618 + 0.42); // golden-ratio seed spacing

      const group = new THREE.Group();
      group.position.set(x, CANDLE_HEIGHT, z);

      // Candle body (hangs below flame tip)
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = -0.22;
      group.add(body);

      // Wax pool at top
      const wax = new THREE.Mesh(waxGeo, waxMat);
      wax.position.y = -0.072;
      group.add(wax);

      // Flame
      const { group: flame, mats } = buildFlameGroup(candleColor);
      group.add(flame);
      flameGroupsRef.current.push(flame);
      flameMatsRef.current.push(mats);

      // Point light — warm orange-amber, tight radius
      const light = new THREE.PointLight(0xff9922, 1.0, 5.5);
      light.position.y = 0.12;
      group.add(light);
      lightsRef.current.push(light);

      scene.add(group);
      candleGroupsRef.current.push(group);
    }

    return () => {
      bodyGeo.dispose();
      bodyMat.dispose();
      waxGeo.dispose();
      waxMat.dispose();
      for (const mats of flameMatsRef.current) mats.forEach((m) => m.dispose());
      for (const g of candleGroupsRef.current) scene.remove(g);
      candleGroupsRef.current = [];
      flameGroupsRef.current = [];
      lightsRef.current = [];
      flameMatsRef.current = [];
      seedsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candleColor]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < candleGroupsRef.current.length; i++) {
      const seed = seedsRef.current[i];
      const baseAngle = (i / CANDLE_COUNT) * Math.PI * 2;

      // Slow orbit
      const angle = baseAngle + t * 0.12;
      const x = Math.cos(angle) * CANDLE_RADIUS;
      const y = CANDLE_HEIGHT + Math.sin(t * 0.4 + seed) * 0.12;
      const z = Math.sin(angle) * CANDLE_RADIUS;
      candleGroupsRef.current[i].position.set(x, y, z);

      // Turbulent flicker: drive flame tilt + scale with noise
      const nx = flameNoise(t, seed);
      const ny = flameNoise(t, seed + 5.0);
      const flicker = 0.5 + 0.5 * Math.abs(flameNoise(t * 0.7, seed + 2.3)); // 0..1

      const flameGroup = flameGroupsRef.current[i];
      // Lean the flame in the wind direction
      flameGroup.rotation.x = nx * 0.18;
      flameGroup.rotation.z = -ny * 0.18;
      // Elongate/squash vertically with flicker
      flameGroup.scale.y = 0.85 + flicker * 0.35;
      flameGroup.scale.x = 0.9 + (1 - flicker) * 0.2;

      // Light intensity follows flicker, with a slow breath underneath
      const breath = 0.85 + 0.15 * Math.sin(t * 1.1 + seed);
      lightsRef.current[i].intensity = (0.7 + flicker * 0.55) * breath;

      // Outer halo opacity dims when flame is stretched tall
      const outerMat = flameMatsRef.current[i][2];
      if (outerMat) outerMat.opacity = 0.35 + flicker * 0.3;
    }
  });

  return null;
}

// ── Main game logic component ─────────────────────────────────────────────────

function GameLogic({
  house,
  controlsRef,
}: {
  house: HouseName;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) {
  const theme = HOUSE_THEMES[house];
  const { scene, camera, gl } = useThree();

  // Incremented when GLTF models finish loading — forces piece useEffect to re-run
  const [modelsVersion, setModelsVersion] = useState(0);
  useEffect(() => {
    onModelsReady(() => setModelsVersion((v) => v + 1));
  }, []);

  // Stable refs — never cause re-renders
  const chessRef = useRef(new Chess());
  const pieceMeshes = useRef(new Map<Square, PieceObject>());
  const tileMeshes = useRef(new Map<Square, THREE.Mesh>());
  const tileMats = useRef(new Map<Square, THREE.MeshStandardMaterial>());
  const highlightMeshes = useRef<THREE.Mesh[]>([]);
  const activeEffects = useRef<CaptureEffect[]>([]);
  const effectsGroup = useRef(new THREE.Group());
  const selectedSquare = useRef<Square | null>(null);
  const legalTargets = useRef<Square[]>([]);
  const animInProgress = useRef(false);
  const soundsRef = useRef<{ move: Howl; check: Howl } | null>(null);
  // Tracks the piece currently in motion + elapsed time for procedural animation
  const movingPiece = useRef<PieceObject | null>(null);
  const moveAnimTime = useRef(0);
  // Per-piece bob spring — keyed by square, created alongside each piece mesh
  const bobSprings = useRef(new Map<Square, Spring>());
  // Per-piece rim-light uniforms — animated on select/deselect
  const rimUniformsMap = useRef(new Map<Square, RimUniforms>());

  // ── Camera helpers ─────────────────────────────────────────────────────────

  const captureCamera = useCallback(
    async (victimPos: THREE.Vector3) => {
      const controls = controlsRef.current;
      if (!controls) return;

      const origPos = camera.position.clone();
      const origTarget = (controls.target as THREE.Vector3).clone();

      // 1. Zoom toward the action
      await gsap.to(camera.position, {
        x: victimPos.x * 0.3,
        y: 3.5,
        z: victimPos.z + 4,
        duration: 0.35,
        ease: 'power2.in',
      });
      gsap.to(controls.target, { x: victimPos.x, y: 0, z: victimPos.z, duration: 0.35 });

      // 2. Hold at impact
      await new Promise<void>((r) => setTimeout(r, 400));

      // 3. Pull back to original position
      await gsap.to(camera.position, {
        x: origPos.x,
        y: origPos.y,
        z: origPos.z,
        duration: 0.7,
        ease: 'power2.out',
      });
      gsap.to(controls.target, {
        x: origTarget.x,
        y: origTarget.y,
        z: origTarget.z,
        duration: 0.7,
      });
    },
    [camera, controlsRef],
  );

  const cameraShake = useCallback(
    (intensity = 0.15, duration = 0.4) => {
      const shakeObj = { v: 0 };
      gsap.to(shakeObj, {
        duration,
        v: intensity,
        yoyo: true,
        repeat: 5,
        ease: 'none',
        onUpdate: () => {
          camera.position.x += (Math.random() - 0.5) * shakeObj.v;
          camera.position.y += (Math.random() - 0.5) * shakeObj.v;
        },
      });
    },
    [camera],
  );

  // ── Scene setup ────────────────────────────────────────────────────────────

  useEffect(() => {
    scene.add(effectsGroup.current);
    soundsRef.current = {
      move: new Howl({ src: ['/audio/move.mp3'], volume: 0.5, preload: true }),
      check: new Howl({ src: ['/audio/check.mp3'], volume: 0.7, preload: true }),
    };
    return () => {
      scene.remove(effectsGroup.current);
      soundsRef.current?.move.unload();
      soundsRef.current?.check.unload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Piece factory helper ───────────────────────────────────────────────────

  const buildPieceMesh = useCallback(
    (sq: Square, type: PieceSymbol, color: Color): PieceObject => {
      const [x, z] = squareToXZ(sq);
      const { group, rimUniforms } = createPieceGroup(type, color, house);
      const pieceObj = group as PieceObject;
      pieceObj.position.set(x, 0, z);
      pieceObj.userData = { square: sq, pieceType: type, pieceColor: color };
      bobSprings.current.set(sq, new Spring(120, 20, 1));
      rimUniformsMap.current.set(sq, rimUniforms);
      return pieceObj;
    },
    [house],
  );

  const removePiece = useCallback(
    (sq: Square) => {
      const m = pieceMeshes.current.get(sq);
      if (!m) return;
      scene.remove(m);
      disposePieceGroup(m);
      pieceMeshes.current.delete(sq);
      bobSprings.current.delete(sq);
      rimUniformsMap.current.delete(sq);
    },
    [scene],
  );

  const reconcilePieces = useCallback(
    (skipSquare: Square) => {
      const chess = chessRef.current;
      const expected = new Map<Square, { type: PieceSymbol; color: Color }>();
      chess.board().forEach((row, rIdx) => {
        row.forEach((piece, fIdx) => {
          if (!piece) return;
          const sq = indicesToSquare(fIdx, 7 - rIdx) as Square;
          expected.set(sq, { type: piece.type, color: piece.color });
        });
      });

      for (const sq of [...pieceMeshes.current.keys()]) {
        if (sq === skipSquare) continue;
        if (!expected.has(sq)) removePiece(sq);
      }

      for (const [sq, piece] of expected) {
        if (sq === skipSquare) continue;
        if (!pieceMeshes.current.has(sq)) {
          const m = buildPieceMesh(sq, piece.type, piece.color);
          scene.add(m);
          pieceMeshes.current.set(sq, m);
        }
      }
    },
    [buildPieceMesh, removePiece, scene],
  );

  // ── Initial piece placement ────────────────────────────────────────────────

  useEffect(() => {
    const chess = chessRef.current;
    chess.board().forEach((row, rIdx) => {
      row.forEach((piece, fIdx) => {
        if (!piece) return;
        const sq = indicesToSquare(fIdx, 7 - rIdx) as Square;
        const m = buildPieceMesh(sq, piece.type, piece.color);
        scene.add(m);
        pieceMeshes.current.set(sq, m);
      });
    });

    return () => {
      for (const m of pieceMeshes.current.values()) {
        scene.remove(m);
        disposePieceGroup(m);
      }
      pieceMeshes.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [house, modelsVersion]); // rebuild pieces when house changes or GLTFs finish loading

  // ── Highlight helpers ──────────────────────────────────────────────────────

  const clearHighlights = useCallback(() => {
    for (const m of highlightMeshes.current) {
      scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    highlightMeshes.current.length = 0;
    for (const [sq, mat] of tileMats.current) {
      mat.color.setHex(isLightSquare(sq) ? theme.lightTile : theme.darkTile);
    }
    // Reset rim glow on all pieces — covers both the selected piece (gold) and
    // any capture-highlighted enemy pieces (red) that were lit by highlightLegalMoves.
    for (const rim of rimUniformsMap.current.values()) {
      gsap.to(rim.uRimIntensity, { value: 0.0, duration: 0.2 });
    }
  }, [scene, theme]);

  const highlightSelected = useCallback(
    (sq: Square) => {
      tileMats.current.get(sq)?.color.setHex(theme.selectedTile);
    },
    [theme],
  );

  const highlightLegalMoves = useCallback(
    (squares: Square[]) => {
      for (const sq of squares) {
        const [x, z] = squareToXZ(sq);
        const isCapture = !!pieceMeshes.current.get(sq);
        const dotColor = isCapture ? 0xff2200 : theme.legalMove;
        const geo = new THREE.CircleGeometry(0.22, 24);
        const mat = new THREE.MeshBasicMaterial({
          color: dotColor,
          transparent: true,
          opacity: 0.78,
          depthWrite: false,
        });
        const circle = new THREE.Mesh(geo, mat);
        circle.rotation.x = -Math.PI / 2;
        circle.position.set(x, 0.06, z);
        scene.add(circle);
        highlightMeshes.current.push(circle);

        // For capturable enemy pieces, add a red/orange rim glow
        if (isCapture) {
          const rimOn = rimUniformsMap.current.get(sq);
          if (rimOn) {
            rimOn.uRimColor.value.set(0xff2200);
            gsap.to(rimOn.uRimIntensity, { value: 2.5, duration: 0.3, ease: 'power2.out' });
          }
        }
      }
    },
    [scene, theme],
  );

  // ── Capture animation ──────────────────────────────────────────────────────

  const playCaptureAnimation = useCallback(
    (movingMesh: PieceObject, capturedMesh: PieceObject): Promise<void> => {
      return new Promise<void>((resolve) => {
        if (activeEffects.current.length >= MAX_ACTIVE_EFFECTS) {
          scene.remove(capturedMesh);
          disposePieceGroup(capturedMesh);
          resolve();
          return;
        }

        // Effects expect a THREE.Mesh victim sitting directly inside effectsGroup.
        // Extract the main lathe mesh from the piece group and re-parent it there.
        let _victimMesh: THREE.Mesh | null = null;
        capturedMesh.traverse((child) => {
          if (child instanceof THREE.Mesh && !_victimMesh) _victimMesh = child as THREE.Mesh;
        });
        if (!_victimMesh) {
          scene.remove(capturedMesh);
          disposePieceGroup(capturedMesh);
          resolve();
          return;
        }
        const victimMesh: THREE.Mesh = _victimMesh;

        // Copy world position into victim mesh so effects can use it directly
        capturedMesh.getWorldPosition(victimMesh.position);
        effectsGroup.current.add(victimMesh);

        // Dispose decoration siblings (cross, crown spikes) and the now-empty group
        capturedMesh.traverse((child) => {
          if (child !== victimMesh && child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        });
        scene.remove(capturedMesh);

        const spell = CAPTURE_ANIMATIONS[movingMesh.userData.pieceType];
        const knightArgs =
          spell === 'knightCharge'
            ? {
                attackerGroup: movingMesh,
                chromaticVec: sharedChromaticVec,
                bloomProxy: sharedBloomProxy,
              }
            : undefined;
        const effect = createCaptureEffect(
          spell,
          effectsGroup.current,
          movingMesh.position.clone(),
          victimMesh,
          resolve,
          knightArgs,
        );
        activeEffects.current.push(effect);
      });
    },
    [scene],
  );

  // ── Move execution ─────────────────────────────────────────────────────────

  const executeMove = useCallback(
    async (fromSq: Square, toSq: Square, movingMesh: PieceObject) => {
      const [tx, tz] = squareToXZ(toSq);
      const isCapture = pieceMeshes.current.has(toSq);

      if (isCapture) {
        const capturedMesh = pieceMeshes.current.get(toSq);
        if (capturedMesh) {
          pieceMeshes.current.delete(toSq);
          const victimPos = capturedMesh.position.clone();
          // Dramatic camera push + shake — fire in parallel with the spell
          captureCamera(victimPos).catch(() => undefined);
          cameraShake(0.12, 0.35);
          await playCaptureAnimation(movingMesh, capturedMesh);
        }
      }

      chessRef.current.move({ from: fromSq, to: toSq, promotion: 'q' });
      pieceMeshes.current.delete(fromSq);
      pieceMeshes.current.set(toSq, movingMesh);
      movingMesh.userData.square = toSq;
      // Migrate spring + rim uniforms to new square key
      const spring = bobSprings.current.get(fromSq);
      if (spring) {
        bobSprings.current.delete(fromSq);
        bobSprings.current.set(toSq, spring);
      }
      const rim = rimUniformsMap.current.get(fromSq);
      if (rim) {
        rimUniformsMap.current.delete(fromSq);
        rimUniformsMap.current.set(toSq, rim);
      }
      reconcilePieces(toSq);

      if (!isCapture) soundsRef.current?.move.play();
      if (chessRef.current.inCheck()) soundsRef.current?.check.play();

      // Kill any in-flight tween on this piece before starting a new one
      gsap.killTweensOf(movingMesh.position);
      gsap.killTweensOf(movingMesh.rotation);
      gsap.killTweensOf(movingMesh.scale);

      const fromY = movingMesh.position.y;
      // Travel direction for lean axis
      const dx = tx - movingMesh.position.x;
      const dz = tz - movingMesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      // Lean axis = perpendicular to travel dir in XZ plane
      const lx = -dz / dist;
      const lz = dx / dist;

      // Start procedural move animation
      movingPiece.current = movingMesh;
      moveAnimTime.current = 0;

      const tl = gsap.timeline({
        onComplete: () => {
          movingMesh.scale.set(1, 1, 1);
          movingMesh.rotation.set(0, 0, 0);
          movingMesh.position.y = 0;
          bobSprings.current.get(toSq)?.reset(0);
          // Reset knight legs to rest pose
          movingMesh.traverse((child) => {
            if (child instanceof THREE.Group && child.userData.role?.startsWith('leg')) {
              child.rotation.x = 0;
            }
          });
          movingPiece.current = null;
          animInProgress.current = false;
        },
      });

      // 1. Anticipation dip + lift off
      tl.to(movingMesh.position, { y: fromY - 0.04, duration: 0.06, ease: 'power2.in' }).to(
        movingMesh.position,
        { y: ARC_HEIGHT, duration: 0.18, ease: 'pickup' },
      );

      // 2. Horizontal travel — overlaps with the lift
      tl.to(
        movingMesh.position,
        {
          x: tx,
          z: tz,
          duration: isCapture ? 0.38 : 0.42,
          ease: isCapture ? 'slam' : 'power2.inOut',
        },
        0.06,
      );

      // 3. Forward lean during travel (peaks at mid-arc, returns on land)
      tl.to(
        movingMesh.rotation,
        { x: lx * 0.2, z: lz * 0.2, duration: 0.2, ease: 'power1.inOut' },
        0.06,
      ).to(movingMesh.rotation, { x: 0, z: 0, duration: 0.18, ease: 'power2.out' }, 0.26);

      // 4. Land — fast drop, elastic settle
      const landStart = isCapture ? 0.36 : 0.4;
      tl.to(movingMesh.position, { y: 0, duration: 0.2, ease: 'land' }, landStart);

      // 5. Squash-and-stretch on impact: squash → overshoot tall → elastic settle
      const impactAt = landStart + 0.16;
      tl.to(
        movingMesh.scale,
        { y: 0.6, x: 1.3, z: 1.3, duration: 0.06, ease: 'power3.in' },
        impactAt,
      )
        .to(movingMesh.scale, { y: 1.15, x: 0.92, z: 0.92, duration: 0.12, ease: 'power2.out' })
        .to(movingMesh.scale, {
          y: 1.0,
          x: 1.0,
          z: 1.0,
          duration: 0.2,
          ease: 'elastic.out(1, 0.4)',
        });
    },
    [captureCamera, cameraShake, playCaptureAnimation, reconcilePieces],
  );

  // ── Pointer interaction ────────────────────────────────────────────────────

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);

  const getClickedSquare = useCallback(
    (e: PointerEvent): Square | null => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // Check piece groups first
      const pieceObjects = [...pieceMeshes.current.values()];
      const pieceHits = raycaster.intersectObjects(pieceObjects, true);
      if (pieceHits.length) {
        // Walk up to find the PieceObject (Group with userData.square)
        let obj: THREE.Object3D | null = pieceHits[0].object;
        while (obj) {
          if ((obj as PieceObject).userData?.square) return (obj as PieceObject).userData.square;
          obj = obj.parent;
        }
      }

      const tileHits = raycaster.intersectObjects([...tileMeshes.current.values()]);
      if (tileHits.length) {
        for (const [sq, mesh] of tileMeshes.current) {
          if (mesh === tileHits[0].object) return sq;
        }
      }
      return null;
    },
    [camera, gl.domElement, raycaster, pointer],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (animInProgress.current) return;

      const sq = getClickedSquare(e);

      if (!sq) {
        clearHighlights();
        selectedSquare.current = null;
        legalTargets.current = [];
        return;
      }

      if (selectedSquare.current && legalTargets.current.includes(sq)) {
        const movingMesh = pieceMeshes.current.get(selectedSquare.current);
        if (!movingMesh) return;

        animInProgress.current = true;
        clearHighlights();
        const fromSq = selectedSquare.current;
        selectedSquare.current = null;
        legalTargets.current = [];

        executeMove(fromSq, sq, movingMesh).catch(() => {
          animInProgress.current = false;
        });
        return;
      }

      const piece = chessRef.current.get(sq);
      if (piece?.color === chessRef.current.turn()) {
        clearHighlights();
        selectedSquare.current = sq;
        highlightSelected(sq);
        legalTargets.current = chessRef.current
          .moves({ square: sq, verbose: true })
          .map((m) => m.to as Square);
        highlightLegalMoves(legalTargets.current);

        // Rim light on — gold for selected piece
        const rimOn = rimUniformsMap.current.get(sq);
        if (rimOn) {
          rimOn.uRimColor.value.set(0xffd700);
          gsap.to(rimOn.uRimIntensity, { value: 2.0, duration: 0.3, ease: 'power2.out' });
        }
        // Rim light off — any previously selected piece
        for (const [rsq, rimOff] of rimUniformsMap.current) {
          if (rsq !== sq) gsap.to(rimOff.uRimIntensity, { value: 0.0, duration: 0.2 });
        }
      } else {
        clearHighlights();
        selectedSquare.current = null;
        legalTargets.current = [];
        // Rim light off — all pieces
        for (const rim of rimUniformsMap.current.values()) {
          gsap.to(rim.uRimIntensity, { value: 0.0, duration: 0.2 });
        }
      }
    },
    [
      camera,
      clearHighlights,
      executeMove,
      getClickedSquare,
      highlightLegalMoves,
      highlightSelected,
    ],
  );

  useEffect(() => {
    gl.domElement.addEventListener('pointerdown', onPointerDown);
    return () => gl.domElement.removeEventListener('pointerdown', onPointerDown);
  }, [gl.domElement, onPointerDown]);

  // ── RAF loop ───────────────────────────────────────────────────────────────

  useFrame((_, delta) => {
    // ── Procedural move animation ─────────────────────────────────────────────
    if (animInProgress.current && movingPiece.current) {
      moveAnimTime.current += delta;
      const t = moveAnimTime.current;
      const piece = movingPiece.current;
      const pieceType = piece.userData.pieceType as string;

      // All pieces: subtle body bounce/gallop oscillation added on top of GSAP arc
      // Only apply during the airborne phase (roughly 0.06–0.56s)
      if (t > 0.06 && t < 0.58) {
        const gallop = Math.sin(t * 18) * 0.025;
        piece.position.y += gallop;
      }

      // Knight only: animate 4 leg groups in a gallop cycle
      if (pieceType === 'n') {
        piece.traverse((child) => {
          if (!(child instanceof THREE.Group)) return;
          const role = child.userData.role as string | undefined;
          if (!role?.startsWith('leg')) return;

          // Each leg pair is offset by half a cycle so front/back alternate
          // Front legs lead, hind legs follow with π offset
          const isFront = role === 'legFL' || role === 'legFR';
          const isLeft = role === 'legFL' || role === 'legHL';
          const phaseOffset = (isFront ? 0 : Math.PI) + (isLeft ? 0 : Math.PI);
          const swing = Math.sin(t * 16 + phaseOffset) * 0.7; // ±0.7 rad swing
          child.rotation.x = swing;
        });
      }
    }

    // Bob springs — only tick when no move animation is running
    if (!animInProgress.current) {
      const sel = selectedSquare.current;
      for (const [sq, mesh] of pieceMeshes.current) {
        const spring = bobSprings.current.get(sq);
        if (!spring) continue;
        spring.target = sq === sel ? 0.28 : 0;
        mesh.position.y = spring.update(delta);
      }
    }

    // Tick spell effects
    for (let i = activeEffects.current.length - 1; i >= 0; i--) {
      activeEffects.current[i].update(delta);
      if (activeEffects.current[i].isComplete) {
        activeEffects.current[i].dispose();
        activeEffects.current.splice(i, 1);
      }
    }
  });

  // Render the board + piece subcomponents imperatively — no JSX output needed
  return (
    <>
      <ChessBoard theme={theme} tileMeshes={tileMeshes} tileMats={tileMats} />
    </>
  );
}

// SceneBackground is rendered as a CSS layer behind the Canvas — see ChessScene JSX.

// ── Post-processing ──────────────────────────────────────────────────────────

function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={sharedBloomProxy.intensity}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.8}
        blendFunction={BlendFunction.ADD}
      />
      <ChromaticAberration
        offset={[sharedChromaticVec.x, sharedChromaticVec.y] as unknown as [number, number]}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette eskil={false} offset={0.15} darkness={0.75} />
    </EffectComposer>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function ChessScene() {
  const house = useHouseStore((s) => s.selectedHouse) ?? 'gryffindor';
  const theme = HOUSE_THEMES[house as HouseName];

  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Background image — rendered as a CSS layer so it bypasses Three.js
          tone mapping and post-processing, preserving full sharpness and colour */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${hogwartsBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
      />
      <Canvas
        style={{ position: 'relative', zIndex: 1 }}
        shadows
        camera={{ position: [0, 12, 10], fov: 45 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.65,
        }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
      >
        {/* Lighting — intentionally dim; candles provide most of the fill */}
        <ambientLight intensity={0.18} color={0xfff0d0} />
        <directionalLight
          position={[6, 14, 8]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-bias={-0.001}
        />
        <directionalLight position={[-5, 6, -8]} intensity={0.4} color={0xaabbff} />

        {/* HDRI — apartment preset is dark, good for candlelit mood */}
        <Environment preset="apartment" background={false} />

        {/* Ambient magic sparkles above board */}
        <Sparkles
          count={50}
          scale={9}
          size={0.6}
          speed={0.2}
          opacity={0.18}
          color={theme.candleColor}
          position={[0, 3.5, 0]}
        />

        {/* Floating candles */}
        <FloatingCandles candleColor={theme.candleColor} />

        {/* Contact shadows — tight scale to avoid the ring artifact */}
        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={0.4}
          scale={10}
          blur={1.5}
          far={6}
          color="#000000"
          frames={1}
        />

        {/* All game logic + board + pieces */}
        <GameLogic house={house as HouseName} controlsRef={controlsRef} />

        {/* Camera controls */}
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={8}
          maxDistance={22}
          enableDamping
          dampingFactor={0.05}
          target={[0, 0, 0]}
        />

        {/* Post-processing */}
        <PostFX />
      </Canvas>
    </div>
  );
}
