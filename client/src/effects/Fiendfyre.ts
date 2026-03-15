/**
 * Fiendfyre — King captures.
 * Volumetric fire shader cylinders engulf victim; victim dissolves with
 * fire-coloured edge. Total: 2.6 s.
 */
import * as THREE from 'three';
import { Howl } from 'howler';
import type { CaptureEffect } from './types';
import { createParticleBurst, prog } from '../utils/captureEffects';
import { CAPTURE_SOUNDS } from '../data/captureSounds';

// ── Inline GLSL shaders ───────────────────────────────────────────────────────

const fireVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
void main(){
  vUv=uv;
  vec4 wp=modelMatrix*vec4(position,1.0);
  vWorldPos=wp.xyz;
  gl_Position=projectionMatrix*viewMatrix*wp;
}`;

const fireFrag = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
uniform float uTime;
uniform float uIntensity;

vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute4(vec4 x){return mod289v4(((x*34.)+1.)*x);}
vec4 tiSqrt4(vec4 r){return 1.79284291400159-0.85373472095314*r;}
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
  vec4 norm=tiSqrt4(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main(){
  vec2 uv=vUv;
  uv.y-=uTime*0.5;
  float n=snoise3(vec3(uv*3.,uTime*1.2))*.5+.5;
  n+=snoise3(vec3(uv*7.,uTime*2.1))*.25;
  n+=snoise3(vec3(uv*14.,uTime*3.6))*.125;
  float shape=pow(1.-vUv.y,0.7)*uIntensity;
  float fire=smoothstep(0.38,0.68,n*shape);
  vec3 c1=vec3(0.8,0.,0.);
  vec3 c2=vec3(1.,0.4,0.);
  vec3 c3=vec3(1.,0.9,0.2);
  vec3 c4=vec3(1.,1.,0.9);
  vec3 col=mix(c1,c2,smoothstep(0.,0.4,fire));
  col=mix(col,c3,smoothstep(0.4,0.7,fire));
  col=mix(col,c4,smoothstep(0.7,1.,fire));
  col+=vec3(-0.05,0.08,-0.02)*fire;
  gl_FragColor=vec4(col,fire*0.92);
}`;

// ── Dissolve for victim ───────────────────────────────────────────────────────

const dissolveVert = /* glsl */ `
varying vec3 vWorldPos;
void main(){
  vec4 wp=modelMatrix*vec4(position,1.0);
  vWorldPos=wp.xyz;
  gl_Position=projectionMatrix*viewMatrix*wp;
}`;

const dissolveFrag = /* glsl */ `
varying vec3 vWorldPos;
uniform float uDissolve;
uniform float uTime;
uniform vec3  uEdgeColor;

vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute4(vec4 x){return mod289v4(((x*34.)+1.)*x);}
vec4 tiSqrt4(vec4 r){return 1.79284291400159-0.85373472095314*r;}
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
  vec4 norm=tiSqrt4(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
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
  gl_FragColor=vec4(uEdgeColor*(1.-ef)*3.,ef);
}`;

// ── Timing ────────────────────────────────────────────────────────────────────

const T = {
  FIRE_GROW_START: 0.2,
  FIRE_GROW_END: 0.8,
  DISSOLVE_START: 0.4,
  DISSOLVE_END: 1.2,
  VICTIM_HIDE: 1.2,
  FIRE_SHRINK_START: 1.0,
  FIRE_SHRINK_END: 1.6,
  EMBERS_AT: 1.2,
  EMBERS_FADE_START: 1.4,
  EMBERS_FADE_END: 2.0,
  READY: 1.6,
  DONE: 2.6,
} as const;

const EMBER_COUNT = 12;
const LAYER_COUNT = 3;

export class FiendfyreEffect implements CaptureEffect {
  private elapsed = 0;
  private _done = false;
  private readyFired = false;
  private embersFired = false;
  private victimHidden = false;
  private dissolveFired = false;

  private group: THREE.Group;
  private victim: THREE.Mesh;
  private onReady: () => void;

  private fireMeshes: THREE.Mesh[] = [];
  private fireShaderMats: THREE.ShaderMaterial[] = [];
  private fireLight: THREE.PointLight;
  private dissolveMat: THREE.ShaderMaterial;
  private embers: THREE.Points | null = null;
  private emberVels: THREE.Vector3[] = [];
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

    const pos = victim.position;

