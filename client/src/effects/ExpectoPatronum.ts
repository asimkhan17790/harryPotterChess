/**
 * Expecto Patronum — Knight captures.
 * Silver stag (cone proxy) charges through victim. Total: 1.8 s.
 */
import * as THREE from 'three';
import { Howl } from 'howler';
import type { CaptureEffect } from './types';
import { createParticleBurst, prog } from '../utils/captureEffects';
import { CAPTURE_SOUNDS } from '../data/captureSounds';

const T = {
  CHARGE_START: 0.2,
  CHARGE_END: 0.6, // patronus reaches victim
  SHRINK_START: 0.6,
  SHRINK_END: 0.9,
  PATRONUS_FADE_START: 0.7,
  PATRONUS_FADE_END: 1.1,
  PARTICLE_FADE_START: 0.8,
  PARTICLE_FADE_END: 1.0,
  READY: 1.1,
  DONE: 1.8,
} as const;

const PARTICLE_COUNT = 20;

export class ExpectoPatronumEffect implements CaptureEffect {
  private elapsed = 0;
  private _done = false;
  private readyFired = false;
  private particlesFired = false;

  private group: THREE.Group;
  private victim: THREE.Mesh;
  private onReady: () => void;
  private attackerPos: THREE.Vector3;
  private victimPos: THREE.Vector3;
  private patronus: THREE.Mesh;
  private patronusMat: THREE.MeshBasicMaterial;
  private particles: THREE.Points | null = null;
  private particleVels: THREE.Vector3[] = [];
  private castSfx: Howl;
  private impactSfx: Howl;

  constructor(
    group: THREE.Group,
    attackerPos: THREE.Vector3,
    victim: THREE.Mesh,
    onReady: () => void,
  ) {
    this.group = group;
    this.victim = victim;
    this.onReady = onReady;
    this.attackerPos = attackerPos.clone();
    this.victimPos = victim.position.clone();

    // Patronus: large cone as stag silhouette proxy
    const geo = new THREE.ConeGeometry(0.4, 1.2, 6);
    this.patronusMat = new THREE.MeshBasicMaterial({
      color: 0xc0c8ff,
      transparent: true,
      opacity: 0.7,
    });
    this.patronus = new THREE.Mesh(geo, this.patronusMat);
    this.patronus.scale.set(2.5, 1, 2.5);
    this.patronus.position.copy(attackerPos).setY(attackerPos.y + 0.8);

    // Orient patronus toward victim
    const dir = new THREE.Vector3().subVectors(this.victimPos, this.attackerPos).normalize();
    this.patronus.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    group.add(this.patronus);

    const sfx = CAPTURE_SOUNDS.expectoPatronum;
    this.castSfx = new Howl({ src: [sfx.cast], volume: 0.7 });
    this.impactSfx = new Howl({ src: [sfx.impact], volume: 0.7 });
    this.castSfx.play();
  }

  update(delta: number): void {
    this.elapsed += delta;
    const e = this.elapsed;

    // Patronus charges 0.2–0.6 s
    if (e >= T.CHARGE_START && e <= T.CHARGE_END) {
      const t = prog(e, T.CHARGE_START, T.CHARGE_END - T.CHARGE_START);
      this.patronus.position.lerpVectors(
        this.attackerPos.clone().setY(this.attackerPos.y + 0.8),
        this.victimPos.clone().setY(this.victimPos.y + 0.8),
        t,
      );
      // Scale z grows as it charges
      this.patronus.scale.z = 2.5 + t * 1.5;
    }

    // Victim shrinks 0.6–0.9 s
    if (e >= T.SHRINK_START) {
      const t = prog(e, T.SHRINK_START, T.SHRINK_END - T.SHRINK_START);
      const s = 1 - t;
      this.victim.scale.setScalar(Math.max(0, s));
      if (t >= 1) this.victim.visible = false;
    }

    // Silver particle ring at 0.6 s
    if (e >= T.CHARGE_END && !this.particlesFired) {
      this.particlesFired = true;
      this.impactSfx.play();
      this.particles = createParticleBurst(this.group, this.victimPos, 0xc0c8ff, PARTICLE_COUNT);
      const pos = this.particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        this.particleVels.push(
          new THREE.Vector3(
            Math.cos(angle) * speed,
            1 + Math.random() * 2,
            Math.sin(angle) * speed,
          ),
        );
        pos[i * 3] = this.victimPos.x;
        pos[i * 3 + 1] = this.victimPos.y + 0.3;
        pos[i * 3 + 2] = this.victimPos.z;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    // Animate particles
    if (this.particles) {
      const pos = this.particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        this.particleVels[i].y -= 4 * delta;
        pos[i * 3] += this.particleVels[i].x * delta;
        pos[i * 3 + 1] += this.particleVels[i].y * delta;
        pos[i * 3 + 2] += this.particleVels[i].z * delta;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
      (this.particles.material as THREE.PointsMaterial).opacity =
        1 - prog(e, T.PARTICLE_FADE_START, T.PARTICLE_FADE_END - T.PARTICLE_FADE_START);
    }

    // Patronus continues and fades 0.7–1.1 s
    this.patronusMat.opacity =
      0.7 * (1 - prog(e, T.PATRONUS_FADE_START, T.PATRONUS_FADE_END - T.PATRONUS_FADE_START));

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
    this.group.remove(this.patronus);
    this.patronus.geometry.dispose();
    this.patronusMat.dispose();

    if (this.particles) {
      this.group.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }

    this.victim.removeFromParent();
    (this.victim.material as THREE.Material).dispose();
    this.castSfx.unload();
    this.impactSfx.unload();
  }
}
