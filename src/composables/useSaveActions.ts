/* oxlint-disable typescript/prefer-readonly-parameter-types -- Vue Refs and SaveEntry/Renderer instances have mutating internals */
import { promiseTimeout } from '@vueuse/core';
import type { Ref, ShallowRef } from 'vue';
import type { Renderer } from '../engine/Renderer';
import type { SavedState, SaveEntry } from '../services/savesDB';
import { saveState, saveThumbnail } from '../services/savesDB';
import {
  captureCanvasPng,
  captureCanvasThumbnail,
  renderSavedStateToBlob,
} from '../services/thumbnailGenerator';
import { useAppState } from '../stores/appState';
import { useGraphicsSettings } from '../stores/graphicsSettings';
import type { UseSceneStateReturn } from './useSceneState';
import type { UseURLStateReturn } from './useURLState';

export interface SavesBrowserHandle {
  setThumbnail(hash: string, blob: Blob): void;
  refreshThumbnails(): void;
}

export interface LoopHandle {
  start(): void;
  stop(): void;
}

export interface UseSaveActionsOptions {
  canvasRef: Ref<HTMLCanvasElement | null>;
  rendererRef: ShallowRef<Renderer | null>;
  savesBrowserRef: Ref<SavesBrowserHandle | null>;
  previewLoop: LoopHandle;
  scene: UseSceneStateReturn;
  urlState: UseURLStateReturn;
  notify: (text: string, duration?: number) => void;
}

export interface UseSaveActionsReturn {
  quickSave: () => Promise<void>;
  takeScreenshot: () => Promise<void>;
  loadSavedState: (state: SavedState) => void;
  regenerateThumbnails: (saves: SaveEntry[]) => Promise<void>;
}

async function quickSaveImpl(options: UseSaveActionsOptions): Promise<void> {
  const state = options.scene.getCurrentState();
  const canvas = options.canvasRef.value;
  const thumbnail = canvas ? await captureCanvasThumbnail(canvas) : undefined;
  const saved = await saveState(state, thumbnail);
  options.notify(saved ? 'Location saved' : 'Already saved');
}

async function takeScreenshotImpl(options: UseSaveActionsOptions): Promise<void> {
  const canvas = options.canvasRef.value;
  if (!canvas) return;
  const blob = await captureCanvasPng(canvas);
  if (!blob) return;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    options.notify('Screenshot copied to clipboard');
  } catch {
    // Fallback: download the file
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fractr-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    options.notify('Screenshot saved as file');
  }
}

async function regenerateThumbnailsImpl(
  options: UseSaveActionsOptions,
  maxRaySteps: number,
  saves: SaveEntry[],
): Promise<void> {
  const renderer = options.rendererRef.value;
  const canvas = options.canvasRef.value;
  if (!renderer || !canvas) return;

  // Stop preview loop so it doesn't overwrite our renders
  options.previewLoop.stop();

  // Save current state to restore after
  const prevState = options.scene.getCurrentState();
  const renderDeps = { renderer, camera: options.scene.camera, canvas, maxRaySteps };

  for (const save of saves) {
    // oxlint-disable-next-line no-await-in-loop -- renders share one renderer/canvas; captures must run serially
    const blob = await renderSavedStateToBlob(renderDeps, save.state);
    if (blob) {
      // oxlint-disable-next-line no-await-in-loop -- sequential so each thumbnail appears progressively in the browser
      await saveThumbnail(save.stateHash, blob);
      // Show thumbnail immediately in the browser
      options.savesBrowserRef.value?.setThumbnail(save.stateHash, blob);
    }
    // oxlint-disable-next-line no-await-in-loop -- inter-capture throttle, must be sequential
    await promiseTimeout(100);
  }

  // Restore previous state. The inner loop mutated `renderer` directly
  // without touching the store, so the store values here may equal
  // `prevState` already — in which case the lifecycle watchers won't
  // fire and the renderer would remain in the last save's mode. Force
  // the renderer back in sync explicitly.
  options.scene.applyState(prevState);
  renderer.setFractalType(prevState.fractalType);
  renderer.setColorMode(prevState.colorMode);
  renderer.setRenderMode(prevState.renderMode);
  renderer.resetAccumulation();

  options.previewLoop.start();
  options.savesBrowserRef.value?.refreshThumbnails();
}

/**
 * High-level user actions that persist / transfer fractal state: quick-save
 * of the current location, screenshot to clipboard or file, load a saved
 * state into the live scene, and bulk thumbnail regeneration.
 */
export function useSaveActions(options: UseSaveActionsOptions): UseSaveActionsReturn {
  const appState = useAppState();
  const graphics = useGraphicsSettings();

  return {
    quickSave: () => quickSaveImpl(options),
    takeScreenshot: () => takeScreenshotImpl(options),
    loadSavedState: (state: SavedState) => {
      options.scene.applyState(state);
      // Suppress the camera reset that would otherwise fire on entering 'playing'
      options.urlState.startFromURL.value = true;
      appState.startGame();
    },
    regenerateThumbnails: (saves: SaveEntry[]) =>
      regenerateThumbnailsImpl(options, graphics.maxRaySteps, saves),
  };
}
