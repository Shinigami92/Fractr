import type { ActionId } from './actions';

export type Vec2 = { readonly x: number; readonly y: number };
export type ActionPredicate = (id: ActionId) => boolean;

/** Axis magnitude below which gamepad stick input is ignored for movement flags. */
export const GAMEPAD_ACTIVE_EPS = 0.01;

export interface LoopInput {
  readonly dx: number;
  readonly dy: number;
  readonly touchLook: { readonly dx: number; readonly dy: number };
  readonly touchMove: Vec2;
  readonly lx: number;
  readonly ly: number;
  readonly rx: number;
  readonly ry: number;
}

export function isTouchActive(
  touchMove: Vec2,
  touchLook: { readonly dx: number; readonly dy: number },
): boolean {
  return (
    Math.abs(touchMove.x) > 0.05 ||
    Math.abs(touchMove.y) > 0.05 ||
    Math.abs(touchLook.dx) > 1 ||
    Math.abs(touchLook.dy) > 1
  );
}

export function isGamepadActive(
  lx: number,
  ly: number,
  rx: number,
  ry: number,
  gp: ActionPredicate,
): boolean {
  return (
    Math.abs(lx) > GAMEPAD_ACTIVE_EPS ||
    Math.abs(ly) > GAMEPAD_ACTIVE_EPS ||
    Math.abs(rx) > GAMEPAD_ACTIVE_EPS ||
    Math.abs(ry) > GAMEPAD_ACTIVE_EPS ||
    gp('rollLeft') ||
    gp('rollRight')
  );
}

export function isMovementKeyHeld(kb: ActionPredicate): boolean {
  return (
    kb('moveForward') ||
    kb('moveBackward') ||
    kb('moveRight') ||
    kb('moveLeft') ||
    kb('rollLeft') ||
    kb('rollRight')
  );
}

export function computeMoving(
  input: LoopInput,
  isMousePressed: (code: string) => boolean,
  kb: ActionPredicate,
  gp: ActionPredicate,
): boolean {
  return (
    isMovementKeyHeld(kb) ||
    isMousePressed('Mouse0') ||
    isMousePressed('Mouse2') ||
    Math.abs(input.dx) > 1 ||
    Math.abs(input.dy) > 1 ||
    isTouchActive(input.touchMove, input.touchLook) ||
    isGamepadActive(input.lx, input.ly, input.rx, input.ry, gp)
  );
}
