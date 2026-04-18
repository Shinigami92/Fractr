/* oxlint-disable typescript/prefer-readonly-parameter-types -- Vue Refs and HTMLCanvasElement have mutating internals */
import type { Ref, ShallowRef } from 'vue';
import { onUnmounted, ref, watch } from 'vue';
import { WebGPUContext } from '../engine/gpu/WebGPUContext';
import { Renderer } from '../engine/Renderer';
import { useAppState } from '../stores/appState';
import { useFractalParams } from '../stores/fractalParams';
import { useGraphicsSettings } from '../stores/graphicsSettings';
import type { UseAdaptiveQualityReturn } from './useAdaptiveQuality';
import type { UseGameLoopReturn } from './useGameLoop';
import type { UsePointerLockReturn } from './usePointerLock';
import type { UseSceneStateReturn } from './useSceneState';
import type { UseURLStateReturn } from './useURLState';

/** Canvas resolution scale applied outside of active gameplay. */
const PREVIEW_RESOLUTION_SCALE = 0.25;

export interface UseRendererLifecycleOptions {
  canvasRef: Ref<HTMLCanvasElement | null>;
  rendererRef: ShallowRef<Renderer | null>;
  startTime: Ref<number>;
  scene: UseSceneStateReturn;
  urlState: UseURLStateReturn;
  gameLoop: UseGameLoopReturn;
  previewLoop: UseGameLoopReturn;
  adaptiveQuality: UseAdaptiveQualityReturn;
  pointerLock: UsePointerLockReturn;
  isTouchActive: Ref<boolean>;
}

export interface UseRendererLifecycleReturn {
  gpuError: Ref<string | null>;
  onCanvasReady: (canvas: HTMLCanvasElement) => Promise<void>;
  onResize: (width: number, height: number) => void;
  applyCanvasResolution: (scale: number) => void;
}

/**
 * Owns renderer construction, canvas sizing, and the watchers that sync
 * fractal/color/render-mode changes into the renderer and start/stop the
 * correct loop on app-mode transitions.
 */
export function useRendererLifecycle(
  options: UseRendererLifecycleOptions,
): UseRendererLifecycleReturn {
  const appState = useAppState();
  const fractal = useFractalParams();
  const graphics = useGraphicsSettings();

  const gpuError = ref<string | null>(null);
  let displayWidth = 1;
  let displayHeight = 1;

  function applyCanvasResolution(scale: number): void {
    const canvas = options.canvasRef.value;
    if (!canvas) return;
    const w = Math.floor(displayWidth * scale);
    const h = Math.floor(displayHeight * scale);
    canvas.width = w;
    canvas.height = h;
    options.rendererRef.value?.resize(w, h);
  }

  async function onCanvasReady(canvas: HTMLCanvasElement): Promise<void> {
    options.canvasRef.value = canvas;

    try {
      const ctx = await WebGPUContext.create(canvas);
      const renderer = new Renderer(ctx);
      renderer.resize(canvas.width, canvas.height);
      renderer.setFractalType(fractal.fractalType);
      renderer.setColorMode(fractal.colorMode);
      renderer.setRenderMode(fractal.renderMode);
      options.rendererRef.value = renderer;
      options.startTime.value = performance.now();

      if (options.urlState.previewMode) {
        // Screenshot mode: render continuously at full quality, no UI
        options.previewLoop.start();
      } else if (options.urlState.startFromURL.value) {
        // Jump directly into 3D view from shared URL
        appState.startGame();
      } else {
        options.previewLoop.start();
      }
    } catch (e) {
      gpuError.value = e instanceof Error ? e.message : 'Unknown WebGPU error';
    }
  }

  function onResize(width: number, height: number): void {
    displayWidth = width;
    displayHeight = height;
    const scale = appState.mode === 'playing' ? 1 : PREVIEW_RESOLUTION_SCALE;
    applyCanvasResolution(scale);
  }

  // Watch for fractal/color mode changes
  watch(
    () => fractal.fractalType,
    (type) => {
      options.rendererRef.value?.setFractalType(type);
      if (!options.urlState.startFromURL.value) {
        options.scene.resetCamera();
        graphics.dynamicIterations = fractal.config.defaultDynamicIterations !== false;
      }
    },
  );
  watch(
    () => fractal.colorMode,
    (mode) => {
      options.rendererRef.value?.setColorMode(mode);
      options.rendererRef.value?.resetAccumulation();
      options.urlState.syncURLState();
    },
  );
  watch(
    () => fractal.renderMode,
    (mode) => {
      options.rendererRef.value?.setRenderMode(mode);
      options.rendererRef.value?.resetAccumulation();
      options.urlState.syncURLState();
    },
  );
  watch([() => fractal.power, () => fractal.maxIterations, () => fractal.bailout], () => {
    options.rendererRef.value?.resetAccumulation();
    options.urlState.syncURLState();
  });

  // Handle game state transitions
  watch(
    () => appState.mode,
    (mode, oldMode) => {
      if (mode === 'playing') {
        // Reset camera for fresh starts (title/select/saves); resume from
        // pause keeps current pose. startFromURL suppresses reset when a
        // caller has already positioned the camera (URL deep-link, save load).
        if (oldMode !== 'paused' && !options.urlState.startFromURL.value) {
          options.scene.resetCamera();
        }
        options.urlState.startFromURL.value = false;
        options.adaptiveQuality.reset();
        applyCanvasResolution(1);
        options.previewLoop.stop();
        options.gameLoop.start();
        if (!options.isTouchActive.value) {
          options.pointerLock.requestLock();
        }
      } else {
        options.gameLoop.stop();
        if (mode === 'title' || mode === 'select') {
          applyCanvasResolution(PREVIEW_RESOLUTION_SCALE);
          options.previewLoop.start();
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          // mode is 'paused' | 'settings' | 'saves' by exhaustion.
          // Keep current resolution when pausing from gameplay.
          const fromGame = oldMode === 'playing' || oldMode === 'paused';
          if (!fromGame) {
            applyCanvasResolution(PREVIEW_RESOLUTION_SCALE);
          }
          options.previewLoop.start();
        }
      }
    },
  );

  onUnmounted(() => {
    options.gameLoop.stop();
    options.previewLoop.stop();
    options.rendererRef.value?.destroy();
  });

  return { gpuError, onCanvasReady, onResize, applyCanvasResolution };
}
