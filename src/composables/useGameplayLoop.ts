import type { ShallowRef } from 'vue';
import { ref } from 'vue';
import {
  DYN_ITER_DIST_FLOOR,
  DYN_ITER_LOG_SCALE_DIVISOR,
  DYN_ITER_MIN_ABSOLUTE,
  DYN_ITER_MIN_FACTOR,
} from '../constants/game';
import { evaluateSDF } from '../engine/fractals/sdf';
import type { Renderer } from '../engine/Renderer';
import { useAppState } from '../stores/appState';
import { useControlSettings } from '../stores/controlSettings';
import { useFractalParams } from '../stores/fractalParams';
import { useGraphicsSettings } from '../stores/graphicsSettings';
import type { useAdaptiveQuality } from './useAdaptiveQuality';
import { useGameLoop } from './useGameLoop';
import type { useInput } from './useInput';
import type { usePointerLock } from './usePointerLock';
import type { RadialMenuController } from './useRadialMenuController';
import type { SceneState } from './useSceneState';
import type { useTouchControls } from './useTouchControls';
import type { URLStateController } from './useURLState';

export interface UseGameplayLoopDeps {
  rendererRef: ShallowRef<Renderer | null>;
  scene: SceneState;
  pointerLock: ReturnType<typeof usePointerLock>;
  touchControls: ReturnType<typeof useTouchControls>;
  adaptiveQuality: ReturnType<typeof useAdaptiveQuality>;
  radial: RadialMenuController;
  input: ReturnType<typeof useInput>;
  urlState: URLStateController;
  getTimeSeconds: () => number;
}

/**
 * The main gameplay update/render loop: consumes pointer-lock + touch input,
 * moves the camera with distance-scaled speed, drives adaptive quality, and
 * pushes uniforms + draws each frame.
 */
export function useGameplayLoop(deps: UseGameplayLoopDeps) {
  const appState = useAppState();
  const fractal = useFractalParams();
  const graphics = useGraphicsSettings();
  const controls = useControlSettings();

  const currentIterations = ref(0);
  const sampleCount = ref(0);

  let wasMoving = false;
  let isMovingThisFrame = false;

  const gameLoop = useGameLoop({
    update(dt) {
      if (appState.mode !== 'playing') return;

      const { camera } = deps.scene;

      // Camera rotation from mouse + touch (disabled while radial menu is open)
      const { dx, dy } = deps.pointerLock.consumeMovement();
      const touchLook = deps.touchControls.consumeLookDelta();
      const totalDx = dx + touchLook.dx;
      const totalDy = dy + touchLook.dy;
      if (!deps.radial.activeId.value) {
        camera.rotate(totalDx * controls.mouseSensitivity, -totalDy * controls.mouseSensitivity);
      }

      // Distance-based camera speed: slow near surfaces, fast in open space
      const dist = evaluateSDF(
        fractal.fractalType,
        camera.position[0]!,
        camera.position[1]!,
        camera.position[2]!,
        { power: fractal.power, maxIterations: fractal.maxIterations, bailout: fractal.bailout },
      );
      const absDist = Math.abs(dist);
      const speedScale = Math.max(1e-6, Math.min(1, absDist));
      const { isPressed } = deps.input;
      const sprint = isPressed('ShiftLeft') || isPressed('ShiftRight') ? 2 : 1;
      const speed = controls.cameraSpeed * speedScale * sprint * dt;

      // Dynamic iterations: more detail when close, fewer when far
      let effectiveIterations = fractal.maxIterations;
      if (graphics.dynamicIterations) {
        const dynMax = Math.min(
          fractal.maxIterations,
          fractal.config.dynMaxIterations ?? fractal.maxIterations,
        );
        const iterScale = Math.max(
          0,
          Math.min(
            1,
            -Math.log10(Math.max(absDist, DYN_ITER_DIST_FLOOR)) / DYN_ITER_LOG_SCALE_DIVISOR,
          ),
        );
        const minIter = Math.max(DYN_ITER_MIN_ABSOLUTE, Math.ceil(dynMax * DYN_ITER_MIN_FACTOR));
        effectiveIterations = Math.ceil(minIter + (dynMax - minIter) * iterScale);
      }
      currentIterations.value = effectiveIterations;

      const bindings = controls.keybindings;
      const rollSpeed = 1.5 * dt;
      const touchMove = deps.touchControls.getMovementVector();
      const touchActive =
        Math.abs(touchMove.x) > 0.05 ||
        Math.abs(touchMove.y) > 0.05 ||
        Math.abs(touchLook.dx) > 1 ||
        Math.abs(touchLook.dy) > 1;
      const moving =
        isPressed(bindings.moveForward) ||
        isPressed(bindings.moveBackward) ||
        isPressed(bindings.moveRight) ||
        isPressed(bindings.moveLeft) ||
        isPressed(bindings.rollLeft) ||
        isPressed(bindings.rollRight) ||
        isPressed('Mouse0') ||
        isPressed('Mouse2') ||
        Math.abs(dx) > 1 ||
        Math.abs(dy) > 1 ||
        touchActive;

      // Adaptive quality
      deps.adaptiveQuality.update(dt, gameLoop.fps.value, moving);

      if (isPressed(bindings.moveForward) || isPressed('Mouse0')) camera.moveForward(speed);
      if (isPressed(bindings.moveBackward) || isPressed('Mouse2')) camera.moveForward(-speed);
      if (isPressed(bindings.moveRight)) camera.moveRight(speed);
      if (isPressed(bindings.moveLeft)) camera.moveRight(-speed);
      const shifting = isPressed('ShiftLeft') || isPressed('ShiftRight');
      if (isPressed(bindings.rollLeft)) {
        if (shifting) {
          camera.moveUp(-speed);
        } else {
          camera.rollCamera(-rollSpeed);
        }
      }
      if (isPressed(bindings.rollRight)) {
        if (shifting) {
          camera.moveUp(speed);
        } else {
          camera.rollCamera(rollSpeed);
        }
      }

      // Touch analog movement (additive to keyboard)
      if (Math.abs(touchMove.x) > 0.05 || Math.abs(touchMove.y) > 0.05) {
        camera.moveForward(-touchMove.y * speed);
        camera.moveRight(touchMove.x * speed);
      }

      // Track movement for render path selection
      isMovingThisFrame = moving;
      const renderer = deps.rendererRef.value;
      if (moving) {
        renderer?.resetAccumulation();
      } else if (wasMoving) {
        deps.urlState.syncURLState();
      }
      wasMoving = moving;

      // Update reactive camera position for HUD
      deps.scene.syncCameraPos();

      // Update renderer uniforms
      renderer?.updateUniforms(
        camera,
        deps.scene.buildLiveSceneParams({ maxIterations: effectiveIterations }),
        deps.getTimeSeconds(),
      );
    },
    render() {
      const renderer = deps.rendererRef.value;
      renderer?.render(!isMovingThisFrame && !graphics.animatedColors);
      sampleCount.value = renderer?.sampleCount ?? 0;
    },
  });

  return { gameLoop, currentIterations, sampleCount };
}
