import * as THREE from 'three';

// ── Debris / Shatter ─────────────────────────────────────────────────────────

/**
 * Spawns `count` BoxGeometry debris chunks scattered around `position`.
 * Each mesh starts at opacity 1 with transparent:true so callers can fade them.
 * Caller is responsible for removing and disposing returned meshes.
 */
export function createDebrisExplosion(
  group: THREE.Group,
  position: THREE.Vector3,
  count: number,
  color: number,
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const s = 0.05 + Math.random() * 0.12;
    // Mix angular rock chunks (icosahedra) with broken-edge boxes so the
    // victim reads as carved stone crumbling apart
    const geo =
      Math.random() < 0.55
        ? new THREE.IcosahedronGeometry(s * 0.7, 0)
        : new THREE.BoxGeometry(s, s, s);
    const mat = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 1,
      roughness: 0.85,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
}

/**
 * Samples the victim piece's stone body colour so debris matches its side
 * and house. Falls back to a neutral grey when no material is found.
 */
export function victimStoneColor(victim: THREE.Object3D): number {
  let color = -1;
  victim.traverse((child) => {
    if (color === -1 && child instanceof THREE.Mesh) {
      const mat = child.material as THREE.MeshStandardMaterial;
      if (mat?.color) color = mat.color.getHex();
    }
  });
  return color === -1 ? 0x8a8578 : color;
}

// ── Particles ────────────────────────────────────────────────────────────────

/**
 * Spawns a THREE.Points burst with all particles starting at `position`.
 * Caller updates positions and disposes when done.
 */
export function createParticleBurst(
  group: THREE.Group,
  position: THREE.Vector3,
  color: number,
  count: number,
): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y + 0.2;
    positions[i * 3 + 2] = position.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size: 0.1,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  group.add(points);
  return points;
}

// ── Bolt / Projectile ────────────────────────────────────────────────────────

export interface BoltHandle {
  mesh: THREE.Mesh;
  totalLength: number;
  direction: THREE.Vector3;
  from: THREE.Vector3;
}

/**
 * Creates a thin cylinder "bolt" starting at `from`, oriented toward `to`,
 * with scale.y = 0. Animate scale.y → totalLength each frame and update
 * bolt.position = from + direction * (scale.y / 2) to simulate travel.
 */
export function createBolt(
  group: THREE.Group,
  from: THREE.Vector3,
  to: THREE.Vector3,
  color: number,
): BoltHandle {
  const dir = new THREE.Vector3().subVectors(to, from);
  const totalLength = dir.length();
  dir.normalize();

  const geo = new THREE.CylinderGeometry(0.03, 0.03, 1, 8);
  const mat = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  mesh.scale.y = 0;
  mesh.position.copy(from);
  group.add(mesh);

  return { mesh, totalLength, direction: dir, from: from.clone() };
}

/**
 * Advances the bolt's scale and position for this frame.
 * `t` is normalised progress 0..1.
 */
export function advanceBolt(bolt: BoltHandle, t: number): void {
  const traveled = t * bolt.totalLength;
  bolt.mesh.scale.y = traveled;
  bolt.mesh.position.copy(bolt.from).addScaledVector(bolt.direction, traveled / 2);
}

// ── Math helpers ─────────────────────────────────────────────────────────────

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Normalised 0..1 progress for the window [start, start+duration]. */
export function prog(elapsed: number, start: number, duration: number): number {
  return clamp((elapsed - start) / duration, 0, 1);
}

export function disposeMeshes(group: THREE.Group, meshes: THREE.Mesh[]): void {
  for (const m of meshes) {
    group.remove(m);
    m.geometry.dispose();
    (m.material as THREE.Material).dispose();
  }
}
