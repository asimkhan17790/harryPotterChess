/**
 * QueenSword — Queen captures.
 *
 * Sequence:
 *  0.00–0.35s  Sword materialises above victim (flash + silver light)
 *  0.35–1.05s  Sword orbits victim in 2 full revolutions, leaving spark trail
 *  0.75–1.40s  Victim shatters: debris chunks explode outward + bottom-up dissolve
 *  1.40–2.20s  Debris fades + dust settles
 *  READY fires at 1.05s (attacker can proceed)
 *  DONE  at 2.20s
 */

import * as THREE from 'three';
import { Howl } from 'howler';
import type { CaptureEffect } from './types';
import {
  createDebrisExplosion,
  victimStoneColor,
  createParticleBurst,
  prog,
  disposeMeshes,
} from '../utils/captureEffects';
import { CAPTURE_SOUNDS } from '../data/captureSounds';

// ── Bottom-up dissolve shader ─────────────────────────────────────────────────

const dissolveVert = /* glsl */ `
varying vec3 vWorldPos;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const dissolveFrag = /* glsl */ `
varying vec3 vWorldPos;
uniform float uDissolve;   // 0 = intact, 1 = fully gone (bottom to top)
uniform float uBaseY;
uniform float uHeight;
uniform vec3  uEdgeColor;

