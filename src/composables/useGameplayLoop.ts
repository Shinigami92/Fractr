/* oxlint-disable typescript/prefer-readonly-parameter-types -- options struct wraps composable return types with inherent mutable Refs */
import type { Ref, ShallowRef } from 'vue';
import { ref } from 'vue';
import { evaluateSDF } from '../engine/fractals';
import type { Renderer } from '../engine/Renderer';
import type { ActionId } from '../input/actions';
import { useAppState } from '../stores/appState';
import type { ControlSettingsStore } from '../stores/controlSettings';
import { useControlSettings } from '../stores/controlSettings';
import type { FractalParamsStore } from '../stores/fractalParams';
import { useFractalParams } from '../stores/fractalParams';
import type { GraphicsSettingsStore } from '../stores/graphicsSettings';
import { useGraphicsSettings } from '../stores/graphicsSettings';
import type { UseAdaptiveQualityReturn } from './useAdaptiveQuality';
import type { UseGameLoopReturn } from './useGameLoop';
import { useGameLoop } from './useGameLoop';
import type { UseGamepadInputReturn } from './useGamepadInput';
import { useGamepadInput } from './useGamepadInput';
import type { UseInputReturn } from './useInput';
import type { UsePointerLockReturn } from './usePointerLock';
import type { UseRadialMenuControllerReturn } from './useRadialMenuController';
import type { UseSceneStateReturn } from './useSceneState';
import type { UseTouchControlsReturn } from './useTouchControls';
import type { UseURLStateReturn } from './useURLState';

// Dynamic iterations: when enabled, the iteration count ramps logarithmically
// between a minimum factor (near-surface, max detail would saturate anyway)
// and the full configured max as the camera moves further from the surface.

/** Distance floor fed to log10 to avoid -Infinity near the surface. */
const DYN_ITER_DIST_FLOOR = 0.0001;
/** Divisor applied to -log10(dist); larger = slower ramp to max iterations. */
const DYN_ITER_LOG_SCALE_DIVISOR = 4;
/** Minimum iteration count as a fraction of dynMax. */
const DYN_ITER_MIN_FACTOR = 0.3;
/** Absolute lower bound on iterations regardless of ratio. */
const DYN_ITER_MIN_ABSOLUTE = 4;

/** Right-stick look speed in radians/second at full deflection. */
const GAMEPAD_LOOK_SPEED = 2.5;
/** Axis magnitude below which gamepad stick input is ignored for movement flags. */
const GAMEPAD_ACTIVE_EPS = 0.01;

type Camera = UseSceneStateReturn['camera'];
type Vec2 = { x: number; y: number };
type ActionPredicate = (id: ActionId) => boolean;

function isTouchActive(touchMove: Vec2, touchLook: { dx: number; dy: number }): boolean {
  return (
    Math.abs(touchMove.x) > 0.05 ||
    Math.abs(touchMove.y) > 0.05 ||
    Math.abs(touchLook.dx) > 1 ||
    Math.abs(touchLook.dy) > 1
  );
}

