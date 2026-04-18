/* oxlint-disable typescript/prefer-readonly-parameter-types -- FPSCamera has mutable internals */
import type { ActionPredicate, Vec2 } from '../../input/inputActivity';
import type { FPSCamera } from './FPSCamera';

/** Right-stick look speed in radians/second at full deflection. */
const GAMEPAD_LOOK_SPEED = 2.5;

export function applyKeyboardMovement(
  camera: FPSCamera,
  speed: number,
  rollSpeed: number,
  kb: ActionPredicate,
  gp: ActionPredicate,
  isPressed: (code: string) => boolean,
  shifting: boolean,
): void {
  if (kb('moveForward') || isPressed('Mouse0')) camera.moveForward(speed);
  if (kb('moveBackward') || isPressed('Mouse2')) camera.moveForward(-speed);
  if (kb('moveRight')) camera.moveRight(speed);
  if (kb('moveLeft')) camera.moveRight(-speed);
  if (kb('rollLeft')) {
    if (shifting) camera.moveUp(-speed);
    else camera.rollCamera(-rollSpeed);
  }
  if (kb('rollRight')) {
    if (shifting) camera.moveUp(speed);
    else camera.rollCamera(rollSpeed);
  }
  if (gp('rollLeft')) camera.rollCamera(-rollSpeed);
  if (gp('rollRight')) camera.rollCamera(rollSpeed);
}

export function applyAnalogMovement(
  camera: FPSCamera,
  speed: number,
  touchMove: Vec2,
  lx: number,
  ly: number,
): void {
  if (Math.abs(touchMove.x) > 0.05 || Math.abs(touchMove.y) > 0.05) {
    camera.moveForward(-touchMove.y * speed);
    camera.moveRight(touchMove.x * speed);
  }
  if (lx !== 0 || ly !== 0) {
    camera.moveForward(-ly * speed);
    camera.moveRight(lx * speed);
  }
}

export function applyLookRotation(
  camera: FPSCamera,
  mouseSensitivity: number,
  radialOpen: boolean,
  dt: number,
  totalDx: number,
  totalDy: number,
  rx: number,
  ry: number,
): void {
  if (radialOpen) return;
  camera.rotate(totalDx * mouseSensitivity, -totalDy * mouseSensitivity);
  if (rx !== 0 || ry !== 0) {
    camera.rotate(rx * GAMEPAD_LOOK_SPEED * dt, -ry * GAMEPAD_LOOK_SPEED * dt);
  }
}
