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

import { useRef, useEffect, useMemo, useCallback, useState, Fragment } from 'react';
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
import { useGameStore } from '../stores/gameStore';
import { useUserStore } from '../stores/userStore';
import type { GameResult } from '../stores/gameStore';
import { useStockfish } from '../hooks/useStockfish';
import type { Difficulty } from '../utils/difficultyMapping';
import { HOUSE_THEMES } from '../data/houseThemes';
import { CAPTURE_ANIMATIONS } from '../data/captureAnimations';
import { createCaptureEffect } from '../effects/index';
import type { CaptureEffect } from '../effects/index';
import { createPieceGroup, disposePieceGroup } from '../geometry/PieceFactory';
import type { RimUniforms } from '../geometry/PieceFactory';
import { onModelsReady } from '../geometry/gltfPieceCache';
import { Spring } from '../utils/Spring';
import type { HouseName } from '../../../shared/src/index';

// ── Mobile detection (evaluated once at module load) ─────────────────────────
const IS_MOBILE =
  typeof window !== 'undefined' &&
  (window.matchMedia('(max-width: 900px)').matches ||
    window.matchMedia('(pointer: coarse)').matches);

// ── Google Font: Cinzel (fantasy serif for panel headers) ────────────────────
if (typeof document !== 'undefined' && !document.getElementById('hp-cinzel-font')) {
  const l = document.createElement('link');
  l.id = 'hp-cinzel-font';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap';
  document.head.appendChild(l);
}

// ── Victory screen CSS injected once at module load ──────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('hp-victory-styles')) {
  const s = document.createElement('style');
  s.id = 'hp-victory-styles';
  s.textContent = `
    @keyframes vOverlayIn { from { opacity:0 } to { opacity:1 } }
    @keyframes vCardIn { from { opacity:0; transform:scale(0.6) translateY(40px) } to { opacity:1; transform:scale(1) translateY(0) } }
    @keyframes vTrophyBounce { 0%,100%{transform:translateY(0) scale(1)} 40%{transform:translateY(-18px) scale(1.15)} 70%{transform:translateY(-6px) scale(1.05)} }
    @keyframes vTitleGlow { 0%,100%{text-shadow:0 0 20px currentColor,0 0 40px currentColor} 50%{text-shadow:0 0 40px currentColor,0 0 80px currentColor,0 0 120px currentColor} }
    @keyframes vBtnPulse { 0%,100%{box-shadow:0 0 10px currentColor} 50%{box-shadow:0 0 24px currentColor,0 0 40px currentColor} }
    @keyframes fwRise { 0%{transform:translateY(0) scaleY(1);opacity:1} 60%{opacity:1} 100%{transform:translateY(-220px) scaleY(1.3);opacity:0} }
    @keyframes fwBurst { 0%{transform:scale(0);opacity:1} 60%{opacity:.9} 100%{transform:scale(1);opacity:0} }
    @keyframes fwStar { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0.3)} }
    @keyframes vSparkle { 0%,100%{opacity:0;transform:scale(0)} 50%{opacity:1;transform:scale(1)} }
    @keyframes vFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
    @keyframes vDialogIn { from{opacity:0;transform:scale(0.7) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes vDialogRing { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes vDialogRingRev { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
    @keyframes vWarnPulse { 0%,100%{filter:drop-shadow(0 0 6px #ffcc44) drop-shadow(0 0 12px #ff8800)} 50%{filter:drop-shadow(0 0 18px #ffdd00) drop-shadow(0 0 36px #ff6600)} }
    @keyframes vShimmerTitle { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
    @keyframes vRuneDrift { 0%,100%{opacity:.12;transform:translateY(0) rotate(0deg)} 50%{opacity:.38;transform:translateY(-10px) rotate(6deg)} }
    @keyframes vBeamIn { from{opacity:0;transform:scaleX(0)} to{opacity:1;transform:scaleX(1)} }
    @keyframes checkAlarm { 0%,100%{opacity:0.18} 50%{opacity:0.52} }
  `;
  document.head.appendChild(s);
}

// ── Module-level singletons shared between PostFX and KnightChargeEffect ─────
// These are plain Three.js objects — not React state — so they live outside
// the component tree and can be mutated freely by both PostFX (useFrame) and
// KnightChargeEffect (GSAP tweens).
const sharedChromaticVec = new THREE.Vector2(0.0003, 0.0003);
const sharedBloomProxy = { intensity: 0.2 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function findKingSquare(
  board: Array<Array<{ type: PieceSymbol; color: Color } | null>>,
  color: Color,
): Square | null {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.type === 'k' && p.color === color) {
        // chess.board() row 0 = rank 8, so rank index = 7 - r
        return indicesToSquare(f, 7 - r);
      }
    }
  }
  return null;
}

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
              blur={IS_MOBILE ? [0, 0] : [200, 100]}
              resolution={IS_MOBILE ? 64 : 256}
              mixBlur={0.8}
              mixStrength={IS_MOBILE ? 0.2 : 0.6}
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

/** Smooth pseudo-random noise: sum of sines at different frequencies */
function flameNoise(t: number, seed: number): number {
  return (
    Math.sin(t * 7.3 + seed * 1.7) * 0.4 +
    Math.sin(t * 13.1 + seed * 2.3) * 0.25 +
    Math.sin(t * 23.7 + seed * 0.9) * 0.15 +
    Math.sin(t * 41.0 + seed * 3.1) * 0.08
  );
}

/** Canvas-based teardrop flame texture — drawn once, tinted per house */
function createFlameTexture(baseColor: number): THREE.CanvasTexture {
  const w = 64,
    h = 96;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const col = new THREE.Color(baseColor);
  const br = Math.round(col.r * 255);
  const bg = Math.round(col.g * 255);
  const bb = Math.round(col.b * 255);

  // Outer halo (house colour)
  const outerG = ctx.createRadialGradient(w / 2, h * 0.5, 0, w / 2, h * 0.45, 28);
  outerG.addColorStop(0, `rgba(${br},${bg},${bb},0.65)`);
  outerG.addColorStop(0.65, `rgba(${Math.min(br + 40, 255)},${Math.round(bg * 0.6)},0,0.28)`);
  outerG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = outerG;
  ctx.beginPath();
  ctx.moveTo(w / 2, 5);
  ctx.bezierCurveTo(w * 0.82, h * 0.22, w * 0.86, h * 0.62, w / 2, h * 0.88);
  ctx.bezierCurveTo(w * 0.14, h * 0.62, w * 0.18, h * 0.22, w / 2, 5);
  ctx.closePath();
  ctx.fill();

  // Yellow-orange mid flame
  const midG = ctx.createRadialGradient(w / 2, h * 0.56, 0, w / 2, h * 0.52, 18);
  midG.addColorStop(0, 'rgba(255,220,60,0.95)');
  midG.addColorStop(0.6, 'rgba(255,145,10,0.5)');
  midG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = midG;
  ctx.beginPath();
  ctx.moveTo(w / 2, 13);
  ctx.bezierCurveTo(w * 0.7, h * 0.28, w * 0.72, h * 0.58, w / 2, h * 0.82);
  ctx.bezierCurveTo(w * 0.28, h * 0.58, w * 0.3, h * 0.28, w / 2, 13);
  ctx.closePath();
  ctx.fill();

  // White inner core
  const coreG = ctx.createRadialGradient(w / 2, h * 0.63, 0, w / 2, h * 0.61, 10);
  coreG.addColorStop(0, 'rgba(255,255,245,1)');
  coreG.addColorStop(0.55, 'rgba(255,225,130,0.65)');
  coreG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = coreG;
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.63, 8, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(c);
}