function isGamepadActive(
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

function isMovementKeyHeld(kb: ActionPredicate): boolean {
  return (
    kb('moveForward') ||
    kb('moveBackward') ||
    kb('moveRight') ||
    kb('moveLeft') ||
    kb('rollLeft') ||
    kb('rollRight')
  );
}

function applyKeyboardMovement(
  camera: Camera,
  speed: number,
  rollSpeed: number,
  kb: ActionPredicate,
  gp: ActionPredicate,
  isPressed: UseInputReturn['isPressed'],
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

function applyAnalogMovement(
  camera: Camera,
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

export interface UseGameplayLoopOptions {
  rendererRef: ShallowRef<Renderer | null>;
  scene: UseSceneStateReturn;
  pointerLock: UsePointerLockReturn;
  touchControls: UseTouchControlsReturn;
  adaptiveQuality: UseAdaptiveQualityReturn;
  radial: UseRadialMenuControllerReturn;
  input: UseInputReturn;
  urlState: UseURLStateReturn;
  getTimeSeconds: () => number;
}

export interface UseGameplayLoopReturn {
  gameLoop: UseGameLoopReturn;
  currentIterations: Ref<number>;
  sampleCount: Ref<number>;
}

function computeEffectiveIterations(
  fractal: FractalParamsStore,
  graphics: GraphicsSettingsStore,
  absDist: number,
): number {
  if (!graphics.dynamicIterations) return fractal.maxIterations;
  const dynMax = Math.min(
    fractal.maxIterations,
    fractal.config.dynMaxIterations ?? fractal.maxIterations,
  );
  const iterScale = Math.max(
    0,
    Math.min(1, -Math.log10(Math.max(absDist, DYN_ITER_DIST_FLOOR)) / DYN_ITER_LOG_SCALE_DIVISOR),
  );
  const minIter = Math.max(DYN_ITER_MIN_ABSOLUTE, Math.ceil(dynMax * DYN_ITER_MIN_FACTOR));
  return Math.ceil(minIter + (dynMax - minIter) * iterScale);
}

function applyLookRotation(
  camera: Camera,
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

interface LoopInput {
  dx: number;
  dy: number;
  touchLook: { dx: number; dy: number };
  touchMove: Vec2;
  lx: number;
  ly: number;
  rx: number;
  ry: number;
}

function sampleLoopInput(
  options: UseGameplayLoopOptions,
  gamepad: UseGamepadInputReturn,
): LoopInput {
  const { dx, dy } = options.pointerLock.consumeMovement();
  const touchLook = options.touchControls.consumeLookDelta();
  const touchMove = options.touchControls.getMovementVector();
  const { x: lx, y: ly } = gamepad.leftStick.value;
  const { x: rx, y: ry } = gamepad.rightStick.value;
  return { dx, dy, touchLook, touchMove, lx, ly, rx, ry };
}

function computeAbsDistance(fractal: FractalParamsStore, camera: Camera): number {
  return Math.abs(
    evaluateSDF(
      fractal.fractalType,
      camera.position[0]!,
      camera.position[1]!,
      camera.position[2]!,
      { power: fractal.power, maxIterations: fractal.maxIterations, bailout: fractal.bailout },
    ),
  );
}

function computeMoving(
  input: Readonly<LoopInput>,
  isPressed: UseInputReturn['isPressed'],
  kb: ActionPredicate,
  gp: ActionPredicate,
): boolean {
  return (
    isMovementKeyHeld(kb) ||
    isPressed('Mouse0') ||
    isPressed('Mouse2') ||
    Math.abs(input.dx) > 1 ||
    Math.abs(input.dy) > 1 ||
    isTouchActive(input.touchMove, input.touchLook) ||
    isGamepadActive(input.lx, input.ly, input.rx, input.ry, gp)
  );
}

interface LoopState {
  wasMoving: boolean;
  isMovingThisFrame: boolean;
  currentIterations: Ref<number>;
}

/* oxlint-disable-next-line eslint/max-lines-per-function -- frame update orchestrates input sampling, movement, and uniform upload; splitting further obscures the pipeline */
function runFrameUpdate(
  dt: number,
  options: UseGameplayLoopOptions,
  state: LoopState,
  fps: number,
  fractal: FractalParamsStore,
  graphics: GraphicsSettingsStore,
  controls: ControlSettingsStore,
  gamepad: UseGamepadInputReturn,
): void {
  const { camera } = options.scene;
  const input = sampleLoopInput(options, gamepad);
  const { isPressed } = options.input;

  applyLookRotation(
    camera,
    controls.mouseSensitivity,
    options.radial.activeId.value != null,
    dt,
    input.dx + input.touchLook.dx,
    input.dy + input.touchLook.dy,
    input.rx,
    input.ry,
  );

  const absDist = computeAbsDistance(fractal, camera);
  const speedScale = Math.max(1e-6, Math.min(1, absDist));
  const shifting = isPressed('ShiftLeft') || isPressed('ShiftRight');
  const speed = controls.cameraSpeed * speedScale * (shifting ? 2 : 1) * dt;

  const effectiveIterations = computeEffectiveIterations(fractal, graphics, absDist);
  state.currentIterations.value = effectiveIterations;

  const kb: ActionPredicate = (id) => {
    const code = controls.getBinding(id, 'keyboard');
    return code != null && isPressed(code);
  };
  const gp: ActionPredicate = (id) => {
    const code = controls.getBinding(id, 'gamepad');
    return code != null && gamepad.pressedButtons.value.has(code);
  };

  const moving = computeMoving(input, isPressed, kb, gp);
  options.adaptiveQuality.update(dt, fps, moving);

  applyKeyboardMovement(camera, speed, 1.5 * dt, kb, gp, isPressed, shifting);
  applyAnalogMovement(camera, speed, input.touchMove, input.lx, input.ly);

  state.isMovingThisFrame = moving;
  const renderer = options.rendererRef.value;
  if (moving) renderer?.resetAccumulation();
  else if (state.wasMoving) options.urlState.syncURLState();
  state.wasMoving = moving;

  options.scene.syncCameraPos();
  renderer?.updateUniforms(
    camera,
    options.scene.buildLiveSceneParams({ maxIterations: effectiveIterations }),
    options.getTimeSeconds(),
  );
}

/**
 * The main gameplay update/render loop: consumes pointer-lock + touch input,
 * moves the camera with distance-scaled speed, drives adaptive quality, and
 * pushes uniforms + draws each frame.
 */
export function useGameplayLoop(options: UseGameplayLoopOptions): UseGameplayLoopReturn {
  const appState = useAppState();
  const fractal = useFractalParams();
  const graphics = useGraphicsSettings();
  const controls = useControlSettings();
  const gamepad = useGamepadInput();

  const currentIterations = ref(0);
  const sampleCount = ref(0);
  const state: LoopState = { wasMoving: false, isMovingThisFrame: false, currentIterations };

  const gameLoop = useGameLoop({
    update(dt) {
      if (appState.mode !== 'playing') return;
      runFrameUpdate(dt, options, state, gameLoop.fps.value, fractal, graphics, controls, gamepad);
    },
    render() {
      const renderer = options.rendererRef.value;
      renderer?.render(!state.isMovingThisFrame && !graphics.animatedColors);
      sampleCount.value = renderer?.sampleCount ?? 0;
    },
  });

  return { gameLoop, currentIterations, sampleCount };
}
