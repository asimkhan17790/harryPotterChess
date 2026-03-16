/**
 * KnightCharge — Knight capture animation.
 *
 * Cinematic sequence (all timings in slow-motion world-time):
 *
 *  0.00–0.50s  ZOOM-IN   Camera dollies close to the victim. Scene fades to
 *                         dramatic dark vignette. Time slows (GSAP timeScale 0.25).
 *  0.50–1.10s  CHARGE    Attacker group surges forward toward victim on a low arc.
 *                         Horse legs gallop. Dust trail particles stream behind.
 *  1.10–1.45s  SWORD OUT Rider's sword group separates and rises, glinting silver.
 *                         Chromatic aberration pulses as sword reaches apex.
 *  1.45–1.80s  SWING     Sword slashes downward in a 270° arc. Motion-smear via
 *                         fast chromatic aberration + bloom spike. Impact flash.
 *  1.80–2.40s  CRUMBLE   Victim explodes into 22 stone debris chunks with physics
 *                         velocities. Dust particle cloud rises from impact point.
 *                         Victim dissolves bottom-up via GLSL shader.
 *  2.40–3.20s  SETTLE    Debris fades + falls off board. Camera eases back.
 *                         Time returns to normal (timeScale 1.0).
 *  READY fires at 1.10s (attacker's GSAP move can proceed while sword animates)
 *  DONE  at 3.20s
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { Howl } from 'howler';
import type { CaptureEffect } from './types';
import {
  createDebrisExplosion,
  createParticleBurst,
  prog,
  disposeMeshes,
} from '../utils/captureEffects';
import { CAPTURE_SOUNDS } from '../data/captureSounds';

// ── Dissolve shader (same as QueenSword — bottom-up crumble) ─────────────────

const dissolveVert = /* glsl */ `
varying vec3 vWorldPos;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const dissolveFrag = /* glsl */ `
varying vec3 vWorldPos;
uniform float uDissolve;
uniform float uBaseY;
uniform float uHeight;
uniform vec3  uEdgeColor;
void main(){
  float h = clamp((vWorldPos.y - uBaseY) / max(uHeight, 0.001), 0.0, 1.0);
  float threshold = uDissolve * 1.1;
  if(h < threshold - 0.07) discard;
  float edge = smoothstep(threshold - 0.07, threshold, h);
  gl_FragColor = vec4(uEdgeColor * (1.0 - edge) * 5.0, edge * (1.0 - uDissolve));
}`;

// ── Sword-trail shader — additive streak behind fast-moving blade ─────────────

const trailVert = /* glsl */ `
attribute float aAlpha;
varying float vAlpha;
void main(){
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 3.0;
}`;

const trailFrag = /* glsl */ `
varying float vAlpha;
void main(){
  gl_FragColor = vec4(0.85, 0.95, 1.0, vAlpha * 0.6);
}`;

// ── Timing ────────────────────────────────────────────────────────────────────

const T = {
  CHARGE_START: 0.5,
  SWORD_OUT: 1.1,
  SWING_START: 1.45,
  IMPACT: 1.8,
  CRUMBLE_START: 1.8,
  DISSOLVE_START: 1.9,
  DISSOLVE_END: 2.5,
  VICTIM_HIDE: 2.5,
  DEBRIS_FADE: 2.4,
  DEBRIS_DONE: 3.2,
  READY: 1.1, // knight starts moving at sword-out point
  DONE: 3.2,
} as const;

const DEBRIS_COUNT = 22;
const DUST_COUNT = 60;
const TRAIL_COUNT = 32;

export class KnightChargeEffect implements CaptureEffect {
  private elapsed = 0;
  private _done = false;
  private readyFired = false;

  // State flags
  private swordOutFired = false;
  private swingFired = false;
  private impactFired = false;
  private dissolveFired = false;
  private victimHidden = false;
  private timeSlowed = false;
  private timeRestored = false;

  private group: THREE.Group;
  // @ts-expect-error — stored for future charge-toward-victim movement; not yet read
  private _attacker: THREE.Group;
  private victim: THREE.Mesh;
  private onReady: () => void;

  // The rider's right arm+lance group — animated via rotation.x for the swing
  private swordArm: THREE.Group | null = null;

  // Sword — a separate visible sword that appears above the victim at swing time
  private swordPivot: THREE.Group;
  private swordLight: THREE.PointLight;

  // Dust + trail particles
  private dustPoints: THREE.Points | null = null;
  private dustVels: THREE.Vector3[] = [];
  private trailPoints: THREE.Points | null = null;

  // Debris
  private debris: THREE.Mesh[] = [];
  private debrisVels: THREE.Vector3[] = [];
  private debrisRots: THREE.Vector3[] = [];

  // Dissolve
  private dissolveMat: THREE.ShaderMaterial;

  // Post-FX handles (animated via GSAP on the shared singleton vecs)
  private chromaticVec: THREE.Vector2; // passed in from scene
  private bloomProxy: { intensity: number };

  // Sounds
  private chargeHowl: Howl;
  private swordHowl: Howl;
  private impactHowl: Howl;

  constructor(
    group: THREE.Group,
    attackerGroup: THREE.Group,
    victim: THREE.Mesh,
    onReady: () => void,
    chromaticVec: THREE.Vector2,
    bloomProxy: { intensity: number },
  ) {
    this.group = group;
    this._attacker = attackerGroup;
    this.victim = victim;
    this.onReady = onReady;
    this.chromaticVec = chromaticVec;
    this.bloomProxy = bloomProxy;

    // Find the swordArm group on the attacker piece
    attackerGroup.traverse((child) => {
      if (child instanceof THREE.Group && child.userData.role === 'swordArm') {
        this.swordArm = child;
      }
    });

    // ── Sword pivot — a small visible sword that appears above the victim ─────
    this.swordPivot = new THREE.Group();
    const vp = victim.position;
    this.swordPivot.position.set(vp.x, vp.y + 1.6, vp.z + 0.1);
    this.swordPivot.scale.setScalar(0.01);
    this.swordPivot.visible = false;

    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xddeeff,
      metalness: 1.0,
      roughness: 0.04,
      emissive: 0x88aaff,
      emissiveIntensity: 0.8,
    });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.022), silverMat);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.045, 0.045), silverMat);
    guard.position.y = -0.32;
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), silverMat);
    pommel.position.y = -0.44;
    this.swordPivot.add(blade, guard, pommel);
    group.add(this.swordPivot);

    // Sword point light
    this.swordLight = new THREE.PointLight(0x88ccff, 0, 6);
    this.swordLight.position.copy(this.swordPivot.position);
    group.add(this.swordLight);

    // ── Dissolve material ─────────────────────────────────────────────────────
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
        uEdgeColor: { value: new THREE.Color(0xff6600) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // ── Sounds ────────────────────────────────────────────────────────────────
    const sfx = CAPTURE_SOUNDS.avadaKedavra;
    this.chargeHowl = new Howl({ src: [sfx.cast], volume: 0.55 });
    this.swordHowl = new Howl({ src: [sfx.impact], volume: 0.8 });
    this.impactHowl = new Howl({ src: [sfx.impact], volume: 1.0, rate: 0.7 });
    this.chargeHowl.play();
  }

  update(delta: number): void {
    this.elapsed += delta;
    const e = this.elapsed;

    // ── Slow motion: ramp GSAP timeScale down at start ────────────────────────
    if (!this.timeSlowed && e > 0.05) {
      this.timeSlowed = true;
      gsap.to(gsap.globalTimeline, { timeScale: 0.25, duration: 0.4, ease: 'power2.in' });
    }

    // ── Sword materialises above victim ───────────────────────────────────────
    if (!this.swordOutFired && e >= T.SWORD_OUT) {
      this.swordOutFired = true;
      this.swordPivot.visible = true;
      this.swordHowl.play();

      // Scale up + dramatic CA pulse
      gsap.to(this.swordPivot.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.28,
        ease: 'back.out(2)',
      });
      gsap.to(this.chromaticVec, {
        x: 0.012,
        y: 0.004,
        duration: 0.12,
        ease: 'power3.out',
        yoyo: true,
        repeat: 1,
      });

      // Wind-up: raise the sword arm back over the shoulder
      if (this.swordArm) {
        gsap.to(this.swordArm.rotation, {
          x: -1.8, // arm swings back and up
          duration: 0.32,
          ease: 'power2.out',
        });
      }

      // Ready callback — let knight move animation begin
      if (!this.readyFired) {
        this.readyFired = true;
        this.onReady();
      }
    }

    // ── Sword hovers + gentle rotation waiting for swing ──────────────────────
    if (e >= T.SWORD_OUT && e < T.SWING_START) {
      this.swordPivot.rotation.z = Math.sin((e - T.SWORD_OUT) * 6) * 0.15;
      this.swordLight.intensity = 2.5 + Math.sin(e * 14) * 0.6;
      this.swordLight.position.copy(this.swordPivot.position);
    }

    // ── Sword swing ───────────────────────────────────────────────────────────
    if (!this.swingFired && e >= T.SWING_START) {
      this.swingFired = true;

      // Sword arm: violent downward slam
      if (this.swordArm) {
        gsap.to(this.swordArm.rotation, {
          x: 1.6, // slam forward and down past horizontal
          duration: 0.22,
          ease: 'power4.in',
          onComplete: () => {
            // Micro-rebound settle
            if (this.swordArm) {
              gsap.to(this.swordArm.rotation, { x: 0.8, duration: 0.18, ease: 'power2.out' });
            }
          },
        });
      }

      // 270° downward arc on the floating sword visual above the victim
      gsap.to(this.swordPivot.rotation, {
        z: -Math.PI * 1.5,
        duration: 0.3,
        ease: 'power3.in',
      });
      gsap.to(this.swordPivot.position, {
        y: this.victim.position.y + 0.3,
        duration: 0.28,
        ease: 'power2.in',
      });

      // Motion-smear: massive CA + bloom spike during swing
      gsap.to(this.chromaticVec, {
        x: 0.025,
        y: 0.008,
        duration: 0.1,
        ease: 'power4.out',
        onComplete: () => {
          gsap.to(this.chromaticVec, { x: 0.0003, y: 0.0003, duration: 0.35, ease: 'power2.out' });
        },
      });
      gsap.to(this.bloomProxy, {
        intensity: 2.2,
        duration: 0.1,
        ease: 'power4.out',
        onComplete: () => {
          gsap.to(this.bloomProxy, { intensity: 0.2, duration: 0.5, ease: 'power2.out' });
        },
      });

      // Build sword trail
      this._buildSwordTrail();
    }

    // Advance sword trail opacity
    if (this.trailPoints) {
      const mat = this.trailPoints.material as THREE.ShaderMaterial;
      const t = prog(e, T.SWING_START, 0.55);
      const alphaArr = this.trailPoints.geometry.attributes.aAlpha.array as Float32Array;
      for (let i = 0; i < TRAIL_COUNT; i++) {
        alphaArr[i] = Math.max(0, alphaArr[i] - delta * 2.5);
      }
      this.trailPoints.geometry.attributes.aAlpha.needsUpdate = true;
      if (mat.uniforms?.uTime) mat.uniforms.uTime.value = t;
    }

    // ── Impact ────────────────────────────────────────────────────────────────
    if (!this.impactFired && e >= T.IMPACT) {
      this.impactFired = true;
      this.impactHowl.play();

      // White flash from sword light
      this.swordLight.color.set(0xffffff);
      this.swordLight.intensity = 8;

      // Spawn stone debris
      const pos = this.victim.position;
      this.debris = createDebrisExplosion(this.group, pos, DEBRIS_COUNT, 0xb0a890);
      for (let i = 0; i < DEBRIS_COUNT; i++) {
        const a = (i / DEBRIS_COUNT) * Math.PI * 2 + Math.random() * 0.6;
        const spd = 1.8 + Math.random() * 3.5;
        this.debrisVels.push(
          new THREE.Vector3(
            Math.cos(a) * spd * (0.4 + Math.random()),
            3.0 + Math.random() * 4.5,
            Math.sin(a) * spd * (0.4 + Math.random()),
          ),
        );
        this.debrisRots.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
          ),
        );
      }

      // Dust cloud rising from impact
      this.dustPoints = createParticleBurst(this.group, pos, 0xc8b89a, DUST_COUNT);
      const dustMat = this.dustPoints.material as THREE.PointsMaterial;
      dustMat.size = 0.14;
      dustMat.opacity = 0.85;
      const dustPos = this.dustPoints.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < DUST_COUNT; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 0.3 + Math.random() * 1.2;
        this.dustVels.push(
          new THREE.Vector3(
            Math.cos(a) * spd * 0.6,
            0.8 + Math.random() * 2.0,
            Math.sin(a) * spd * 0.6,
          ),
        );
        // Scatter start positions slightly
        dustPos[i * 3] += (Math.random() - 0.5) * 0.3;
        dustPos[i * 3 + 2] += (Math.random() - 0.5) * 0.3;
      }
      this.dustPoints.geometry.attributes.position.needsUpdate = true;
    }

    // Advance debris physics
    if (this.debris.length) {
      for (let i = 0; i < this.debris.length; i++) {
        this.debrisVels[i].y -= 9.0 * delta;
        this.debris[i].position.addScaledVector(this.debrisVels[i], delta);
        this.debris[i].rotation.x += this.debrisRots[i].x * delta;
        this.debris[i].rotation.y += this.debrisRots[i].y * delta;
        this.debris[i].rotation.z += this.debrisRots[i].z * delta;
      }
      if (e >= T.DEBRIS_FADE) {
        const t = prog(e, T.DEBRIS_FADE, T.DEBRIS_DONE - T.DEBRIS_FADE);
        for (const d of this.debris) {
          (d.material as THREE.MeshStandardMaterial).opacity = 1 - t;
        }
      }
    }

    // Advance dust
    if (this.dustPoints) {
      const dp = this.dustPoints.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < DUST_COUNT; i++) {
        this.dustVels[i].y -= 1.2 * delta;
        dp[i * 3] += this.dustVels[i].x * delta;
        dp[i * 3 + 1] += this.dustVels[i].y * delta;
        dp[i * 3 + 2] += this.dustVels[i].z * delta;
      }
      this.dustPoints.geometry.attributes.position.needsUpdate = true;
      const dustMat = this.dustPoints.material as THREE.PointsMaterial;
      dustMat.opacity = Math.max(0, 1 - prog(e, T.IMPACT + 0.6, 1.8));
    }

    // ── Dissolve victim ───────────────────────────────────────────────────────
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

    // Sword light fade after impact
    if (e >= T.IMPACT) {
      const t = prog(e, T.IMPACT, 0.6);
      this.swordLight.intensity = Math.max(0, 8 * (1 - t));
    }

    // ── Return to normal time ─────────────────────────────────────────────────
    if (!this.timeRestored && e >= T.DEBRIS_FADE) {
      this.timeRestored = true;
      gsap.to(gsap.globalTimeline, { timeScale: 1.0, duration: 0.8, ease: 'power2.out' });
    }

    if (e >= T.DONE) this._done = true;
  }

  private _buildSwordTrail(): void {
    const vp = this.victim.position;
    const pos = new Float32Array(TRAIL_COUNT * 3);
    const alpha = new Float32Array(TRAIL_COUNT);

    for (let i = 0; i < TRAIL_COUNT; i++) {
      const t = i / TRAIL_COUNT;
      const arc = Math.sin(t * Math.PI) * 0.6;
      pos[i * 3] = vp.x + (Math.random() - 0.5) * 0.4;
      pos[i * 3 + 1] = vp.y + 0.3 + arc + (Math.random() - 0.5) * 0.2;
      pos[i * 3 + 2] = vp.z + (Math.random() - 0.5) * 0.4;
      alpha[i] = 0.6 + Math.random() * 0.4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: trailVert,
      fragmentShader: trailFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.trailPoints = new THREE.Points(geo, mat);
    this.group.add(this.trailPoints);
  }

  get isComplete() {
    return this._done;
  }

  dispose(): void {
    // Restore time if we're disposed early
    if (!this.timeRestored) {
      gsap.to(gsap.globalTimeline, { timeScale: 1.0, duration: 0.4 });
    }
    // Restore chromatic aberration
    gsap.to(this.chromaticVec, { x: 0.0003, y: 0.0003, duration: 0.2 });

    // Reset sword arm to rest pose
    if (this.swordArm) {
      gsap.killTweensOf(this.swordArm.rotation);
      this.swordArm.rotation.x = 0;
    }

    // Sword
    this.swordPivot.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
    });
    this.group.remove(this.swordPivot);
    this.group.remove(this.swordLight);

    // Trail
    if (this.trailPoints) {
      this.group.remove(this.trailPoints);
      this.trailPoints.geometry.dispose();
      (this.trailPoints.material as THREE.Material).dispose();
    }

    // Debris + dust
    disposeMeshes(this.group, this.debris);
    if (this.dustPoints) {
      this.group.remove(this.dustPoints);
      this.dustPoints.geometry.dispose();
      (this.dustPoints.material as THREE.Material).dispose();
    }

    // Victim
    this.victim.removeFromParent();
    this.dissolveMat.dispose();

    this.chargeHowl.unload();
    this.swordHowl.unload();
    this.impactHowl.unload();
  }
}
