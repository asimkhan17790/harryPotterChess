/**
 * Critically-damped spring for organic physics-feel animations.
 * Integrates a mass-spring-damper system each frame using semi-implicit Euler.
 */
export class Spring {
  stiffness: number;
  damping: number;
  mass: number;
  value: number;
  velocity: number;
  target: number;

  constructor(stiffness = 200, damping = 26, mass = 1) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
    this.value = 0;
    this.velocity = 0;
    this.target = 0;
  }

  update(dt: number): number {
    const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
    this.velocity += (force / this.mass) * dt;
    this.value += this.velocity * dt;
    return this.value;
  }

  /** Snap to value immediately with no oscillation. */
  reset(value = 0): void {
    this.value = value;
    this.velocity = 0;
    this.target = value;
  }
}
