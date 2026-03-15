/**
 * Avada Kedavra — Queen captures.
 * GLSL shader bolt travels to victim; victim dissolves via noise-based
 * dissolve shader with green glowing edge. Total: 2.2 s.
 */
import * as THREE from 'three';
import { Howl } from 'howler';
import type { CaptureEffect } from './types';
import { createBolt, advanceBolt, prog } from '../utils/captureEffects';
import type { BoltHandle } from '../utils/captureEffects';
import { CAPTURE_SOUNDS } from '../data/captureSounds';

// Inline GLSL (vite-plugin-glsl handles ?raw imports; fall back to string literals
// so this file compiles without the plugin in Vitest/Node environments.)
const dissolveVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position,1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const dissolveFrag = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
uniform float uDissolve;
uniform float uTime;
uniform vec3  uEdgeColor;

vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute4(vec4 x){return mod289v4(((x*34.)+1.)*x);}
vec4 taylorInvSqrt4(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise3(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289v3(i);
  vec4 p=permute4(permute4(permute4(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 xv=x_*ns.x+ns.yyyy;vec4 yv=y_*ns.x+ns.yyyy;vec4 h=1.-abs(xv)-abs(yv);
  vec4 b0=vec4(xv.xy,yv.xy);vec4 b1=vec4(xv.zw,yv.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt4(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main(){
  float n=snoise3(vWorldPos*3.+uTime*.5)*.5+.5;
  n+=snoise3(vWorldPos*7.)*.25;
  n+=snoise3(vWorldPos*15.)*.125;
  n=clamp(n,0.,1.);
  if(n<uDissolve) discard;
  float ef=smoothstep(uDissolve,uDissolve+0.06,n);
  vec3 eg=uEdgeColor*(1.-ef)*3.;
  gl_FragColor=vec4(eg,ef);
}`;

const T = {
  BOLT_END: 0.3,
  FLASH_END: 0.45,
  DISSOLVE_START: 0.3,
  DISSOLVE_END: 1.1,
  VICTIM_HIDE: 1.1,
  WISPS_AT: 0.6,
  WISPS_FADE_START: 1.0,
  WISPS_FADE_END: 1.4,
  READY: 1.2,
  DONE: 2.2,
} as const;

const WISP_COUNT = 8;

export class AvadaKedavraEffect implements CaptureEffect {
  private elapsed = 0;
  private _done = false;
  private readyFired = false;
  private impactFired = false;
  private wispsFired = false;
  private victimHidden = false;

  private group: THREE.Group;
  private victim: THREE.Mesh;
  private onReady: () => void;
  private victimStartY: number;
  private bolt: BoltHandle;
  private boltLight: THREE.PointLight;
  private flashLight: THREE.PointLight;
  private dissolveMat: THREE.ShaderMaterial;
  private wisps: THREE.Points | null = null;
  private wispVels: THREE.Vector3[] = [];
  private wispAngles: number[] = [];
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

    const from = attackerPos.clone().setY(attackerPos.y + 0.6);
    const to = victim.position.clone().setY(victim.position.y + 0.5);

    this.bolt = createBolt(group, from, to, 0x33ff44);

    this.boltLight = new THREE.PointLight(0x00ff44, 4, 4);
    this.boltLight.position.copy(from);
    group.add(this.boltLight);

    this.flashLight = new THREE.PointLight(0x00ff44, 0, 6);
    this.flashLight.position.copy(victim.position);
    group.add(this.flashLight);

    // Dissolve shader material replaces the piece's standard material at impact
    this.dissolveMat = new THREE.ShaderMaterial({
      vertexShader: dissolveVert,
      fragmentShader: dissolveFrag,
      uniforms: {
        uDissolve: { value: 0.0 },
        uTime: { value: 0.0 },
        uEdgeColor: { value: new THREE.Color(0x00ff44) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const sfx = CAPTURE_SOUNDS.avadaKedavra;
    this.castSfx = new Howl({ src: [sfx.cast], volume: 0.7 });
    this.impactSfx = new Howl({ src: [sfx.impact], volume: 0.8 });
    this.castSfx.play();
  }

  update(delta: number): void {
    this.elapsed += delta;
    const e = this.elapsed;

    this.dissolveMat.uniforms.uTime.value = e;

    // Bolt travels 0–0.3 s
    if (e <= T.BOLT_END) {
      const t = prog(e, 0, T.BOLT_END);
      advanceBolt(this.bolt, t);
      this.boltLight.position
        .copy(this.bolt.from)
        .addScaledVector(this.bolt.direction, this.bolt.mesh.scale.y / 2);
    }

    // Impact
    if (e > T.BOLT_END && !this.impactFired) {
      this.impactFired = true;
      this.bolt.mesh.visible = false;
      this.boltLight.intensity = 0;
      this.flashLight.intensity = 10;
      this.impactSfx.play();

      // Swap to dissolve shader
      (this.victim.material as THREE.Material).dispose();
      this.victim.material = this.dissolveMat;
    }

    // Flash decays
    if (e >= T.BOLT_END && e <= T.FLASH_END) {
      this.flashLight.intensity = 10 * (1 - prog(e, T.BOLT_END, T.FLASH_END - T.BOLT_END));
    }

    // Dissolve 0.3–1.1 s
    if (e >= T.DISSOLVE_START && e < T.VICTIM_HIDE) {
      this.dissolveMat.uniforms.uDissolve.value = prog(
        e,
        T.DISSOLVE_START,
        T.DISSOLVE_END - T.DISSOLVE_START,
      );
    }

    // Victim slumps slightly
    if (e >= T.DISSOLVE_START && e < T.VICTIM_HIDE) {
      const t = prog(e, T.DISSOLVE_START, T.VICTIM_HIDE - T.DISSOLVE_START);
      this.victim.position.y = this.victimStartY - t * 0.3;
    }

    if (e >= T.VICTIM_HIDE && !this.victimHidden) {
      this.victimHidden = true;
      this.victim.visible = false;
    }

    // Wisps at 0.6 s
    if (e >= T.WISPS_AT && !this.wispsFired) {
      this.wispsFired = true;
      const pos = this.victim.position.clone();
      const wispPos = new Float32Array(WISP_COUNT * 3);
      for (let i = 0; i < WISP_COUNT; i++) {
        wispPos[i * 3] = pos.x;
        wispPos[i * 3 + 1] = pos.y;
        wispPos[i * 3 + 2] = pos.z;
        this.wispVels.push(new THREE.Vector3(0, 1.5 + Math.random(), 0));
        this.wispAngles.push((i / WISP_COUNT) * Math.PI * 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(wispPos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x00ff44,
        size: 0.09,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      this.wisps = new THREE.Points(geo, mat);
      this.group.add(this.wisps);
    }

    if (this.wisps) {
      const wPos = this.wisps.geometry.attributes.position.array as Float32Array;
      const vPos = this.victim.position;
      for (let i = 0; i < WISP_COUNT; i++) {
        this.wispAngles[i] += delta * 3;
        const radius = 0.3 * (1 - prog(e, T.WISPS_AT, 0.8));
        wPos[i * 3] = vPos.x + Math.cos(this.wispAngles[i]) * radius;
        wPos[i * 3 + 1] += this.wispVels[i].y * delta;
        wPos[i * 3 + 2] = vPos.z + Math.sin(this.wispAngles[i]) * radius;
      }
      this.wisps.geometry.attributes.position.needsUpdate = true;
      (this.wisps.material as THREE.PointsMaterial).opacity =
        1 - prog(e, T.WISPS_FADE_START, T.WISPS_FADE_END - T.WISPS_FADE_START);
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
    this.group.remove(this.boltLight);
    this.group.remove(this.flashLight);
    if (this.wisps) {
      this.group.remove(this.wisps);
      this.wisps.geometry.dispose();
      (this.wisps.material as THREE.Material).dispose();
    }
    this.victim.removeFromParent();
    this.dissolveMat.dispose();
    this.castSfx.unload();
    this.impactSfx.unload();
  }
}
