import type { Ref, ShallowRef } from 'vue';
import { onUnmounted, ref, watch } from 'vue';
import { PREVIEW_RESOLUTION_SCALE } from '../constants/game';
import { WebGPUContext } from '../engine/gpu/WebGPUContext';
import { Renderer } from '../engine/Renderer';
import { useAppState } from '../stores/appState';
import { useFractalParams } from '../stores/fractalParams';
import { useGraphicsSettings } from '../stores/graphicsSettings';
import type { useAdaptiveQuality } from './useAdaptiveQuality';
import type { useGameLoop } from './useGameLoop';
import type { usePointerLock } from './usePointerLock';
import type { SceneState } from './useSceneState';
import type { URLStateController } from './useURLState';

type LoopHandle = ReturnType<typeof useGameLoop>;

export interface UseRendererLifecycleDeps {
  canvasRef: Ref<HTMLCanvasElement | null>;
  rendererRef: ShallowRef<Renderer | null>;
  startTime: Ref<number>;
  scene: SceneState;
  urlState: URLStateController;
  gameLoop: LoopHandle;
  previewLoop: LoopHandle;
  adaptiveQuality: ReturnType<typeof useAdaptiveQuality>;
  pointerLock: ReturnType<typeof usePointerLock>;
  isTouchActive: Ref<boolean>;
}

/**
 * Owns renderer construction, canvas sizing, and the watchers that sync
 * fractal/color/render-mode changes into the renderer and start/stop the
 * correct loop on app-mode transitions.
 */
export function useRendererLifecycle(deps: UseRendererLifecycleDeps) {
  const appState = useAppState();
  const fractal = useFractalParams();
  const graphics = useGraphicsSettings();

  const gpuError = ref<string | null>(null);
  let displayWidth = 1;
  let displayHeight = 1;

  function applyCanvasResolution(scale: number): void {
    const canvas = deps.canvasRef.value;
    if (!canvas) return;
    const w = Math.floor(displayWidth * scale);
    const h = Math.floor(displayHeight * scale);
    canvas.width = w;
    canvas.height = h;
    deps.rendererRef.value?.resize(w, h);
  }

  async function onCanvasReady(canvas: HTMLCanvasElement): Promise<void> {
    deps.canvasRef.value = canvas;

    try {
      const ctx = await WebGPUContext.create(canvas);
      const renderer = new Renderer(ctx);
      renderer.resize(canvas.width, canvas.height);
      renderer.setFractalType(fractal.fractalType);
      renderer.setColorMode(fractal.colorMode);
      renderer.setRenderMode(fractal.renderMode);
      deps.rendererRef.value = renderer;
      deps.startTime.value = performance.now();

      if (deps.urlState.previewMode) {
        // Screenshot mode: render continuously at full quality, no UI
        deps.previewLoop.start();
      } else if (deps.urlState.startFromURL.value) {
        // Jump directly into 3D view from shared URL
        appState.startGame();
      } else {
        deps.previewLoop.start();
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
      deps.rendererRef.value?.setFractalType(type);
      if (!deps.urlState.startFromURL.value) {
        deps.scene.resetCamera();
        graphics.dynamicIterations = fractal.config.defaultDynamicIterations !== false;
      }
    },
  );
  watch(
    () => fractal.colorMode,
    (mode) => {
      deps.rendererRef.value?.setColorMode(mode);
      deps.rendererRef.value?.resetAccumulation();
      deps.urlState.syncURLState();
    },
  );
  watch(
    () => fractal.renderMode,
    (mode) => {
      deps.rendererRef.value?.setRenderMode(mode);
      deps.rendererRef.value?.resetAccumulation();
      deps.urlState.syncURLState();
    },
  );
  watch([() => fractal.power, () => fractal.maxIterations, () => fractal.bailout], () => {
    deps.rendererRef.value?.resetAccumulation();
    deps.urlState.syncURLState();
  });

  // Handle game state transitions
  watch(
    () => appState.mode,
    (mode, oldMode) => {
      if (mode === 'playing') {
        // Reset camera for fresh starts (title/select/saves); resume from
        // pause keeps current pose. startFromURL suppresses reset when a
        // caller has already positioned the camera (URL deep-link, save load).
        if (oldMode !== 'paused' && !deps.urlState.startFromURL.value) {
          deps.scene.resetCamera();
        }
        deps.urlState.startFromURL.value = false;
        deps.adaptiveQuality.reset();
        applyCanvasResolution(1);
        deps.previewLoop.stop();
        deps.gameLoop.start();
        if (!deps.isTouchActive.value) {
          deps.pointerLock.requestLock();
        }
      } else {
        deps.gameLoop.stop();
        if (mode === 'title' || mode === 'select') {
          applyCanvasResolution(PREVIEW_RESOLUTION_SCALE);
          deps.previewLoop.start();
          window.history.replaceState({}, '', window.location.pathname);
        } else if (mode === 'paused' || mode === 'settings' || mode === 'saves') {
          // Keep current resolution when pausing from gameplay
          const fromGame = oldMode === 'playing' || oldMode === 'paused';
          if (!fromGame) {
            applyCanvasResolution(PREVIEW_RESOLUTION_SCALE);
          }
          deps.previewLoop.start();
        }
      }
    },
  );

  onUnmounted(() => {
    deps.gameLoop.stop();
    deps.previewLoop.stop();
    deps.rendererRef.value?.destroy();
  });

  return { gpuError, onCanvasReady, onResize, applyCanvasResolution };
}
