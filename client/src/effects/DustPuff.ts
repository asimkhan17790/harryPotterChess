import * as THREE from 'three';
import type { CaptureEffect } from './types';

const DURATION = 0.55;
const COUNT = 26;

/**
 * Small radial dust burst at a piece's landing square. Implements the
 * CaptureEffect interface so ChessScene's activeEffects loop handles its
 * lifecycle (update/isComplete/dispose) for free.
 */
export class DustPuffEffect implements CaptureEffect {
  private group: THREE.Object3D;
  private points: THREE.Points;
  private velocities: Float32Array;
  private elapsed = 0;

  constructor(group: THREE.Object3D, position: THREE.Vector3, color = 0x9a8f7d) {
    this.group = group;

    const positions = new Float32Array(COUNT * 3);
    this.velocities = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y + 0.03;
      positions[i * 3 + 2] = position.z;
      // Radial outward, hugging the ground with a slight upward kick
      const a = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 0.9;
      this.velocities[i * 3] = Math.cos(a) * speed;
      this.velocities[i * 3 + 1] = 0.15 + Math.random() * 0.35;
      this.velocities[i * 3 + 2] = Math.sin(a) * speed;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.07,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    group.add(this.points);
  }

  update(delta: number): void {
    this.elapsed += delta;
    const t = Math.min(this.elapsed / DURATION, 1);
    const pos = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    // Decelerate outward drift; particles settle as they fade
    const drag = 1 - t * 0.85;
    for (let i = 0; i < COUNT; i++) {
      pos.setX(i, pos.getX(i) + this.velocities[i * 3] * drag * delta);
      pos.setY(i, Math.max(0.01, pos.getY(i) + this.velocities[i * 3 + 1] * drag * delta));
      pos.setZ(i, pos.getZ(i) + this.velocities[i * 3 + 2] * drag * delta);
    }
    pos.needsUpdate = true;
    (this.points.material as THREE.PointsMaterial).opacity = 0.75 * (1 - t);
  }

  get isComplete(): boolean {
    return this.elapsed >= DURATION;
  }

  dispose(): void {
    this.group.remove(this.points);
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
