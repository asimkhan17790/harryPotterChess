/**
 * Wingardium Leviosa — Pawn captures.
 * Victim levitates then shatters mid-air. Total: 1.4 s.
 */
import * as THREE from 'three';
import { Howl } from 'howler';
import type { CaptureEffect } from './types';
import { createDebrisExplosion, prog, disposeMeshes } from '../utils/captureEffects';
import { CAPTURE_SOUNDS } from '../data/captureSounds';

const T = {
  SPARK_END: 0.2,
  LEVITATE_START: 0.1,
  LEVITATE_END: 0.5,
  SHATTER: 0.5,
  FADE_START: 0.8,
  FADE_END: 1.0,
  READY: 1.0,
  DONE: 1.4,
} as const;

export class WingardiumLeviosaEffect implements CaptureEffect {
  private elapsed = 0;
  private _done = false;
  private readyFired = false;
  private shatterFired = false;

  private group: THREE.Group;
  private victim: THREE.Mesh;
  private onReady: () => void;
  private wandLight: THREE.PointLight;
  private victimStartY: number;
  private debris: THREE.Mesh[] = [];
  private debrisVel: THREE.Vector3[] = [];
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
    this.victimStartY = victim.position.y;

    this.wandLight = new THREE.PointLight(0xffee00, 3, 0.8);
    this.wandLight.position.copy(attackerPos).setY(attackerPos.y + 1);
    group.add(this.wandLight);

    const sfx = CAPTURE_SOUNDS.wingardiumLeviosa;
    this.castSfx = new Howl({ src: [sfx.cast], volume: 0.6 });
    this.impactSfx = new Howl({ src: [sfx.impact], volume: 0.7 });
    this.castSfx.play();
  }

  update(delta: number): void {
    this.elapsed += delta;
    const e = this.elapsed;

    // Wand spark fades 0–0.2 s
    this.wandLight.intensity = (1 - prog(e, 0, T.SPARK_END)) * 3;

    // Victim levitates 0.1–0.5 s
    if (e >= T.LEVITATE_START && e < T.LEVITATE_END) {
      const t = prog(e, T.LEVITATE_START, T.LEVITATE_END - T.LEVITATE_START);
      this.victim.position.y = this.victimStartY + t * 2.5;
      this.victim.rotation.y = t * (Math.PI / 12);
    }

    // Shatter at 0.5 s
    if (e >= T.SHATTER && !this.shatterFired) {
      this.shatterFired = true;
      this.victim.visible = false;
      this.impactSfx.play();

      const pos = this.victim.position.clone();
      this.debris = createDebrisExplosion(this.group, pos, 10, 0xddddcc);
      for (let i = 0; i < this.debris.length; i++) {
        this.debrisVel.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            2 + Math.random() * 5,
            (Math.random() - 0.5) * 6,
          ),
        );
      }
    }

    // Animate debris + fade
    if (this.shatterFired) {
      const fade = prog(e, T.FADE_START, T.FADE_END - T.FADE_START);
      for (let i = 0; i < this.debris.length; i++) {
        this.debrisVel[i].y -= 9.8 * delta;
        this.debris[i].position.addScaledVector(this.debrisVel[i], delta);
        this.debris[i].rotation.x += this.debrisVel[i].x * delta;
        this.debris[i].rotation.z += this.debrisVel[i].z * delta;
        (this.debris[i].material as THREE.MeshStandardMaterial).opacity = 1 - fade;
      }
    }

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
    this.group.remove(this.wandLight);
    disposeMeshes(this.group, this.debris);
    this.victim.removeFromParent();
    (this.victim.material as THREE.Material).dispose();
    this.castSfx.unload();
    this.impactSfx.unload();
  }
}