void main(){
  // Normalised height within the piece (0 = bottom, 1 = top)
  float h = clamp((vWorldPos.y - uBaseY) / max(uHeight, 0.001), 0.0, 1.0);
  // Dissolve sweeps upward: discard pixels below the wave front
  float threshold = uDissolve * 1.1;
  if(h < threshold - 0.06) discard;
  float edge = smoothstep(threshold - 0.06, threshold, h);
  // Glowing edge band
  gl_FragColor = vec4(uEdgeColor * (1.0 - edge) * 4.0, edge * (1.0 - uDissolve));
}`;

// ── Timing ────────────────────────────────────────────────────────────────────

const T = {
  SWORD_APPEAR: 0.0,
  ORBIT_START: 0.35,
  ORBIT_END: 1.05,
  SHATTER_START: 0.75,
  DISSOLVE_START: 0.85,
  DISSOLVE_END: 1.4,
  VICTIM_HIDE: 1.4,
  DEBRIS_FADE_START: 1.4,
  DEBRIS_FADE_END: 2.1,
  READY: 1.05,
  DONE: 2.2,
} as const;

const DEBRIS_COUNT = 18;
const SPARK_COUNT = 24;
const ORBIT_RADIUS = 0.55;
const ORBIT_REVS = 2.2; // full rotations during orbit

export class QueenSwordEffect implements CaptureEffect {
  private elapsed = 0;
  private _done = false;
  private readyFired = false;
  private shatterFired = false;
  private victimHidden = false;
  private dissolveFired = false;

  private group: THREE.Group;
  private victim: THREE.Mesh;
  private onReady: () => void;

  // Sword parts
  private swordGroup: THREE.Group;
  private swordLight: THREE.PointLight;

  // Orbit sparks
  private sparks: THREE.Points | null = null;
  private sparkVels: THREE.Vector3[] = [];

  // Shatter debris
  private debris: THREE.Mesh[] = [];
  private debrisVels: THREE.Vector3[] = [];
  private debrisRots: THREE.Vector3[] = [];

  // Dissolve
  private dissolveMat: THREE.ShaderMaterial;

  // Sounds
  private castSfx: Howl;
  private impactSfx: Howl;

  constructor(
    group: THREE.Group,
    _attackerPos: THREE.Vector3,
    victim: THREE.Mesh,
    onReady: () => void,
  ) {
    this.group = group;
    this.victim = victim;
    this.onReady = onReady;

    const pos = victim.position.clone();

    // ── Build sword ──────────────────────────────────────────────────────────
    this.swordGroup = new THREE.Group();
    this.swordGroup.position.copy(pos).setY(pos.y + 1.4);

    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xe8e8ff,
      metalness: 1.0,
      roughness: 0.05,
      emissive: 0xaabbff,
      emissiveIntensity: 0.6,
    });

    // Blade — tall thin box
    const bladeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.02), silverMat);
    bladeMesh.position.y = 0.0;

    // Crossguard
    const guardMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.04), silverMat);
    guardMesh.position.y = -0.28;

    // Pommel
    const pommelMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), silverMat);
    pommelMesh.position.y = -0.38;

    this.swordGroup.add(bladeMesh, guardMesh, pommelMesh);
    this.swordGroup.scale.setScalar(0.01); // starts tiny, scales up on appear
    group.add(this.swordGroup);

    // Sword light
    this.swordLight = new THREE.PointLight(0x88aaff, 0, 5);
    this.swordLight.position.copy(pos).setY(pos.y + 1.4);
    group.add(this.swordLight);

    // ── Dissolve material ────────────────────────────────────────────────────
    // Estimate piece bounding box for dissolve parameters
    const bbox = new THREE.Box3().setFromObject(victim);
    const baseY = bbox.min.y;
    const height = bbox.max.y - bbox.min.y || 1.0;

    this.dissolveMat = new THREE.ShaderMaterial({
      vertexShader: dissolveVert,
      fragmentShader: dissolveFrag,
      uniforms: {
        uDissolve: { value: 0.0 },
        uBaseY: { value: baseY },
        uHeight: { value: height },
        uEdgeColor: { value: new THREE.Color(0xffd700) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // ── Sounds ───────────────────────────────────────────────────────────────
    const sfx = CAPTURE_SOUNDS.avadaKedavra; // reuse existing sword-ish sounds
    this.castSfx = new Howl({ src: [sfx.cast], volume: 0.7 });
    this.impactSfx = new Howl({ src: [sfx.impact], volume: 0.9 });
    this.castSfx.play();
  }

  update(delta: number): void {
    this.elapsed += delta;
    const e = this.elapsed;

    // ── 1. Sword appear ───────────────────────────────────────────────────────
    const appearT = prog(e, T.SWORD_APPEAR, 0.35);
    this.swordGroup.scale.setScalar(appearT); // scale from 0→1
    this.swordLight.intensity = appearT * 3.0;

    // ── 2. Orbit ──────────────────────────────────────────────────────────────
    if (e >= T.ORBIT_START && e < T.ORBIT_END) {
      const orbitT = prog(e, T.ORBIT_START, T.ORBIT_END - T.ORBIT_START);
      const angle = orbitT * Math.PI * 2 * ORBIT_REVS;
      const pos = this.victim.position;

      // Sword orbits in XZ plane tilted slightly, spinning on its own axis
      this.swordGroup.position.set(
        pos.x + Math.cos(angle) * ORBIT_RADIUS,
        pos.y + 0.5 + Math.sin(orbitT * Math.PI) * 0.3,
        pos.z + Math.sin(angle) * ORBIT_RADIUS,
      );
      // Sword always points tangent to orbit + tilted toward victim
      this.swordGroup.rotation.y = -angle + Math.PI / 2;
      this.swordGroup.rotation.x = -0.4;

      // Flicker light intensity with orbit
      this.swordLight.intensity = 2.5 + Math.sin(e * 12) * 0.8;
      this.swordLight.position.copy(this.swordGroup.position);

      // Emit orbit sparks at orbit start
      if (!this.sparks) {
        this.sparks = createParticleBurst(this.group, pos, 0xaaddff, SPARK_COUNT);
        for (let i = 0; i < SPARK_COUNT; i++) {
          const a = (i / SPARK_COUNT) * Math.PI * 2;
          this.sparkVels.push(
            new THREE.Vector3(
              Math.cos(a) * (0.8 + Math.random() * 1.2),
              1.5 + Math.random() * 2.5,
              Math.sin(a) * (0.8 + Math.random() * 1.2),
            ),
          );
        }
      }
    }

    // Advance sparks
    if (this.sparks) {
      const sPos = this.sparks.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < SPARK_COUNT; i++) {
        this.sparkVels[i].y -= 3.5 * delta;
        sPos[i * 3] += this.sparkVels[i].x * delta;
        sPos[i * 3 + 1] += this.sparkVels[i].y * delta;
        sPos[i * 3 + 2] += this.sparkVels[i].z * delta;
      }
      this.sparks.geometry.attributes.position.needsUpdate = true;
      (this.sparks.material as THREE.PointsMaterial).opacity = 1 - prog(e, T.ORBIT_END, 0.5);
    }

    // ── 3. Shatter ────────────────────────────────────────────────────────────
    if (e >= T.SHATTER_START && !this.shatterFired) {
      this.shatterFired = true;
      this.impactSfx.play();

      const pos = this.victim.position;
      this.debris = createDebrisExplosion(
        this.group,
        pos,
        DEBRIS_COUNT,
        victimStoneColor(this.victim),
      );

      for (let i = 0; i < DEBRIS_COUNT; i++) {
        const angle = (i / DEBRIS_COUNT) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 1.5 + Math.random() * 3.0;
        this.debrisVels.push(
          new THREE.Vector3(
            Math.cos(angle) * speed * (0.5 + Math.random()),
            2.5 + Math.random() * 4.0,
            Math.sin(angle) * speed * (0.5 + Math.random()),
          ),
        );
        this.debrisRots.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
          ),
        );
      }

      // Shatter flash
      this.swordLight.color.set(0xffffff);
      this.swordLight.intensity = 6;
    }

    // Advance debris physics
    if (this.debris.length) {
      for (let i = 0; i < this.debris.length; i++) {
        this.debrisVels[i].y -= 8 * delta;
        this.debris[i].position.addScaledVector(this.debrisVels[i], delta);
        this.debris[i].rotation.x += this.debrisRots[i].x * delta;
        this.debris[i].rotation.y += this.debrisRots[i].y * delta;
        this.debris[i].rotation.z += this.debrisRots[i].z * delta;
      }

      // Fade debris
      if (e >= T.DEBRIS_FADE_START) {
        const fadeT = prog(e, T.DEBRIS_FADE_START, T.DEBRIS_FADE_END - T.DEBRIS_FADE_START);
        for (const d of this.debris) {
          (d.material as THREE.MeshStandardMaterial).opacity = 1 - fadeT;
        }
      }
    }

    // ── 4. Dissolve victim bottom-up ──────────────────────────────────────────
    if (e >= T.DISSOLVE_START && !this.dissolveFired) {
      this.dissolveFired = true;
      (this.victim.material as THREE.Material).dispose();
      this.victim.material = this.dissolveMat;
    }
    if (e >= T.DISSOLVE_START && e < T.DISSOLVE_END) {
      this.dissolveMat.uniforms.uDissolve.value = prog(
        e,
        T.DISSOLVE_START,
        T.DISSOLVE_END - T.DISSOLVE_START,
      );
    }
    if (e >= T.VICTIM_HIDE && !this.victimHidden) {
      this.victimHidden = true;
      this.victim.visible = false;
    }

    // ── Sword fades after orbit ───────────────────────────────────────────────
    if (e >= T.ORBIT_END) {
      const fadeT = prog(e, T.ORBIT_END, 0.4);
      this.swordGroup.scale.setScalar(1 - fadeT);
      this.swordLight.intensity = (1 - fadeT) * 2;
    }

    // ── Callbacks ─────────────────────────────────────────────────────────────
    if (!this.readyFired && e >= T.READY) {
      this.readyFired = true;
      this.onReady();
    }
    if (e >= T.DONE) this._done = true;
  }

  get isComplete() {
    return this._done;
  }

  dispose(): void {
    // Sword
    this.swordGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
    this.group.remove(this.swordGroup);
    this.group.remove(this.swordLight);

    // Sparks
    if (this.sparks) {
      this.group.remove(this.sparks);
      this.sparks.geometry.dispose();
      (this.sparks.material as THREE.Material).dispose();
    }

    // Debris
    disposeMeshes(this.group, this.debris);

    // Victim
    this.victim.removeFromParent();
    this.dissolveMat.dispose();

    this.castSfx.unload();
    this.impactSfx.unload();
  }
}
