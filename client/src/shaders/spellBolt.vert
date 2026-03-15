varying vec2 vUv;
uniform float uProgress;

void main() {
  vUv = uv;

  vec3 pos = position;
  // Bolt wiggles perpendicular to its axis (Y = length axis for cylinder)
  float wiggle = sin(pos.y * 20.0 + uProgress * 30.0) * 0.015 * (1.0 - abs(pos.y));
  pos.x += wiggle;
  pos.z += wiggle * 0.5;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
