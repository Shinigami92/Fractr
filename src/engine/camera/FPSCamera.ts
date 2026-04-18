import * as mat4 from '../../utils/mat4';
import * as vec3 from '../../utils/vec3';

export class FPSCamera {
  position: vec3.Vec3;

  // Orientation as basis vectors (true 6DOF, no gimbal lock)
  private _forward: vec3.Vec3 = vec3.create(0, 0, -1);
  private _right: vec3.Vec3 = vec3.create(1, 0, 0);
  private _up: vec3.Vec3 = vec3.create(0, 1, 0);

  private readonly viewMatrix = mat4.create();
  private readonly projMatrix = mat4.create();
  private readonly vpMatrix = mat4.create();
  private readonly vpInverse = mat4.create();

  constructor(x = 0, y = 0, z = 3) {
    this.position = vec3.create(x, y, z);
  }

  // Euler angle getters for HUD display
  get yaw(): number {
    return Math.atan2(this._forward[2]!, this._forward[0]!);
  }

  get pitch(): number {
    return Math.asin(Math.max(-1, Math.min(1, this._forward[1]!)));
  }

  get roll(): number {
    // Project world up onto the camera's right-up plane
    const worldUpDotRight = this._right[1]!;
    const worldUpDotUp = this._up[1]!;
    return Math.atan2(worldUpDotRight, worldUpDotUp);
  }

  // Set orientation from Euler angles (for URL restore / reset)
  set yaw(v: number) {
    this.setFromEuler(v, this.pitch, this.roll);
  }

  set pitch(v: number) {
    this.setFromEuler(this.yaw, v, this.roll);
  }

  set roll(v: number) {
    this.setFromEuler(this.yaw, this.pitch, v);
  }

  setFromEuler(yaw: number, pitch: number, roll: number): void {
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    // Forward from yaw/pitch
    this._forward[0] = cosP * cosY;
    this._forward[1] = sinP;
    this._forward[2] = cosP * sinY;
    vec3.normalize(this._forward, this._forward);

    // Right (horizontal, no roll yet)
    const rx = -sinY;
    const rz = cosY;

    // Up (no roll)
    const ux = -sinP * cosY;
    const uy = cosP;
    const uz = -sinP * sinY;

    // Apply roll
    if (roll !== 0) {
      const cosR = Math.cos(roll);
      const sinR = Math.sin(roll);
      this._right[0] = rx * cosR + ux * sinR;
      this._right[1] = uy * sinR;
      this._right[2] = rz * cosR + uz * sinR;
      this._up[0] = ux * cosR - rx * sinR;
      this._up[1] = uy * cosR;
      this._up[2] = uz * cosR - rz * sinR;
    } else {
      this._right[0] = rx;
      this._right[1] = 0;
      this._right[2] = rz;
      this._up[0] = ux;
      this._up[1] = uy;
      this._up[2] = uz;
    }
  }

  // Rotate around local up axis (yaw)
  rotateYaw(angle: number): void {
    this.rotateAroundAxis(this._up, angle, this._forward);
    this.rotateAroundAxis(this._up, angle, this._right);
    this.orthonormalize();
  }

  // Rotate around local right axis (pitch)
  rotatePitch(angle: number): void {
    this.rotateAroundAxis(this._right, angle, this._forward);
    this.rotateAroundAxis(this._right, angle, this._up);
    this.orthonormalize();
  }

  // Rotate around local forward axis (roll)
  rollCamera(angle: number): void {
    this.rotateAroundAxis(this._forward, angle, this._right);
    this.rotateAroundAxis(this._forward, angle, this._up);
    this.orthonormalize();
  }

  rotate(deltaYaw: number, deltaPitch: number): void {
    this.rotateYaw(-deltaYaw);
    this.rotatePitch(deltaPitch);
  }

  moveForward(amount: number): void {
    vec3.scaleAndAdd(this.position, this.position, this._forward, amount);
  }

  moveRight(amount: number): void {
    vec3.scaleAndAdd(this.position, this.position, this._right, amount);
  }

  moveUp(amount: number): void {
    vec3.scaleAndAdd(this.position, this.position, this._up, amount);
  }

  getViewProjectionInverse(
    aspect: number,
    fov = Math.PI / 3,
    positionOverride?: vec3.ReadonlyVec3,
  ): Float32Array {
    const r = this._right;
    const u = this._up;
    const f = this._forward;
    const p = positionOverride ?? this.position;

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

  // Rodrigues rotation: rotate vec around axis by angle
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- `vec` is mutated in place
  private rotateAroundAxis(axis: vec3.ReadonlyVec3, angle: number, vec: vec3.Vec3): void {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    const ax = axis[0]!;
    const ay = axis[1]!;
    const az = axis[2]!;
    const vx = vec[0]!;
    const vy = vec[1]!;
    const vz = vec[2]!;

    vec[0] = (t * ax * ax + c) * vx + (t * ax * ay - s * az) * vy + (t * ax * az + s * ay) * vz;
    vec[1] = (t * ax * ay + s * az) * vx + (t * ay * ay + c) * vy + (t * ay * az - s * ax) * vz;
    vec[2] = (t * ax * az - s * ay) * vx + (t * ay * az + s * ax) * vy + (t * az * az + c) * vz;
  }

  // Re-orthonormalize basis to prevent drift from floating point accumulation
  private orthonormalize(): void {
    vec3.normalize(this._forward, this._forward);
    // Right = forward x up, then normalize
    vec3.cross(this._right, this._forward, this._up);
    vec3.normalize(this._right, this._right);
    // Up = right x forward
    vec3.cross(this._up, this._right, this._forward);
    vec3.normalize(this._up, this._up);
  }
}
