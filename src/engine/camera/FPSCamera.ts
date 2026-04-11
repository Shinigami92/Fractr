import * as mat4 from '../../utils/mat4';
import * as vec3 from '../../utils/vec3';

const UP = vec3.create(0, 1, 0);
const PITCH_LIMIT = (89 * Math.PI) / 180;

export class FPSCamera {
  position: vec3.Vec3;
  yaw = -Math.PI / 2; // Look along -Z initially
  pitch = 0;

  private readonly forward = vec3.create();
  private readonly right = vec3.create();
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
    this.updateForward();
    vec3.scaleAndAdd(this.position, this.position, this.forward, amount);
  }

  moveRight(amount: number): void {
    this.updateForward();
    vec3.cross(this.right, this.forward, UP);
    vec3.normalize(this.right, this.right);
    vec3.scaleAndAdd(this.position, this.position, this.right, amount);
  }

  moveUp(amount: number): void {
    this.position[1]! += amount;
    this.position[1] = this.position[1]!;
  }

  getViewProjectionInverse(aspect: number, fov = Math.PI / 3): Float32Array {
    this.updateForward();
    const target = vec3.create();
    vec3.add(target, this.position, this.forward);

    mat4.lookAt(this.viewMatrix, this.position, target, UP);
    mat4.perspective(this.projMatrix, fov, aspect, 0.01, 100);
    mat4.multiply(this.vpMatrix, this.projMatrix, this.viewMatrix);
    mat4.invert(this.vpInverse, this.vpMatrix);
    return this.vpInverse;
  }

  private updateForward(): void {
    this.forward[0] = Math.cos(this.pitch) * Math.cos(this.yaw);
    this.forward[1] = Math.sin(this.pitch);
    this.forward[2] = Math.cos(this.pitch) * Math.sin(this.yaw);
    vec3.normalize(this.forward, this.forward);
  }
}