    // Three fire cylinders with volumetric shader
    const radii = [0.28, 0.45, 0.62];
    for (let i = 0; i < LAYER_COUNT; i++) {
      const geo = new THREE.CylinderGeometry(radii[i] * 0.6, radii[i], 1.2, 12, 1, true);
      const mat = new THREE.ShaderMaterial({
        vertexShader: fireVert,
        fragmentShader: fireFrag,
        uniforms: {
          uTime: { value: 0.0 },
          uIntensity: { value: 0.0 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).setY(pos.y + 0.6);
      mesh.scale.set(0.15, 1, 0.15);
      group.add(mesh);
      this.fireMeshes.push(mesh);
      this.fireShaderMats.push(mat);
    }

    this.fireLight = new THREE.PointLight(0xff6600, 3, 6);
    this.fireLight.position.copy(pos).setY(pos.y + 1.2);
    group.add(this.fireLight);

    // Dissolve material (applied at DISSOLVE_START)
    this.dissolveMat = new THREE.ShaderMaterial({
      vertexShader: dissolveVert,
      fragmentShader: dissolveFrag,
      uniforms: {
        uDissolve: { value: 0.0 },
        uTime: { value: 0.0 },
        uEdgeColor: { value: new THREE.Color(0xff6600) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const sfx = CAPTURE_SOUNDS.fiendFyre;
    this.castSfx = new Howl({ src: [sfx.cast], volume: 0.7 });
    this.impactSfx = new Howl({ src: [sfx.impact], volume: 0.8 });
    this.castSfx.play();
    this.impactSfx.play();
  }

  update(delta: number): void {
    this.elapsed += delta;
    const e = this.elapsed;

    const growT = prog(e, T.FIRE_GROW_START, T.FIRE_GROW_END - T.FIRE_GROW_START);
    const shrinkT = prog(e, T.FIRE_SHRINK_START, T.FIRE_SHRINK_END - T.FIRE_SHRINK_START);
    const fireScale = e < T.FIRE_SHRINK_START ? 0.15 + growT * 1.35 : 1.5 * (1 - shrinkT);
    const intensity = Math.min(fireScale, 1.0);

    for (let i = 0; i < this.fireMeshes.length; i++) {
      const mesh = this.fireMeshes[i];
      mesh.scale.set(fireScale, 1 + Math.sin(e * 8 + i * 1.2) * 0.2, fireScale);
      mesh.rotation.y += delta * (0.04 + i * 0.02) * 60;
      this.fireShaderMats[i].uniforms.uTime.value = e;
      this.fireShaderMats[i].uniforms.uIntensity.value = intensity;
    }

    this.fireLight.intensity = (2 + Math.sin(e * 5) * 0.5) * fireScale;

    // Swap to dissolve material
    if (e >= T.DISSOLVE_START && !this.dissolveFired) {
      this.dissolveFired = true;
      (this.victim.material as THREE.Material).dispose();
      this.victim.material = this.dissolveMat;
    }

    // Advance dissolve
    if (e >= T.DISSOLVE_START && e < T.VICTIM_HIDE) {
      this.dissolveMat.uniforms.uDissolve.value = prog(
        e,
        T.DISSOLVE_START,
        T.DISSOLVE_END - T.DISSOLVE_START,
      );
      this.dissolveMat.uniforms.uTime.value = e;
    }

    if (e >= T.VICTIM_HIDE && !this.victimHidden) {
      this.victimHidden = true;
      this.victim.visible = false;
    }

    if (e >= T.EMBERS_AT && !this.embersFired) {
      this.embersFired = true;
      const pos = this.victim.position;
      this.embers = createParticleBurst(this.group, pos, 0xff6600, EMBER_COUNT);
      const ePos = this.embers.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < EMBER_COUNT; i++) {
        const angle = (i / EMBER_COUNT) * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        this.emberVels.push(
          new THREE.Vector3(
            Math.cos(angle) * speed * 0.5,
            2 + Math.random() * 3,
            Math.sin(angle) * speed * 0.5,
          ),
        );
        ePos[i * 3] = pos.x + (Math.random() - 0.5) * 0.3;
        ePos[i * 3 + 1] = pos.y;
        ePos[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.3;
      }
      this.embers.geometry.attributes.position.needsUpdate = true;
    }

    if (this.embers) {
      const ePos = this.embers.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < EMBER_COUNT; i++) {
        this.emberVels[i].y -= 2 * delta;
        ePos[i * 3] += this.emberVels[i].x * delta;
        ePos[i * 3 + 1] += this.emberVels[i].y * delta;
        ePos[i * 3 + 2] += this.emberVels[i].z * delta;
      }
      this.embers.geometry.attributes.position.needsUpdate = true;
      (this.embers.material as THREE.PointsMaterial).opacity =
        1 - prog(e, T.EMBERS_FADE_START, T.EMBERS_FADE_END - T.EMBERS_FADE_START);
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
    for (let i = 0; i < this.fireMeshes.length; i++) {
      this.group.remove(this.fireMeshes[i]);
      this.fireMeshes[i].geometry.dispose();
      this.fireShaderMats[i].dispose();
    }
    this.group.remove(this.fireLight);
    if (this.embers) {
      this.group.remove(this.embers);
      this.embers.geometry.dispose();
      (this.embers.material as THREE.Material).dispose();
    }
    this.victim.removeFromParent();
    this.dissolveMat.dispose();
    this.castSfx.unload();
    this.impactSfx.unload();
  }
}
