/**
 * Reducto — Rook captures.
 * Blue bolt travels to victim, which explodes in debris. Total: 1.6 s.
 */
import * as THREE from 'three';
import { Howl } from 'howler';
import type { CaptureEffect } from './types';
import {
  createDebrisExplosion,
  createBolt,
  advanceBolt,
  prog,
  disposeMeshes,
} from '../utils/captureEffects';
import type { BoltHandle } from '../utils/captureEffects';
import { CAPTURE_SOUNDS } from '../data/captureSounds';

const T = {
  BOLT_END: 0.15,
  FLASH_END: 0.25,
  DEBRIS_FADE_START: 0.6,
  DEBRIS_FADE_END: 1.0,
  READY: 0.8,
  DONE: 1.6,
} as const;

const DEBRIS_COUNT = 18;

export class ReductoEffect implements CaptureEffect {
  private elapsed = 0;
  private _done = false;
  private readyFired = false;
  private explodeFired = false;

  private group: THREE.Group;
  private victim: THREE.Mesh;
  private onReady: () => void;
  private bolt: BoltHandle;
  private flashLight: THREE.PointLight;
  private debris: THREE.Mesh[] = [];
  private debrisVel: THREE.Vector3[] = [];
  private debrisAngVel: THREE.Vector3[] = [];
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

    this.bolt = createBolt(
      group,
      attackerPos.clone().setY(attackerPos.y + 0.5),
      victim.position,
      0x4488ff,
    );

    this.flashLight = new THREE.PointLight(0xffffff, 0, 6);
    this.flashLight.position.copy(victim.position);
    group.add(this.flashLight);

    const sfx = CAPTURE_SOUNDS.reducto;
    this.castSfx = new Howl({ src: [sfx.cast], volume: 0.7 });
    this.impactSfx = new Howl({ src: [sfx.impact], volume: 0.8 });
    this.castSfx.play();
  }

  update(delta: number): void {
    this.elapsed += delta;
    const e = this.elapsed;

    // Bolt travels 0–0.15 s
    if (e <= T.BOLT_END) {
      advanceBolt(this.bolt, prog(e, 0, T.BOLT_END));
    } else if (!this.explodeFired) {
      // Bolt reached victim
      this.explodeFired = true;
      this.bolt.mesh.visible = false;
      this.impactSfx.play();
      this.victim.visible = false;

      // Flash
      this.flashLight.intensity = 8;

      // Debris explosion
      const pos = this.victim.position.clone();
      this.debris = createDebrisExplosion(this.group, pos, DEBRIS_COUNT, 0x8888aa);
      for (let i = 0; i < this.debris.length; i++) {
        this.debrisVel.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            1 + Math.random() * 8,
            (Math.random() - 0.5) * 10,
          ),
        );
        this.debrisAngVel.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
          ),
        );
      }
    }

    // Flash decays 0.15–0.25 s
    if (e >= T.BOLT_END && e <= T.FLASH_END) {
      this.flashLight.intensity = 8 * (1 - prog(e, T.BOLT_END, T.FLASH_END - T.BOLT_END));
    }

    // Animate debris + fade
    if (this.explodeFired) {
      const fade = prog(e, T.DEBRIS_FADE_START, T.DEBRIS_FADE_END - T.DEBRIS_FADE_START);
      for (let i = 0; i < this.debris.length; i++) {
        this.debrisVel[i].y -= 9.8 * delta;
        this.debris[i].position.addScaledVector(this.debrisVel[i], delta);
        this.debris[i].rotation.x += this.debrisAngVel[i].x * delta;
        this.debris[i].rotation.y += this.debrisAngVel[i].y * delta;
        this.debris[i].rotation.z += this.debrisAngVel[i].z * delta;
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
    this.group.remove(this.bolt.mesh);
    this.bolt.mesh.geometry.dispose();
    (this.bolt.mesh.material as THREE.Material).dispose();

    this.group.remove(this.flashLight);
    disposeMeshes(this.group, this.debris);

    this.victim.removeFromParent();
    (this.victim.material as THREE.Material).dispose();
    this.castSfx.unload();
    this.impactSfx.unload();
  }
}
