varying vec2 vUv;
uniform float uProgress;  // 0 → 1: bolt head travels along length
uniform float uTime;
uniform vec3  uColor;     // spell colour e.g. (0.1, 1.0, 0.2) for Avada

void main() {
  // Core brightness: narrow band around U = 0.5
  float core = 1.0 - smoothstep(0.0, 0.3, abs(vUv.x - 0.5));
  float glow = 1.0 - smoothstep(0.0, 0.5, abs(vUv.x - 0.5));

  // Travelling head: only render behind the bolt tip
  float head = smoothstep(uProgress - 0.12, uProgress, vUv.y);
  float tail = smoothstep(0.0, 0.25, vUv.y);

  float alpha = (core * 0.9 + glow * 0.35) * head * tail;

  // Flicker
  float flicker = 0.85 + 0.15 * sin(uTime * 40.0 + vUv.y * 10.0);
  vec3  col     = mix(uColor * 0.4, uColor, core) * flicker;

  gl_FragColor = vec4(col, alpha);
}
