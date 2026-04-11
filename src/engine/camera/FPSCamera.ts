import * as mat4 from '../../utils/mat4';
import * as vec3 from '../../utils/vec3';

const PITCH_LIMIT = (89 * Math.PI) / 180;

export class FPSCamera {
  position: vec3.Vec3;
  yaw = -Math.PI / 2; // Look along -Z initially
  pitch = 0;

  private readonly forward = vec3.create();
  private readonly right = vec3.create();
  private readonly up = vec3.create();
  private readonly viewMatrix = mat4.create();
  private readonly projMatrix = mat4.create();
  private readonly vpMatrix = mat4.create();
  private readonly vpInverse = mat4.create();

  constructor(x = 0, y = 0, z = 3) {
    this.position = vec3.create(x, y, z);
  }

  rotate(deltaYaw: number, deltaPitch: number): void {
    this.yaw += deltaYaw;
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch + deltaPitch));
  }

  moveForward(amount: number): void {
    this.updateBasis();
    vec3.scaleAndAdd(this.position, this.position, this.forward, amount);
  }

  moveRight(amount: number): void {
    this.updateBasis();
    vec3.scaleAndAdd(this.position, this.position, this.right, amount);
  }

  moveUp(amount: number): void {
    this.position[1] = this.position[1]! + amount;
  }

  getViewProjectionInverse(aspect: number, fov = Math.PI / 3): Float32Array {
    this.updateBasis();

    // Build view matrix directly from basis vectors — no lookAt degeneracy
    const r = this.right;
    const u = this.up;
    const f = this.forward;
    const p = this.position;

    const v = this.viewMatrix;
    v[0] = r[0]!;
    v[1] = u[0]!;
    v[2] = -f[0]!;
    v[3] = 0;
    v[4] = r[1]!;
    v[5] = u[1]!;
    v[6] = -f[1]!;
    v[7] = 0;
    v[8] = r[2]!;
    v[9] = u[2]!;
    v[10] = -f[2]!;
    v[11] = 0;
    v[12] = -(r[0]! * p[0]! + r[1]! * p[1]! + r[2]! * p[2]!);
    v[13] = -(u[0]! * p[0]! + u[1]! * p[1]! + u[2]! * p[2]!);
    v[14] = f[0]! * p[0]! + f[1]! * p[1]! + f[2]! * p[2]!;
    v[15] = 1;

    mat4.perspective(this.projMatrix, fov, aspect, 0.0001, 100);
    mat4.multiply(this.vpMatrix, this.projMatrix, this.viewMatrix);
    mat4.invert(this.vpInverse, this.vpMatrix);
    return this.vpInverse;
  }

  private updateBasis(): void {
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);
    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);

    // Forward
    this.forward[0] = cosP * cosY;
    this.forward[1] = sinP;
    this.forward[2] = cosP * sinY;
    vec3.normalize(this.forward, this.forward);

    // Right = forward x worldUp, then normalize
    // For FPS camera, right vector is always horizontal (no roll)
    this.right[0] = -sinY;
    this.right[1] = 0;
    this.right[2] = cosY;
    // Already normalized (sin^2 + cos^2 = 1)

    // Up = right x forward
    vec3.cross(this.up, this.right, this.forward);
    vec3.normalize(this.up, this.up);
  }
}