/** Single-blob smoke puff texture */
function createSmokeTexture(): THREE.CanvasTexture {
  const s = 32;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(210,210,230,0.55)');
  g.addColorStop(0.5, 'rgba(160,160,195,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

interface SmokePuff {
  sprite: THREE.Sprite;
  ci: number;
  age: number;
  maxAge: number;
  driftX: number;
}

function FloatingCandles({ candleColor }: { candleColor: number }) {
  const candleGroupsRef = useRef<THREE.Group[]>([]);
  const spritesRef = useRef<THREE.Sprite[]>([]);
  const lightsRef = useRef<THREE.PointLight[]>([]);
  const seedsRef = useRef<number[]>([]);
  const smokeRef = useRef<SmokePuff[]>([]);
  const { scene } = useThree();

  useEffect(() => {
    const flameTex = createFlameTexture(candleColor);
    const smokeTex = createSmokeTexture();

    const bodyGeo = new THREE.CylinderGeometry(0.015, 0.027, 0.32, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xfff8e0, roughness: 0.95 });
    const waxGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.007, 8);
    const waxMat = new THREE.MeshStandardMaterial({ color: 0xfffacc, roughness: 0.3 });
    const dripGeo = new THREE.CylinderGeometry(0.003, 0.008, 0.058, 5);
    const dripMat = new THREE.MeshStandardMaterial({ color: 0xfff3c8, roughness: 0.88 });
    const dripMats: THREE.MeshStandardMaterial[] = [];

    for (let i = 0; i < CANDLE_COUNT; i++) {
      const baseAngle = (i / CANDLE_COUNT) * Math.PI * 2;
      const x = Math.cos(baseAngle) * CANDLE_RADIUS;
      const z = Math.sin(baseAngle) * CANDLE_RADIUS;
      const seed = i * 1.618 + 0.42;
      seedsRef.current.push(seed);

      const group = new THREE.Group();
      group.position.set(x, CANDLE_HEIGHT, z);

      // Tapered candle body
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = -0.21;
      group.add(body);

      // Melted wax pool at top
      const wax = new THREE.Mesh(waxGeo, waxMat);
      wax.position.y = -0.05;
      group.add(wax);

      // Wax drip — random side
      const dripAngle = seed * 2.4;
      const dm = dripMat.clone();
      dripMats.push(dm);
      const drip = new THREE.Mesh(dripGeo, dm);
      drip.position.set(Math.cos(dripAngle) * 0.018, -0.1, Math.sin(dripAngle) * 0.018);
      drip.rotation.z = Math.cos(dripAngle) * 0.35;
      drip.rotation.x = Math.sin(dripAngle) * 0.35;
      group.add(drip);

      // Flame sprite (billboard — always faces camera automatically)
      const flameMat = new THREE.SpriteMaterial({
        map: flameTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.92,
      });
      const flame = new THREE.Sprite(flameMat);
      flame.scale.set(0.115, 0.165, 1);
      flame.position.y = 0.06;
      group.add(flame);
      spritesRef.current.push(flame);

      // Smoke wisp above flame
      const sm = new THREE.SpriteMaterial({
        map: smokeTex,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      const smoke = new THREE.Sprite(sm);
      const startProgress = i / CANDLE_COUNT; // stagger phases
      smoke.scale.setScalar(0.05);
      smoke.position.y = 0.1 + startProgress * 0.3;
      group.add(smoke);
      smokeRef.current.push({
        sprite: smoke,
        ci: i,
        age: startProgress * 2.2,
        maxAge: 1.8 + (seed % 1.0) * 0.8,
        driftX: seed,
      });

      // Point light — warm orange-amber
      const light = new THREE.PointLight(0xff9a22, 1.1, 5.8);
      light.position.y = 0.14;
      group.add(light);
      lightsRef.current.push(light);

      scene.add(group);
      candleGroupsRef.current.push(group);
    }

    return () => {
      flameTex.dispose();
      smokeTex.dispose();
      bodyGeo.dispose();
      bodyMat.dispose();
      waxGeo.dispose();
      waxMat.dispose();
      dripGeo.dispose();
      dripMat.dispose();
      dripMats.forEach((m) => m.dispose());
      for (const s of spritesRef.current) (s.material as THREE.SpriteMaterial).dispose();
      for (const s of smokeRef.current) (s.sprite.material as THREE.SpriteMaterial).dispose();
      for (const g of candleGroupsRef.current) scene.remove(g);
      candleGroupsRef.current = [];
      spritesRef.current = [];
      lightsRef.current = [];
      seedsRef.current = [];
      smokeRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candleColor]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;

    for (let i = 0; i < candleGroupsRef.current.length; i++) {
      const seed = seedsRef.current[i];
      const baseAngle = (i / CANDLE_COUNT) * Math.PI * 2;

      // Slow orbit
      const angle = baseAngle + t * 0.12;
      const y = CANDLE_HEIGHT + Math.sin(t * 0.4 + seed) * 0.12;
      candleGroupsRef.current[i].position.set(
        Math.cos(angle) * CANDLE_RADIUS,
        y,
        Math.sin(angle) * CANDLE_RADIUS,
      );

      // Turbulent flicker
      const nx = flameNoise(t, seed);
      const flicker = 0.5 + 0.5 * Math.abs(flameNoise(t * 0.7, seed + 2.3));

      const sprite = spritesRef.current[i];
      if (sprite) {
        sprite.material.rotation = nx * 0.18;
        sprite.scale.x = 0.1 + (1 - flicker) * 0.025;
        sprite.scale.y = 0.14 + flicker * 0.048;
        sprite.material.opacity = 0.68 + flicker * 0.3;
      }

      // Light breath
      const breath = 0.85 + 0.15 * Math.sin(t * 1.1 + seed);
      lightsRef.current[i].intensity = (0.72 + flicker * 0.58) * breath;
    }

    // Smoke wisps
    for (const s of smokeRef.current) {
      s.age += delta * 0.42;
      if (s.age >= s.maxAge) {
        s.age = 0;
        s.sprite.position.y = 0.1;
        s.sprite.scale.setScalar(0.04);
        (s.sprite.material as THREE.SpriteMaterial).opacity = 0;
      } else {
        const p = s.age / s.maxAge;
        s.sprite.position.y = 0.1 + p * 0.38;
        s.sprite.position.x = Math.sin(p * 4.5 + s.driftX) * 0.045;
        s.sprite.scale.setScalar(0.04 + p * 0.09);
        const opac = p < 0.25 ? (p / 0.25) * 0.22 : (1 - (p - 0.25) / 0.75) * 0.22;
        (s.sprite.material as THREE.SpriteMaterial).opacity = opac;
      }
    }
  });

  return null;
}

// ── Wizard fireworks (Three.js particle bursts) ───────────────────────────────

const FW_MAX = 4000;

interface FWParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  r: number;
  g: number;
  b: number;
}

function WizardFireworks({ active, colors }: { active: boolean; colors: number[] }) {
  const particles = useRef<FWParticle[]>([]);
  const posArr = useRef(new Float32Array(FW_MAX * 3));
  const colArr = useRef(new Float32Array(FW_MAX * 3));
  const geoRef = useRef<THREE.BufferGeometry | null>(null);
  const matRef = useRef<THREE.PointsMaterial | null>(null);
  const nextBurst = useRef(0);
  const { scene } = useThree();

  useEffect(() => {
    const geo = new THREE.BufferGeometry();
    const posBuf = new THREE.BufferAttribute(posArr.current, 3);
    const colBuf = new THREE.BufferAttribute(colArr.current, 3);
    posBuf.setUsage(THREE.DynamicDrawUsage);
    colBuf.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posBuf);
    geo.setAttribute('color', colBuf);
    geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    geoRef.current = geo;
    matRef.current = mat;
    scene.add(pts);
    return () => {
      scene.remove(pts);
      geo.dispose();
      mat.dispose();
    };
  }, [scene]);

  useFrame((_, dt) => {
    if (!active && particles.current.length === 0) return;

    if (active) {
      nextBurst.current -= dt;
      if (nextBurst.current <= 0) {
        // spawn burst
        const bx = (Math.random() - 0.5) * 10;
        const by = 4 + Math.random() * 6;
        const bz = (Math.random() - 0.5) * 10;
        const hex = colors[Math.floor(Math.random() * colors.length)];
        const c = new THREE.Color(hex);
        const c2 = new THREE.Color(0xffffff);
        for (let i = 0; i < 100; i++) {
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          const spd = 2.5 + Math.random() * 5;
          const col = Math.random() < 0.25 ? c2 : c;
          particles.current.push({
            x: bx,
            y: by,
            z: bz,
            vx: Math.sin(ph) * Math.cos(th) * spd,
            vy: Math.cos(ph) * spd * 0.7 + 1.5,
            vz: Math.sin(ph) * Math.sin(th) * spd,
            age: 0,
            life: 1.0 + Math.random() * 1.2,
            r: col.r,
            g: col.g,
            b: col.b,
          });
        }
        // golden trail streaks
        for (let i = 0; i < 20; i++) {
          const gc = new THREE.Color(0xffd700);
          const th = Math.random() * Math.PI * 2;
          const spd = 6 + Math.random() * 4;
          particles.current.push({
            x: bx,
            y: by,
            z: bz,
            vx: Math.cos(th) * spd,
            vy: (Math.random() - 0.3) * 3,
            vz: Math.sin(th) * spd,
            age: 0,
            life: 0.5 + Math.random() * 0.5,
            r: gc.r,
            g: gc.g,
            b: gc.b,
          });
        }
        nextBurst.current = 0.25 + Math.random() * 0.35;
      }
    }

    const pos = posArr.current;
    const col = colArr.current;
    const alive: FWParticle[] = [];
    let n = 0;

    for (const p of particles.current) {
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vy -= 5 * dt;
      p.vx *= 1 - 1.2 * dt;
      p.vz *= 1 - 1.2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const fade = Math.pow(1 - p.age / p.life, 1.5);
      if (n < FW_MAX) {
        const i = n * 3;
        pos[i] = p.x;
        pos[i + 1] = p.y;
        pos[i + 2] = p.z;
        col[i] = p.r * fade;
        col[i + 1] = p.g * fade;
        col[i + 2] = p.b * fade;
        n++;
      }
      alive.push(p);
    }
    particles.current = alive;

    if (geoRef.current) {
      geoRef.current.setDrawRange(0, n);
      (geoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  return null;
}

// ── Main game logic component ─────────────────────────────────────────────────

function GameLogic({
  house,
  controlsRef,
  aiColor,
  difficulty,
}: {
  house: HouseName;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  aiColor: 'w' | 'b' | null;
  difficulty: Difficulty;
}) {
  const theme = HOUSE_THEMES[house];
  const { scene, camera, gl } = useThree();

  // Incremented when GLTF models finish loading — forces piece useEffect to re-run
  const [modelsVersion, setModelsVersion] = useState(0);
  useEffect(() => {
    onModelsReady(() => setModelsVersion((v) => v + 1));
  }, []);

  // Reset game history state when a new game mounts
  useEffect(() => {
    const store = useGameStore.getState();
    store.setMoveHistory([]);
    store.setCapturedByWhite([]);
    store.setCapturedByBlack([]);
    store.setCheckKingSquare(null);
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
  const aiTurnActive = useRef(false);
  const soundsRef = useRef<{ move: Howl; check: Howl } | null>(null);

  const { requestMove, ready: engineReady } = useStockfish(aiColor !== null);
  // Tracks the piece currently in motion + elapsed time for procedural animation
  const movingPiece = useRef<PieceObject | null>(null);
  const moveAnimTime = useRef(0);
  // Per-piece bob spring — keyed by square, created alongside each piece mesh
  const bobSprings = useRef(new Map<Square, Spring>());
  // Per-piece rim-light uniforms — animated on select/deselect
  const rimUniformsMap = useRef(new Map<Square, RimUniforms>());
  // Tracks king square currently in check — for tile pulse cleanup in useFrame
  const checkKingSquareRef = useRef<Square | null>(null);
  // Tracks piece meshes that have been colour-tinted for highlights, so we can restore them.
  // We clone the material before tinting so shared material instances are not mutated globally.
  const tintedMeshes = useRef<{ mesh: THREE.Mesh; origMat: THREE.MeshStandardMaterial }[]>([]);

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
    const eg = effectsGroup.current;
    scene.add(eg);
    soundsRef.current = {
      move: new Howl({ src: ['/audio/move.mp3'], volume: 0.5, preload: true }),
      check: new Howl({ src: ['/audio/check.mp3'], volume: 0.7, preload: true }),
    };
    return () => {
      scene.remove(eg);
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

    const pm = pieceMeshes.current;
    return () => {
      for (const m of pm.values()) {
        scene.remove(m);
        disposePieceGroup(m);
      }
      pm.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [house, modelsVersion]); // rebuild pieces when house changes or GLTFs finish loading

  // ── Highlight helpers ──────────────────────────────────────────────────────

  // Tint all standard meshes in a piece group to a target colour.
  // Clones the material per-mesh so shared material instances are not globally mutated.
  const tintPiece = useCallback(
    (pieceObj: PieceObject, color: number, emissive: number, emissiveIntensity: number) => {
      pieceObj.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const origMat = child.material as THREE.MeshStandardMaterial;
        if (!origMat.color) return;
        const cloned = origMat.clone();
        cloned.color.setHex(color);
        cloned.emissive.setHex(emissive);
        cloned.emissiveIntensity = emissiveIntensity;
        cloned.needsUpdate = true;
        child.material = cloned;
        tintedMeshes.current.push({ mesh: child, origMat });
      });
    },
    [],
  );

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
    // Restore original shared material and dispose the per-highlight clone
    for (const { mesh, origMat } of tintedMeshes.current) {
      (mesh.material as THREE.MeshStandardMaterial).dispose();
      mesh.material = origMat;
    }
    tintedMeshes.current.length = 0;
    // Reset rim glow on all pieces
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

        // For capturable enemy pieces — tint the piece mesh red + rim glow
        if (isCapture) {
          const enemyPiece = pieceMeshes.current.get(sq);
          if (enemyPiece) tintPiece(enemyPiece, 0xcc1100, 0x660000, 0.4);
          const rimOn = rimUniformsMap.current.get(sq);
          if (rimOn) {
            rimOn.uRimColor.value.set(0xff2200);
            gsap.to(rimOn.uRimIntensity, { value: 2.5, duration: 0.3, ease: 'power2.out' });
          }
        }
      }
    },
    [scene, theme, tintPiece],
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

  // ── Castling rook animation ────────────────────────────────────────────────

  // Slides the rook to its post-castling square immediately after the king lands.
  // chess.js has already applied the move by this point, so we just animate the mesh.
  const animateCastlingRook = useCallback((rookFromSq: Square, rookToSq: Square): Promise<void> => {
    return new Promise<void>((resolve) => {
      const rookMesh = pieceMeshes.current.get(rookFromSq);
      if (!rookMesh) {
        resolve();
        return;
      }

      const [rx, rz] = squareToXZ(rookToSq);

      // Update data structures before the tween so raycasting is correct
      pieceMeshes.current.delete(rookFromSq);
      pieceMeshes.current.set(rookToSq, rookMesh);
      rookMesh.userData.square = rookToSq;
      const rookSpring = bobSprings.current.get(rookFromSq);
      if (rookSpring) {
        bobSprings.current.delete(rookFromSq);
        bobSprings.current.set(rookToSq, rookSpring);
      }
      const rookRim = rimUniformsMap.current.get(rookFromSq);
      if (rookRim) {
        rimUniformsMap.current.delete(rookFromSq);
        rimUniformsMap.current.set(rookToSq, rookRim);
      }

      gsap.killTweensOf(rookMesh.position);
      // Low arc — rook glides with a shallow hop
      gsap.to(rookMesh.position, {
        x: rx,
        z: rz,
        duration: 0.35,
        ease: 'power2.inOut',
        onComplete: resolve,
      });
      gsap.to(rookMesh.position, {
        y: 0.6,
        duration: 0.175,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      });
    });
  }, []);

  // ── Game-over detection ────────────────────────────────────────────────────

  const detectGameOver = useCallback(() => {
    const chess = chessRef.current;
    if (!chess.isGameOver()) return;
    let result: NonNullable<GameResult>;
    if (chess.isCheckmate()) {
      result = { winner: chess.turn() === 'w' ? 'b' : 'w', reason: 'checkmate' };
    } else {
      result = { winner: null, reason: chess.isStalemate() ? 'stalemate' : 'draw' };
    }
    useGameStore.getState().setMoveCount(chess.history().length);
    useGameStore.getState().setGameResult(result);
  }, []);

  // ── Sync move history + captured pieces into store ────────────────────────

  const syncGameHistory = useCallback(() => {
    const chess = chessRef.current;
    const san = chess.history();
    const verbose = chess.history({ verbose: true });
    const capW: string[] = [];
    const capB: string[] = [];
    for (const m of verbose) {
      if (m.captured) {
        if (m.color === 'w') capW.push(m.captured);
        else capB.push(m.captured);
      }
    }
    const store = useGameStore.getState();
    store.setMoveHistory(san);
    store.setCapturedByWhite(capW);
    store.setCapturedByBlack(capB);
  }, []);

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

      // Detect castling before chess.js applies the move.
      // chess.js encodes castling as a king moving 2 squares horizontally.
      const movingPieceData = chessRef.current.get(fromSq);
      const isCastling =
        movingPieceData?.type === 'k' && Math.abs(fromSq.charCodeAt(0) - toSq.charCodeAt(0)) === 2;

      // Determine rook squares before the move mutates chess.js state
      let rookFromSq: Square | null = null;
      let rookToSq: Square | null = null;
      if (isCastling) {
        const rank = fromSq[1]; // '1' or '8'
        const isKingside = toSq[0] === 'g';
        rookFromSq = (isKingside ? `h${rank}` : `a${rank}`) as Square;
        rookToSq = (isKingside ? `f${rank}` : `d${rank}`) as Square;
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
      // Pass both king dest and rook dest as skip squares so reconcilePieces
      // doesn't teleport either piece while they are mid-animation.
      reconcilePieces(toSq);

      if (!isCapture) soundsRef.current?.move.play();
      const chess = chessRef.current;
      if (chess.inCheck()) {
        soundsRef.current?.check.play();
        useGameStore.getState().setCheckKingSquare(findKingSquare(chess.board(), chess.turn()));
      } else {
        useGameStore.getState().setCheckKingSquare(null);
      }

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

          // Animate rook after king lands (castling only)
          if (isCastling && rookFromSq && rookToSq) {
            animateCastlingRook(rookFromSq, rookToSq)
              .then(() => {
                animInProgress.current = false;
                detectGameOver();
                syncGameHistory();
                useGameStore.getState().setCurrentTurn(chessRef.current.turn());
              })
              .catch(() => {
                animInProgress.current = false;
              });
          } else {
            animInProgress.current = false;
            detectGameOver();
            syncGameHistory();
            useGameStore.getState().setCurrentTurn(chessRef.current.turn());
          }
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
    [
      animateCastlingRook,
      captureCamera,
      cameraShake,
      detectGameOver,
      playCaptureAnimation,
      reconcilePieces,
      syncGameHistory,
    ],
  );

  // ── AI move trigger ────────────────────────────────────────────────────────

  const triggerAiMove = useCallback(async () => {
    if (!engineReady) return;
    aiTurnActive.current = true;

    // Wait for human animation to finish (and chess.js state to be updated by executeMove)
    await new Promise<void>((resolve) => {
      const check = () => {
        if (animInProgress.current) {
          setTimeout(check, 50);
          return;
        }
        resolve();
      };
      check();
    });

    if (
      chessRef.current.isGameOver() ||
      (aiColor !== null && chessRef.current.turn() !== aiColor)
    ) {
      aiTurnActive.current = false;
      return;
    }

    const uciMove = await requestMove(chessRef.current.fen(), difficulty);
    if (!uciMove) {
      aiTurnActive.current = false;
      return;
    }

    const fromSq = uciMove.slice(0, 2) as Square;
    const toSq = uciMove.slice(2, 4) as Square;
    const mesh = pieceMeshes.current.get(fromSq);
    if (!mesh) {
      aiTurnActive.current = false;
      return;
    }

    animInProgress.current = true;
    aiTurnActive.current = false;
    executeMove(fromSq, toSq, mesh).catch(() => {
      animInProgress.current = false;
    });
  }, [aiColor, engineReady, requestMove, difficulty, executeMove]);

  // When AI plays white it must move first; fire after engine is ready and pieces loaded
  useEffect(() => {
    if (aiColor === 'w' && engineReady && modelsVersion > 0) {
      const t = setTimeout(() => {
        triggerAiMove();
      }, 800);
      return () => clearTimeout(t);
    }
  }, [aiColor, engineReady, modelsVersion, triggerAiMove]);

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
      if (animInProgress.current || aiTurnActive.current) return;

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
        if (aiColor !== null) triggerAiMove();
        return;
      }

      const piece = chessRef.current.get(sq);
      // In AI mode: restrict human to their color only when engine is ready.
      // If engine hasn't loaded, allow both colors so the game is never stuck.
      const humanColor: 'w' | 'b' =
        aiColor === null || !engineReady ? chessRef.current.turn() : aiColor === 'w' ? 'b' : 'w';
      if (piece && piece.color === chessRef.current.turn() && piece.color === humanColor) {
        clearHighlights();
        selectedSquare.current = sq;
        highlightSelected(sq);
        legalTargets.current = chessRef.current
          .moves({ square: sq, verbose: true })
          .map((m) => m.to as Square);
        highlightLegalMoves(legalTargets.current);

        // Tint selected piece gold + rim glow
        const selectedPiece = pieceMeshes.current.get(sq);
        if (selectedPiece) tintPiece(selectedPiece, 0xffcc00, 0xffaa00, 0.35);
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
      aiColor,
      clearHighlights,
      engineReady,
      executeMove,
      getClickedSquare,
      highlightLegalMoves,
      highlightSelected,
      tintPiece,
      triggerAiMove,
    ],
  );

  useEffect(() => {
    gl.domElement.addEventListener('pointerdown', onPointerDown);
    return () => gl.domElement.removeEventListener('pointerdown', onPointerDown);
  }, [gl.domElement, onPointerDown]);

  // ── RAF loop ───────────────────────────────────────────────────────────────

  useFrame(({ clock }, delta) => {
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

    // ── Check alarm — pulse king tile red ────────────────────────────────────
    const newCheckSq = useGameStore.getState().checkKingSquare as Square | null;

    if (checkKingSquareRef.current && checkKingSquareRef.current !== newCheckSq) {
      const oldMat = tileMats.current.get(checkKingSquareRef.current);
      if (oldMat) {
        oldMat.emissive.setRGB(0, 0, 0);
        oldMat.emissiveIntensity = 0;
        oldMat.color.setHex(
          isLightSquare(checkKingSquareRef.current) ? theme.lightTile : theme.darkTile,
        );
      }
    }
    checkKingSquareRef.current = newCheckSq;

    if (newCheckSq) {
      const mat = tileMats.current.get(newCheckSq);
      if (mat) {
        const pulse = 0.5 + 0.5 * Math.abs(Math.sin(clock.getElapsedTime() * Math.PI * 3));
        mat.emissive.setRGB(0.9, 0, 0);
        mat.emissiveIntensity = 0.4 + pulse * 0.7;
        mat.color.setRGB(0.45 + pulse * 0.25, 0.02, 0.02);
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

// ── Victory overlay ───────────────────────────────────────────────────────────

function VictoryOverlay({
  result,
  theme,
  gameMode,
  aiColor,
  moveCount,
  durationSecs,
  onPlayAgain,
  onMainMenu,
}: {
  result: NonNullable<GameResult>;
  theme: (typeof HOUSE_THEMES)[HouseName];
  gameMode: string | null;
  aiColor: 'w' | 'b';
  moveCount: number;
  durationSecs: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}) {
  const user = useUserStore((s) => s.user);
  const signInWithGoogle = useUserStore((s) => s.signInWithGoogle);
  const saveGameRecord = useUserStore((s) => s.saveGameRecord);
  const house = useHouseStore((s) => s.selectedHouse);
  const difficulty = useGameStore((s) => s.difficulty);

  useEffect(() => {
    if (!user || !house) return;
    const isAiMode = gameMode === 'ai';
    let recordResult: 'win' | 'loss' | 'draw';
    if (result.reason === 'checkmate') {
      if (isAiMode) {
        recordResult = result.winner !== aiColor ? 'win' : 'loss';
      } else {
        recordResult = 'win';
      }
    } else {
      recordResult = 'draw';
    }
    saveGameRecord({
      house,
      game_mode: isAiMode ? 'ai' : 'human',
      difficulty: isAiMode ? difficulty : null,
      result: recordResult,
      reason: result.reason,
      move_count: moveCount,
      duration_secs: durationSecs,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accent = theme.accentColor ?? '#ffd700';
  const isCheckmate = result.reason === 'checkmate';

  let headline = 'DRAW';
  let subline =
    result.reason === 'stalemate' ? 'Stalemate — Honour to Both!' : 'The Board Is Balanced';
  let winnerGlow = accent;

  if (isCheckmate) {
    if (gameMode === 'ai') {
      const humanWon = result.winner !== aiColor;
      headline = humanWon ? 'VICTORY!' : 'DEFEATED!';
      subline = humanWon ? 'You have bested the Dark Wizard!' : 'The Dark Wizard reigns supreme.';
      winnerGlow = humanWon ? '#ffd700' : '#cc3333';
    } else {
      headline = result.winner === 'w' ? 'WHITE WINS!' : 'BLACK WINS!';
      subline = 'Checkmate — the king falls!';
    }
  }

  // Lazy-init random positions once on mount; colour derives from accent prop
  const [sparkBase] = useState(() =>
    Array.from({ length: 24 }, () => ({
      dx: `${((Math.random() - 0.5) * 600) | 0}px`,
      dy: `${((Math.random() - 0.5) * 400) | 0}px`,
      delay: (Math.random() * 1.5).toFixed(2),
      left: `${(20 + Math.random() * 60).toFixed(1)}%`,
      top: `${(20 + Math.random() * 60).toFixed(1)}%`,
    })),
  );
  const sparks = sparkBase.map((s, i) => ({
    ...s,
    color: i % 3 === 0 ? accent : i % 3 === 1 ? '#ffffff' : '#ffd700',
  }));

  const [burstBase] = useState(() =>
    Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * 360;
      const radius = 30 + Math.random() * 20;
      return {
        cx: 50 + Math.cos((angle * Math.PI) / 180) * radius,
        cy: 50 + Math.sin((angle * Math.PI) / 180) * radius * 0.6,
        delay: (i * 0.18).toFixed(2),
        size: 80 + Math.floor(Math.random() * 80),
        parity: i % 2,
      };
    }),
  );
  const bursts = burstBase.map((b) => ({ ...b, color: b.parity === 0 ? accent : '#ffffff' }));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'vOverlayIn 0.5s ease forwards',
        overflow: 'hidden',
      }}
    >
      {/* CSS burst rings */}
      {bursts.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${b.cx}%`,
            top: `${b.cy}%`,
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            border: `3px solid ${b.color}`,
            transform: 'scale(0)',
            opacity: 0,
            animation: `fwBurst 1.2s ease-out ${b.delay}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* CSS star sparks */}
      {sparks.map((sp, i) => (
        <div
          key={`s${i}`}
          style={
            {
              position: 'absolute',
              left: sp.left,
              top: sp.top,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: sp.color,
              boxShadow: `0 0 6px ${sp.color}`,
              '--dx': sp.dx,
              '--dy': sp.dy,
              animation: `fwStar 1.5s ease-out ${sp.delay}s infinite`,
              pointerEvents: 'none',
            } as React.CSSProperties
          }
        />
      ))}

      {/* Main card */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          background: `radial-gradient(ellipse at center, #1a1220 0%, #080610 100%)`,
          border: `2px solid ${winnerGlow}`,
          borderRadius: '20px',
          padding: '48px 64px',
          textAlign: 'center',
          fontFamily: '"Georgia","Times New Roman",serif',
          color: '#e8d5a3',
          maxWidth: '480px',
          width: '90vw',
          boxShadow: `0 0 60px ${winnerGlow}66, 0 0 120px ${winnerGlow}33, inset 0 0 40px rgba(0,0,0,0.6)`,
          animation: 'vCardIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
        }}
      >
        {/* Trophy */}
        <div
          style={{
            fontSize: '72px',
            lineHeight: 1,
            marginBottom: '12px',
            animation: isCheckmate
              ? 'vTrophyBounce 1.4s ease-in-out 0.8s infinite'
              : 'vFloat 3s ease-in-out infinite',
          }}
        >
          {isCheckmate
            ? result.winner !== null && (gameMode === 'ai' ? result.winner !== aiColor : true)
              ? '🏆'
              : '💀'
            : '🤝'}
        </div>

        {/* Main headline */}
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 52px)',
            fontWeight: 'bold',
            margin: '0 0 8px',
            color: winnerGlow,
            letterSpacing: '4px',
            animation: 'vTitleGlow 2s ease-in-out 0.6s infinite',
          }}
        >
          {headline}
        </h1>

        {/* Sub line */}
        <p
          style={{
            fontSize: '16px',
            color: '#c8b080',
            margin: '0 0 8px',
            letterSpacing: '1px',
            fontStyle: 'italic',
          }}
        >
          {subline}
        </p>

        {isCheckmate && (
          <p style={{ fontSize: '13px', color: '#888', margin: '0 0 32px', letterSpacing: '2px' }}>
            ✦ CHECKMATE ✦
          </p>
        )}
        {!isCheckmate && <div style={{ marginBottom: '32px' }} />}

        {/* Guest save-progress nudge */}
        {!user && (
          <p
            style={{
              fontSize: '12px',
              color: 'rgba(255,215,0,0.55)',
              marginBottom: '20px',
              letterSpacing: '1px',
              cursor: 'pointer',
            }}
            onClick={signInWithGoogle}
          >
            ✦ Sign in with Google to save your progress
          </p>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onPlayAgain}
            style={{
              padding: '12px 32px',
              borderRadius: '28px',
              border: `2px solid ${accent}`,
              background: `linear-gradient(135deg, ${accent}33, ${accent}11)`,
              color: accent,
              fontFamily: '"Georgia","Times New Roman",serif',
              fontSize: '15px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              cursor: 'pointer',
              animation: `vBtnPulse 2s ease-in-out 1s infinite`,
            }}
          >
            ⚡ Play Again
          </button>
          <button
            onClick={onMainMenu}
            style={{
              padding: '12px 32px',
              borderRadius: '28px',
              border: '1px solid #555',
              background: 'transparent',
              color: '#aaa',
              fontFamily: '"Georgia","Times New Roman",serif',
              fontSize: '15px',
              letterSpacing: '2px',
              cursor: 'pointer',
            }}
          >
            ← Main Menu
          </button>
        </div>
      </div>
    </div>
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

// ── Scene mood: subtle fog + extra magical sparkles ───────────────────────────

function SceneMood() {
  const { scene } = useThree();
  useEffect(() => {
    const prev = scene.fog;
    // eslint-disable-next-line react-hooks/immutability
    scene.fog = new THREE.Fog(0x080520, 20, 42);

    return () => {
      scene.fog = prev;
    };
  }, [scene]);
  return (
    <>
      {/* Purple motes drifting at board level */}
      <Sparkles
        count={35}
        scale={8}
        size={0.9}
        speed={0.04}
        opacity={0.14}
        color={0x9955ff}
        position={[0, 1.2, 0]}
      />
      {/* Blue macro wisps high above */}
      <Sparkles
        count={18}
        scale={14}
        size={1.4}
        speed={0.025}
        opacity={0.07}
        color={0x3366cc}
        position={[0, 3.5, 0]}
      />
    </>
  );
}

// ── Check alarm — glowing ring at king base (no lights = no tonemapping blowout) ──

function CheckAlarm() {
  const checkKingSquare = useGameStore((s) => s.checkKingSquare);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current || !ring2Ref.current) return;
    const t = clock.getElapsedTime();
    const pulse = 0.5 + 0.5 * Math.abs(Math.sin(t * Math.PI * 3));
    const mat = ringRef.current.material as THREE.MeshBasicMaterial;
    const mat2 = ring2Ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.55 + pulse * 0.45;
    mat2.opacity = 0.3 + pulse * 0.35;
    const s = 0.88 + pulse * 0.16;
    ringRef.current.scale.setScalar(s);
    ring2Ref.current.scale.setScalar(1.1 + pulse * 0.2);
  });

  if (!checkKingSquare) return null;

  const [kx, kz] = squareToXZ(checkKingSquare as Square);

  return (
    <>
      {/* Inner tight ring */}
      <mesh ref={ringRef} position={[kx, 0.04, kz]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.46, 0.07, 8, 48]} />
        <meshBasicMaterial color={0xff1100} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      {/* Outer halo ring */}
      <mesh ref={ring2Ref} position={[kx, 0.03, kz]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.58, 0.04, 8, 48]} />
        <meshBasicMaterial color={0xff4400} transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </>
  );
}

