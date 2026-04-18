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
import type { SceneState } from './useSceneState';
import type { URLStateController } from './useURLState';

export interface SavesBrowserHandle {
  setThumbnail(hash: string, blob: Blob): void;
  refreshThumbnails(): void;
}

export interface LoopHandle {
  start(): void;
  stop(): void;
}

export interface UseSaveActionsDeps {
  canvasRef: Ref<HTMLCanvasElement | null>;
  rendererRef: ShallowRef<Renderer | null>;
  savesBrowserRef: Ref<SavesBrowserHandle | null>;
  previewLoop: LoopHandle;
  scene: SceneState;
  urlState: URLStateController;
  notify: (text: string, duration?: number) => void;
}

/**
 * High-level user actions that persist / transfer fractal state: quick-save
 * of the current location, screenshot to clipboard or file, load a saved
 * state into the live scene, and bulk thumbnail regeneration.
 */
export function useSaveActions(deps: UseSaveActionsDeps) {
  const appState = useAppState();
  const graphics = useGraphicsSettings();

  async function quickSave(): Promise<void> {
    const state = deps.scene.getCurrentState();
    const canvas = deps.canvasRef.value;
    const thumbnail = canvas ? await captureCanvasThumbnail(canvas) : undefined;
    const saved = await saveState(state, thumbnail);
    deps.notify(saved ? 'Location saved' : 'Already saved');
  }

  async function takeScreenshot(): Promise<void> {
    const canvas = deps.canvasRef.value;
    if (!canvas) return;
    const blob = await captureCanvasPng(canvas);
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      deps.notify('Screenshot copied to clipboard');
    } catch {
      // Fallback: download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fractr-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      deps.notify('Screenshot saved as file');
    }
  }

  function loadSavedState(state: SavedState): void {
    deps.scene.applyState(state);
    // Suppress the camera reset that would otherwise fire on entering 'playing'
    deps.urlState.startFromURL.value = true;
    appState.startGame();
  }

  async function regenerateThumbnails(saves: SaveEntry[]): Promise<void> {
    const renderer = deps.rendererRef.value;
    const canvas = deps.canvasRef.value;
    if (!renderer || !canvas) return;

    // Stop preview loop so it doesn't overwrite our renders
    deps.previewLoop.stop();

    // Save current state to restore after
    const prevState = deps.scene.getCurrentState();
    const renderDeps = {
      renderer,
      camera: deps.scene.camera,
      canvas,
      maxRaySteps: graphics.maxRaySteps,
    };

    for (const save of saves) {
      // oxlint-disable-next-line no-await-in-loop -- renders share one renderer/canvas; captures must run serially
      const blob = await renderSavedStateToBlob(renderDeps, save.state);
      if (blob) {
        // oxlint-disable-next-line no-await-in-loop -- sequential so each thumbnail appears progressively in the browser
        await saveThumbnail(save.stateHash, blob);
        // Show thumbnail immediately in the browser
        deps.savesBrowserRef.value?.setThumbnail(save.stateHash, blob);
      }
      // Delay between captures
      // oxlint-disable-next-line no-await-in-loop -- inter-capture throttle, must be sequential
      await promiseTimeout(100);
    }

    // Restore previous state. The inner loop mutated `renderer` directly
    // without touching the store, so the store values here may equal
    // `prevState` already — in which case the lifecycle watchers won't
    // fire and the renderer would remain in the last save's mode. Force
    // the renderer back in sync explicitly.
    deps.scene.applyState(prevState);
    renderer.setFractalType(prevState.fractalType);
    renderer.setColorMode(prevState.colorMode);
    renderer.setRenderMode(prevState.renderMode);
    renderer.resetAccumulation();

    // Restart preview loop and refresh thumbnails in the browser
    deps.previewLoop.start();
    deps.savesBrowserRef.value?.refreshThumbnails();
  }

  return { quickSave, takeScreenshot, loadSavedState, regenerateThumbnails };
}
