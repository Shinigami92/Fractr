/* oxlint-disable typescript/prefer-readonly-parameter-types -- options struct wraps composable return types with inherent mutable Refs */
import type { Ref, ShallowRef } from 'vue';
import { ref } from 'vue';
import { evaluateSDF } from '../engine/fractals/sdf';
import type { Renderer } from '../engine/Renderer';
import type { ActionId } from '../input/actions';
import { useAppState } from '../stores/appState';
import { useControlSettings } from '../stores/controlSettings';
import { useFractalParams } from '../stores/fractalParams';
import { useGraphicsSettings } from '../stores/graphicsSettings';
import type { UseAdaptiveQualityReturn } from './useAdaptiveQuality';
import type { UseGameLoopReturn } from './useGameLoop';
import { useGameLoop } from './useGameLoop';
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

  let wasMoving = false;
  let isMovingThisFrame = false;

  function computeEffectiveIterations(absDist: number): number {
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
    dt: number,
    totalDx: number,
    totalDy: number,
    rx: number,
    ry: number,
  ): void {
    if (options.radial.activeId.value) return;
    camera.rotate(totalDx * controls.mouseSensitivity, -totalDy * controls.mouseSensitivity);
    if (rx !== 0 || ry !== 0) {
      camera.rotate(rx * GAMEPAD_LOOK_SPEED * dt, -ry * GAMEPAD_LOOK_SPEED * dt);
    }
  }

  const gameLoop = useGameLoop({
    update(dt) {
      if (appState.mode !== 'playing') return;

      const { camera } = options.scene;

      // Input sampling
      const { dx, dy } = options.pointerLock.consumeMovement();
      const touchLook = options.touchControls.consumeLookDelta();
      const touchMove = options.touchControls.getMovementVector();
      const { x: lx, y: ly } = gamepad.leftStick.value;
      const { x: rx, y: ry } = gamepad.rightStick.value;
      const { isPressed } = options.input;

      // Camera rotation from mouse + touch (disabled while radial menu is open)
      applyLookRotation(camera, dt, dx + touchLook.dx, dy + touchLook.dy, rx, ry);

      // Distance-based camera speed: slow near surfaces, fast in open space
      const absDist = Math.abs(
        evaluateSDF(
          fractal.fractalType,
          camera.position[0]!,
          camera.position[1]!,
          camera.position[2]!,
          { power: fractal.power, maxIterations: fractal.maxIterations, bailout: fractal.bailout },
        ),
      );
      const speedScale = Math.max(1e-6, Math.min(1, absDist));
      const shifting = isPressed('ShiftLeft') || isPressed('ShiftRight');
      const sprint = shifting ? 2 : 1;
      const speed = controls.cameraSpeed * speedScale * sprint * dt;

      const effectiveIterations = computeEffectiveIterations(absDist);
      currentIterations.value = effectiveIterations;

      const kb: ActionPredicate = (id) => {
        const code = controls.getBinding(id, 'keyboard');
        return code != null && isPressed(code);
      };
      const gp: ActionPredicate = (id) => {
        const code = controls.getBinding(id, 'gamepad');
        return code != null && gamepad.pressedButtons.value.has(code);
      };

      const moving =
        isMovementKeyHeld(kb) ||
        isPressed('Mouse0') ||
        isPressed('Mouse2') ||
        Math.abs(dx) > 1 ||
        Math.abs(dy) > 1 ||
        isTouchActive(touchMove, touchLook) ||
        isGamepadActive(lx, ly, rx, ry, gp);

      options.adaptiveQuality.update(dt, gameLoop.fps.value, moving);

      applyKeyboardMovement(camera, speed, 1.5 * dt, kb, gp, isPressed, shifting);
      applyAnalogMovement(camera, speed, touchMove, lx, ly);

      // Track movement for render path selection
      isMovingThisFrame = moving;
      const renderer = options.rendererRef.value;
      if (moving) renderer?.resetAccumulation();
      else if (wasMoving) options.urlState.syncURLState();
      wasMoving = moving;

      options.scene.syncCameraPos();

      renderer?.updateUniforms(
        camera,
        options.scene.buildLiveSceneParams({ maxIterations: effectiveIterations }),
        options.getTimeSeconds(),
      );
    },
    render() {
      const renderer = options.rendererRef.value;
      renderer?.render(!isMovingThisFrame && !graphics.animatedColors);
      sampleCount.value = renderer?.sampleCount ?? 0;
    },
  });

  return { gameLoop, currentIterations, sampleCount };
}
