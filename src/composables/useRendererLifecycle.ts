/* oxlint-disable typescript/prefer-readonly-parameter-types -- Vue Refs and HTMLCanvasElement have mutating internals */
import type { Ref, ShallowRef } from 'vue';
import { onUnmounted, ref, watch } from 'vue';
import { WebGPUContext } from '../engine/gpu/WebGPUContext';
import { Renderer } from '../engine/Renderer';
import type { AppStateStore } from '../stores/appState';
import { useAppState } from '../stores/appState';
import type { FractalParamsStore } from '../stores/fractalParams';
import { useFractalParams } from '../stores/fractalParams';
import type { GraphicsSettingsStore } from '../stores/graphicsSettings';
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

async function bootstrapRenderer(
  options: UseRendererLifecycleOptions,
  appState: AppStateStore,
  fractal: FractalParamsStore,
  canvas: HTMLCanvasElement,
): Promise<void> {
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
}

function registerStoreWatchers(
  options: UseRendererLifecycleOptions,
  fractal: FractalParamsStore,
  graphics: GraphicsSettingsStore,
): void {
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
}

function onEnterPlaying(
  options: UseRendererLifecycleOptions,
  oldMode: string | undefined,
  applyCanvasResolution: (scale: number) => void,
): void {
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
}

function onExitPlaying(
  options: UseRendererLifecycleOptions,
  mode: string,
  oldMode: string | undefined,
  applyCanvasResolution: (scale: number) => void,
): void {
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

/**
 * Owns renderer construction, canvas sizing, and the watchers that sync
 * fractal/color/render-mode changes into the renderer and start/stop the
 * correct loop on app-mode transitions.
 */
/* oxlint-disable-next-line eslint/max-lines-per-function -- orchestrator: small closures over displayW/H plus watcher registration; splitting hurts cohesion */
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
      await bootstrapRenderer(options, appState, fractal, canvas);
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

  registerStoreWatchers(options, fractal, graphics);

  watch(
    () => appState.mode,
    (mode, oldMode) => {
      if (mode === 'playing') onEnterPlaying(options, oldMode, applyCanvasResolution);
      else onExitPlaying(options, mode, oldMode, applyCanvasResolution);
    },
  );

  onUnmounted(() => {
    options.gameLoop.stop();
    options.previewLoop.stop();
    options.rendererRef.value?.destroy();
  });

  return { gpuError, onCanvasReady, onResize, applyCanvasResolution };
}