// ── Game Info Panel — captured pieces + move history ─────────────────────────

const PIECE_GLYPHS: Record<string, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
};

const CINZEL = '"Cinzel","Georgia","Times New Roman",serif';
const GOLD = '#ffd060';
const GOLD_DIM = '#c8962a';
const DIVIDER = '1px solid rgba(200,150,40,0.28)';

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: CINZEL,
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        color: GOLD,
        textShadow: `0 0 10px ${GOLD}99, 0 0 20px ${GOLD}44`,
        marginBottom: '8px',
      }}
    >
      {children}
    </div>
  );
}

function CaptureRow({ label, pieces, glow }: { label: string; pieces: string[]; glow: string }) {
  const sorted = [...pieces].sort((a, b) => {
    const order = { q: 0, r: 1, b: 2, n: 3, p: 4, k: 5 };
    return (order[a as keyof typeof order] ?? 9) - (order[b as keyof typeof order] ?? 9);
  });
  return (
    <div style={{ marginBottom: '10px' }}>
      <div
        style={{
          fontFamily: CINZEL,
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '1.8px',
          color: GOLD_DIM,
          marginBottom: '4px',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', minHeight: '22px' }}>
        {sorted.length === 0 ? (
          <span
            style={{
              fontSize: '12px',
              color: '#4a3820',
              fontStyle: 'italic',
              fontFamily: '"Georgia",serif',
            }}
          >
            —
          </span>
        ) : (
          sorted.map((p, i) => (
            <span
              key={i}
              style={{
                fontSize: '18px',
                lineHeight: 1,
                color: glow,
                textShadow: `0 0 8px ${glow}cc`,
                filter: `drop-shadow(0 0 3px ${glow}88)`,
              }}
            >
              {PIECE_GLYPHS[p] ?? '?'}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function GameInfoPanel() {
  const moveHistory = useGameStore((s) => s.moveHistory);
  const capturedByWhite = useGameStore((s) => s.capturedByWhite);
  const capturedByBlack = useGameStore((s) => s.capturedByBlack);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(max-width: 900px)').matches ||
      window.matchMedia('(pointer: coarse)').matches
    );
  });
  const isMobile =
    typeof window !== 'undefined' &&
    (window.matchMedia('(max-width: 900px)').matches ||
      window.matchMedia('(pointer: coarse)').matches);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moveHistory]);

  const movePairs: Array<[string, string?]> = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push([moveHistory[i], moveHistory[i + 1]]);
  }

  if (isMobile && collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: 'absolute',
          top: '170px',
          right: '16px',
          zIndex: 10,
          background: 'rgba(3,1,12,0.85)',
          border: '1px solid rgba(200,150,40,0.45)',
          borderRadius: '20px',
          padding: '6px 14px',
          color: GOLD,
          fontFamily: CINZEL,
          fontSize: '11px',
          letterSpacing: '1.5px',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}
      >
        ≡ Stats
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '170px',
        right: '16px',
        zIndex: 10,
        background: 'rgba(3,1,12,0.88)',
        border: `1px solid rgba(200,150,40,0.45)`,
        borderRadius: '10px',
        padding: '14px 16px',
        fontFamily: CINZEL,
        color: '#f0dfa0',
        backdropFilter: 'blur(14px)',
        width: '192px',
        boxShadow: '0 6px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,220,80,0.08)',
        userSelect: 'none',
      }}
    >
      {isMobile && (
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Minimize stats"
          style={{
            position: 'absolute',
            top: '6px',
            right: '8px',
            background: 'transparent',
            border: 'none',
            color: GOLD_DIM,
            fontSize: '14px',
            cursor: 'pointer',
            padding: '6px',
            minWidth: '32px',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      )}

      {/* Captured */}
      <div style={{ paddingBottom: '12px', marginBottom: '12px', borderBottom: DIVIDER }}>
        <SectionHeader>Captured</SectionHeader>
        <CaptureRow label="By White" pieces={capturedByWhite} glow="#88aaff" />
        <CaptureRow label="By Black" pieces={capturedByBlack} glow="#ffd060" />
      </div>

      {/* Move history */}
      <div>
        <SectionHeader>Moves</SectionHeader>
        <div
          ref={scrollRef}
          style={{
            maxHeight: '240px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: `${GOLD_DIM} transparent`,
          }}
        >
          {movePairs.length === 0 ? (
            <div
              style={{
                fontSize: '12px',
                color: '#6a5030',
                fontStyle: 'italic',
                fontFamily: '"Georgia",serif',
              }}
            >
              No moves yet
            </div>
          ) : (
            movePairs.map(([white, black], idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '26px 1fr 1fr',
                  alignItems: 'center',
                  padding: '3px 4px',
                  borderRadius: '4px',
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(255,200,80,0.05)',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: CINZEL,
                    fontWeight: 600,
                    color: GOLD_DIM,
                    letterSpacing: '0.5px',
                  }}
                >
                  {idx + 1}.
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontFamily: '"Georgia","Times New Roman",serif',
                    fontWeight: 'bold',
                    color: '#ffe566',
                    textShadow: '0 0 6px #ffd06066',
                    letterSpacing: '0.3px',
                  }}
                >
                  {white}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontFamily: '"Georgia","Times New Roman",serif',
                    fontWeight: 'bold',
                    color: '#aabfff',
                    textShadow: '0 0 6px #6688ff44',
                    letterSpacing: '0.3px',
                  }}
                >
                  {black ?? ''}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Game HUD — top-right overlay ──────────────────────────────────────────────

function GameHUD() {
  const gameMode = useGameStore((s) => s.gameMode);
  const aiColor = useGameStore((s) => s.aiColor);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const gameResult = useGameStore((s) => s.gameResult);

  const [totalSecs, setTotalSecs] = useState(0);
  const [moveSecs, setMoveSecs] = useState(0);

  const gameStartRef = useRef<number>(0);
  const moveStartRef = useRef<number>(0);
  useEffect(() => {
    gameStartRef.current = Date.now();
    moveStartRef.current = Date.now();
  }, []);
  const prevTurnRef = useRef<'w' | 'b'>('w');

  // Reset move timer on each turn change
  useEffect(() => {
    if (prevTurnRef.current !== currentTurn) {
      moveStartRef.current = Date.now();
      prevTurnRef.current = currentTurn;
    }
  }, [currentTurn]);

  // Stop clocks when game is over
  useEffect(() => {
    if (gameResult) return;
    const id = setInterval(() => {
      const now = Date.now();
      setTotalSecs(Math.floor((now - gameStartRef.current) / 1000));
      setMoveSecs(Math.floor((now - moveStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [gameResult]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const isWhite = currentTurn === 'w';
  const isAiTurn = gameMode === 'ai' && currentTurn === aiColor;

  const turnLabel =
    gameMode === 'ai'
      ? isAiTurn
        ? '🔮 Oracle…'
        : '⚔ Your Turn'
      : isWhite
        ? '⬜ White to Move'
        : '⬛ Black to Move';

  const turnColor = isWhite ? '#fff8c0' : '#b0b8e0';
  const turnShadow = isWhite ? '0 0 10px rgba(255,230,80,0.7)' : '0 0 10px rgba(100,120,220,0.5)';

  return (
    <div
      style={{
        position: 'absolute',
        top: '72px',
        right: '16px',
        zIndex: 10,
        background: 'rgba(4,2,14,0.82)',
        border: '1px solid rgba(180,140,50,0.35)',
        borderRadius: '10px',
        padding: '12px 18px',
        fontFamily: '"Georgia","Times New Roman",serif',
        color: '#e8d5a3',
        backdropFilter: 'blur(10px)',
        width: '192px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
        userSelect: 'none',
      }}
    >
      {/* Turn indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(180,140,50,0.2)',
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: isWhite ? '#ffe080' : '#7788cc',
            boxShadow: isWhite ? '0 0 6px #ffe080' : '0 0 6px #7788cc',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: '13px',
            fontWeight: 'bold',
            letterSpacing: '0.8px',
            color: turnColor,
            textShadow: turnShadow,
          }}
        >
          {turnLabel}
        </span>
      </div>

      {/* Timers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <div>
          <div
            style={{
              fontSize: '9px',
              letterSpacing: '1.2px',
              color: '#a08040',
              marginBottom: '1px',
            }}
          >
            TOTAL
          </div>
          <div
            style={{ fontFamily: 'monospace', fontSize: '17px', color: '#d8c090', lineHeight: 1 }}
          >
            {fmt(totalSecs)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: '9px',
              letterSpacing: '1.2px',
              color: '#a08040',
              marginBottom: '1px',
            }}
          >
            MOVE
          </div>
          <div
            style={{ fontFamily: 'monospace', fontSize: '17px', color: '#ffd060', lineHeight: 1 }}
          >
            {fmt(moveSecs)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Responsive camera rig (R3F child — must live inside <Canvas>) ────────────

function CameraRig() {
  const { camera, size } = useThree();
  useEffect(() => {
    const portrait = size.height > size.width;
    const small = size.width < 900;
    const fov = small ? (portrait ? 60 : 52) : 45;
    const dist = small ? (portrait ? 14 : 12) : 10;
    const y = small ? 14 : 12;
    const cam = camera as THREE.PerspectiveCamera;
    // eslint-disable-next-line react-hooks/immutability
    cam.fov = fov;
    cam.position.set(0, y, dist);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function ChessScene() {
  const house = useHouseStore((s) => s.selectedHouse) ?? 'gryffindor';
  const resetHouse = useHouseStore((s) => s.resetHouse);
  const theme = HOUSE_THEMES[house as HouseName];
  const {
    gameMode,
    aiColor: aiColorSetting,
    difficulty,
    gameResult,
    setGameResult,
    setMode,
    checkKingSquare,
  } = useGameStore();
  const isInCheck = !!checkKingSquare;
  const resolvedAiColor = gameMode === 'ai' ? aiColorSetting : null;
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Firework colors: house primary + accent + gold
  const fwColors = [
    theme.captureParticleColor,
    parseInt((theme.accentColor ?? '#ffd700').replace('#', ''), 16),
    0xffd700,
    0xffffff,
  ];

  const handlePlayAgain = () => {
    setGameResult(null);
    setMode(null); // return to mode selection, same house
  };

  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <Fragment>
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
          dpr={IS_MOBILE ? [1, 1.5] : [1, 2]}
          performance={{ min: 0.5 }}
        >
          {/* Lighting — intentionally dim; candles provide most of the fill */}
          <ambientLight intensity={0.35} color={0xfff0d0} />
          <directionalLight position={[5, 22, 5]} intensity={1.1} />
          <directionalLight position={[-5, 6, -8]} intensity={0.4} color={0xaabbff} />

          {/* HDRI — apartment preset is dark, good for candlelit mood */}
          <Environment preset="apartment" background={false} />

          {/* Ambient magic sparkles above board */}
          <Sparkles
            count={IS_MOBILE ? 20 : 50}
            scale={9}
            size={0.6}
            speed={0.2}
            opacity={0.18}
            color={theme.candleColor}
            position={[0, 3.5, 0]}
          />

          {/* Scene mood: fog + extra sparkles */}
          <SceneMood />

          {/* Check alarm — red spotlight on king */}
          <CheckAlarm />

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
          <GameLogic
            house={house as HouseName}
            controlsRef={controlsRef}
            aiColor={resolvedAiColor}
            difficulty={difficulty}
          />

          {/* Wizard fireworks — active when game is over */}
          <WizardFireworks active={gameResult !== null} colors={fwColors} />

          {/* Camera controls */}
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.2}
            minDistance={8}
            maxDistance={IS_MOBILE ? 26 : 22}
            enableDamping
            dampingFactor={0.05}
            target={[0, 0, 0]}
          />
          <CameraRig />

          {/* Post-processing */}
          <PostFX />
        </Canvas>

        {/* Check alarm — red vignette overlay */}
        {isInCheck && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              pointerEvents: 'none',
              background:
                'radial-gradient(ellipse at center, transparent 35%, rgba(180,0,0,0.42) 100%)',
              animation: 'checkAlarm 0.33s ease-in-out infinite alternate',
            }}
          />
        )}

        {/* Game HUD — top right */}
        <GameHUD />

        {/* Game Info Panel — captured pieces + move history */}
        <GameInfoPanel />

        {/* Exit button */}
        <button
          onClick={() => setShowExitDialog(true)}
          style={{
            position: 'absolute',
            top: 'calc(16px + var(--safe-top))',
            left: 'calc(16px + var(--safe-left))',
            zIndex: 10,
            background: 'rgba(10,5,20,0.75)',
            border: '1px solid rgba(200,160,60,0.5)',
            borderRadius: '8px',
            color: '#e8d5a3',
            fontFamily: '"Georgia","Times New Roman",serif',
            fontSize: '13px',
            padding: '8px 14px',
            minHeight: '44px',
            cursor: 'pointer',
            letterSpacing: '1px',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,160,60,0.9)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,160,60,0.5)';
          }}
        >
          ← Exit
        </button>
      </div>

      {/* Exit confirmation dialog */}
      {showExitDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'vOverlayIn 0.25s ease both',
          }}
        >
          {/* Card */}
          <div
            style={{
              position: 'relative',
              background:
                'radial-gradient(ellipse at 50% 20%, #201428 0%, #0e0818 55%, #07050f 100%)',
              border: `2px solid ${theme.accentColor ?? '#c8a03c'}`,
              borderRadius: '22px',
              padding: '36px 48px 40px',
              textAlign: 'center',
              fontFamily: '"Georgia","Times New Roman",serif',
              color: '#e8d5a3',
              maxWidth: '420px',
              width: '90vw',
              boxShadow: `0 0 60px ${theme.accentColor ?? '#c8a03c'}55, 0 0 120px ${theme.accentColor ?? '#c8a03c'}22, inset 0 0 50px rgba(0,0,0,0.5)`,
              animation: 'vDialogIn 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.05s both',
              overflow: 'hidden',
            }}
          >
            {/* Top decorative beam */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '22px',
                animation: 'vBeamIn .4s ease .15s both',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: `linear-gradient(to right, transparent, ${theme.accentColor ?? '#c8a03c'}66)`,
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  color: `${theme.accentColor ?? '#c8a03c'}99`,
                  letterSpacing: '4px',
                }}
              >
                ✦ ✦ ✦
              </span>
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: `linear-gradient(to left, transparent, ${theme.accentColor ?? '#c8a03c'}66)`,
                }}
              />
            </div>

            {/* Orbiting warning icon */}
            <div
              style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 18px' }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '-8px',
                  borderRadius: '50%',
                  border: `1px dashed ${theme.accentColor ?? '#c8a03c'}55`,
                  animation: 'vDialogRing 8s linear infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '-2px',
                  borderRadius: '50%',
                  border: `1.5px solid ${theme.accentColor ?? '#c8a03c'}44`,
                  borderTop: `1.5px solid ${theme.accentColor ?? '#c8a03c'}cc`,
                  animation: 'vDialogRingRev 4s linear infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '8px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,160,0,0.22) 0%, transparent 70%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '42px',
                  lineHeight: 1,
                  animation: 'vWarnPulse 2s ease-in-out infinite',
                }}
              >
                ⚠
              </div>
            </div>

            {/* Title */}
            <h2
              style={{
                margin: '0 0 10px',
                fontSize: '22px',
                fontWeight: 'bold',
                letterSpacing: '2px',
                background: `linear-gradient(90deg, ${theme.accentColor ?? '#c8a03c'} 0%, #ffe077 50%, ${theme.accentColor ?? '#c8a03c'} 100%)`,
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'vShimmerTitle 3s linear infinite',
              }}
            >
              Abandon the Quest?
            </h2>

            {/* Body */}
            <p
              style={{
                margin: '0 0 6px',
                fontSize: '14px',
                color: '#c8a878',
                lineHeight: 1.65,
                fontStyle: 'italic',
              }}
            >
              Your battle shall be lost to the ages.
            </p>
            <p
              style={{
                margin: '0 0 22px',
                fontSize: '12px',
                color: '#7a6a50',
                letterSpacing: '0.5px',
              }}
            >
              Are you certain you wish to depart?
            </p>

            {/* Bottom decorative beam */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '22px',
                animation: 'vBeamIn .4s ease .25s both',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: `linear-gradient(to right, transparent, ${theme.accentColor ?? '#c8a03c'}44)`,
                }}
              />
              <span
                style={{
                  fontSize: '10px',
                  color: `${theme.accentColor ?? '#c8a03c'}66`,
                  letterSpacing: '3px',
                }}
              >
                ✦
              </span>
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: `linear-gradient(to left, transparent, ${theme.accentColor ?? '#c8a03c'}44)`,
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
              <button
                onClick={resetHouse}
                style={{
                  padding: '13px 32px',
                  borderRadius: '24px',
                  border: `2px solid ${theme.accentColor ?? '#c8a03c'}`,
                  background: `linear-gradient(135deg, ${theme.accentColor ?? '#c8a03c'}44, ${theme.accentColor ?? '#c8a03c'}22)`,
                  color: theme.accentColor ?? '#c8a03c',
                  fontFamily: '"Georgia","Times New Roman",serif',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  letterSpacing: '1.5px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: `0 0 18px ${theme.accentColor ?? '#c8a03c'}55`,
                  transition: 'all .2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.accentColor ?? '#c8a03c';
                  e.currentTarget.style.color = '#0a0810';
                  e.currentTarget.style.boxShadow = `0 0 28px ${theme.accentColor ?? '#c8a03c'}88`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `linear-gradient(135deg, ${theme.accentColor ?? '#c8a03c'}33, ${theme.accentColor ?? '#c8a03c'}15)`;
                  e.currentTarget.style.color = theme.accentColor ?? '#c8a03c';
                  e.currentTarget.style.boxShadow = `0 0 14px ${theme.accentColor ?? '#c8a03c'}44`;
                }}
              >
                Yes, Depart
              </button>
              <button
                onClick={() => setShowExitDialog(false)}
                style={{
                  padding: '13px 32px',
                  borderRadius: '24px',
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  background: 'rgba(255,255,255,0.09)',
                  color: '#d4c49a',
                  fontFamily: '"Georgia","Times New Roman",serif',
                  fontSize: '14px',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all .2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)';
                  e.currentTarget.style.color = '#e8d5a3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
                  e.currentTarget.style.color = '#b8a880';
                }}
              >
                Stay &amp; Fight
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Victory overlay */}
      {gameResult && (
        <VictoryOverlay
          result={gameResult}
          theme={theme}
          gameMode={gameMode}
          aiColor={aiColorSetting}
          moveCount={useGameStore.getState().moveCount}
          durationSecs={Math.floor(
            (Date.now() - (useGameStore.getState().gameStartedAt ?? Date.now())) / 1000,
          )}
          onPlayAgain={handlePlayAgain}
          onMainMenu={resetHouse}
        />
      )}
    </Fragment>
  );
}
