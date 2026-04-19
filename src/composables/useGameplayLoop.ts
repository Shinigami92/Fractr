/* oxlint-disable typescript/prefer-readonly-parameter-types -- options struct wraps composable return types with inherent mutable Refs */
import type { Ref, ShallowRef } from 'vue';
import { ref } from 'vue';
import {
  applyAnalogMovement,
  applyKeyboardMovement,
  applyLookRotation,
} from '../engine/camera/movement';
import { evaluateSDF } from '../engine/fractals';
import { computeEffectiveIterations } from '../engine/fractals/dynamicIterations';
import type { Renderer } from '../engine/Renderer';
import type { ActionPredicate, LoopInput } from '../input/inputActivity';
import { computeMoving } from '../input/inputActivity';
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

type Camera = UseSceneStateReturn['camera'];

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

interface LoopState {
  wasMoving: boolean;
  isMovingThisFrame: boolean;
  currentIterations: Ref<number>;
  /**
   * Latched while the radial menu is open and held until the left stick
   * returns to neutral. Prevents the camera from snapping off in the sector
   * direction the instant the player releases the radial button.
   */
  leftStickGated: boolean;
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

  const radialOpen = options.radial.activeId.value != null;
  applyLookRotation(
    camera,
    controls.mouseSensitivity,
    radialOpen,
    dt,
    input.dx + input.touchLook.dx,
    input.dy + input.touchLook.dy,
    input.rx,
    input.ry,
  );
  // Left stick drives the radial cursor while a menu is open — the right hand
  // is busy holding the cycle button, so the left thumb is the only one free.
  // Stick value is already deadzoned upstream; onGamepadStick no-ops on a
  // neutral stick so the last deflection stays as the selection until the user
  // actively moves.
  if (radialOpen) options.radial.onGamepadStick(input.lx, input.ly);

  const absDist = computeAbsDistance(fractal, camera);
  const speedScale = Math.max(1e-6, Math.min(1, absDist));
  const shifting = isPressed('ShiftLeft') || isPressed('ShiftRight');
  const speed = controls.cameraSpeed * speedScale * (shifting ? 2 : 1) * dt;

  const effectiveIterations = computeEffectiveIterations(
    graphics.dynamicIterations,
    fractal.maxIterations,
    fractal.config.dynMaxIterations,
    absDist,
  );
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
  // While the radial is open the left stick drives the cursor, not movement.
  // After release, stay gated until the stick returns to neutral so the camera
  // doesn't snap off in the last selection direction.
  if (radialOpen) state.leftStickGated = true;
  else if (state.leftStickGated && input.lx === 0 && input.ly === 0) {
    state.leftStickGated = false;
  }
  const lx = state.leftStickGated ? 0 : input.lx;
  const ly = state.leftStickGated ? 0 : input.ly;
  applyAnalogMovement(camera, speed, input.touchMove, lx, ly);

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
  const state: LoopState = {
    wasMoving: false,
    isMovingThisFrame: false,
    currentIterations,
    leftStickGated: false,
  };

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
