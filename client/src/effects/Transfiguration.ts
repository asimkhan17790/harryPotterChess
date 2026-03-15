/**
 * Transfiguration — Bishop captures.
 * Victim morphs into stone, then cracks and crumbles. Total: 2.0 s.
 */
import * as THREE from 'three';
import { Howl } from 'howler';
import type { CaptureEffect } from './types';
import { createParticleBurst, prog, disposeMeshes } from '../utils/captureEffects';
import { CAPTURE_SOUNDS } from '../data/captureSounds';

const T = {
  STONE_AT: 0.3,
  MORPH_START: 0.3,
  MORPH_END: 0.7,
  SHARDS_AT: 0.7,
  VICTIM_HIDE: 0.9,
  SHARD_FADE_START: 1.0,
  SHARD_FADE_END: 1.4,
  STREAM_FADE_START: 0.4,
  STREAM_FADE_END: 0.8,
  READY: 1.2,
  DONE: 2.0,
} as const;

const STREAM_COUNT = 30;
const SHARD_COUNT = 6;

export class TransfigurationEffect implements CaptureEffect {
  private elapsed = 0;
  private _done = false;
  private readyFired = false;
  private stoneFired = false;
  private shardsFired = false;
  private victimHidden = false;

  private group: THREE.Group;
  private victim: THREE.Mesh;
  private onReady: () => void;
  private stream: THREE.Points;
  private streamVels: THREE.Vector3[] = [];
  private shards: THREE.Mesh[] = [];
  private shardVels: THREE.Vector3[] = [];
  private shardAngularVels: THREE.Vector3[] = [];
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

    // Purple particle stream from attacker toward victim
    const victimPos = victim.position;
    this.stream = createParticleBurst(this.group, attackerPos, 0x8833ff, STREAM_COUNT);
    const pos = this.stream.geometry.attributes.position.array as Float32Array;
    const dir = new THREE.Vector3().subVectors(victimPos, attackerPos).normalize();
    for (let i = 0; i < STREAM_COUNT; i++) {
      const scatter = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
      );
      const speed = 3 + Math.random() * 4;
      this.streamVels.push(dir.clone().add(scatter).normalize().multiplyScalar(speed));
      pos[i * 3] = attackerPos.x;
      pos[i * 3 + 1] = attackerPos.y + 0.5;
      pos[i * 3 + 2] = attackerPos.z;
    }
    this.stream.geometry.attributes.position.needsUpdate = true;

    const sfx = CAPTURE_SOUNDS.transfiguration;
    this.castSfx = new Howl({ src: [sfx.cast], volume: 0.6 });
    this.impactSfx = new Howl({ src: [sfx.impact], volume: 0.7 });
    this.castSfx.play();
  }

  update(delta: number): void {
    this.elapsed += delta;
    const e = this.elapsed;

    // Animate purple stream
    const streamPos = this.stream.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < STREAM_COUNT; i++) {
      streamPos[i * 3] += this.streamVels[i].x * delta;
      streamPos[i * 3 + 1] += this.streamVels[i].y * delta;
      streamPos[i * 3 + 2] += this.streamVels[i].z * delta;
    }
    this.stream.geometry.attributes.position.needsUpdate = true;
    (this.stream.material as THREE.PointsMaterial).opacity =
      1 - prog(e, T.STREAM_FADE_START, T.STREAM_FADE_END - T.STREAM_FADE_START);

    // Turn victim to stone at 0.3 s
    if (e >= T.STONE_AT && !this.stoneFired) {
      this.stoneFired = true;
      this.impactSfx.play();
      const mat = this.victim.material as THREE.MeshStandardMaterial;
      mat.color.setHex(0x888880);
      mat.roughness = 1.0;
      mat.metalness = 0.0;
    }

    // Squish / stretch morph 0.3–0.7 s
    if (e >= T.MORPH_START && e < T.MORPH_END) {
      const t = prog(e, T.MORPH_START, T.MORPH_END - T.MORPH_START);
      // 0→0.5: squish to 0.6, 0.5→1: stretch to 1.1
      const scaleY = t < 0.5 ? 1 - t * 0.8 : 0.6 + (t - 0.5) * 1.0;
      this.victim.scale.y = scaleY;
    }

    // Crack: spawn 6 shard planes at 0.7 s
    if (e >= T.SHARDS_AT && !this.shardsFired) {
      this.shardsFired = true;
      const pos = this.victim.position;
      for (let i = 0; i < SHARD_COUNT; i++) {
        const angle = (i / SHARD_COUNT) * Math.PI * 2;
        const geo = new THREE.PlaneGeometry(0.2 + Math.random() * 0.2, 0.3 + Math.random() * 0.2);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x888880,
          transparent: true,
          opacity: 1,
          side: THREE.DoubleSide,
        });
        const shard = new THREE.Mesh(geo, mat);
        shard.position.set(
          pos.x + Math.cos(angle) * 0.3,
          pos.y + 0.1,
          pos.z + Math.sin(angle) * 0.3,
        );
        shard.rotation.y = angle;
        this.group.add(shard);
        this.shards.push(shard);
        this.shardVels.push(
          new THREE.Vector3(Math.cos(angle) * 3, 1 + Math.random() * 2, Math.sin(angle) * 3),
        );
        this.shardAngularVels.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
          ),
        );
      }
    }

    if (e >= T.VICTIM_HIDE && !this.victimHidden) {
      this.victimHidden = true;
      this.victim.visible = false;
    }

    // Animate shards + fade
    if (this.shardsFired) {
      const fade = prog(e, T.SHARD_FADE_START, T.SHARD_FADE_END - T.SHARD_FADE_START);
      for (let i = 0; i < this.shards.length; i++) {
        this.shardVels[i].y -= 9.8 * delta;
        this.shards[i].position.addScaledVector(this.shardVels[i], delta);
        this.shards[i].rotation.x += this.shardAngularVels[i].x * delta;
        this.shards[i].rotation.y += this.shardAngularVels[i].y * delta;
        this.shards[i].rotation.z += this.shardAngularVels[i].z * delta;
        (this.shards[i].material as THREE.MeshStandardMaterial).opacity = 1 - fade;
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
    this.group.remove(this.stream);
    this.stream.geometry.dispose();
    (this.stream.material as THREE.Material).dispose();

    disposeMeshes(this.group, this.shards);

    this.victim.removeFromParent();
    (this.victim.material as THREE.Material).dispose();
    this.castSfx.unload();
    this.impactSfx.unload();
  }
}
