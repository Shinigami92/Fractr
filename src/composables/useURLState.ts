/* oxlint-disable typescript/prefer-readonly-parameter-types -- UseSceneStateReturn wraps mutable camera/store handles */
import type { Ref } from 'vue';
import { ref } from 'vue';
import { useAppState } from '../stores/appState';
import { useFractalParams } from '../stores/fractalParams';
import { useGraphicsSettings } from '../stores/graphicsSettings';
import { buildShareURL, readStateFromURL } from '../utils/urlState';
import type { UseSceneStateReturn } from './useSceneState';

export interface UseURLStateOptions {
  scene: UseSceneStateReturn;
}

export interface UseURLStateReturn {
  previewMode: boolean;
  startFromURL: Ref<boolean>;
  buildCurrentShareURL: () => string;
  syncURLState: () => void;
}

/**
 * Reads fractal/camera state from the URL on boot (if present), applies it to
 * the stores + camera, and exposes helpers for live URL sync + share links.
 *
 * `startFromURL` is flipped by other code (e.g. save-load) to suppress the
 * camera-reset-on-startGame path when the caller has already positioned the
 * camera.
 */
export function useURLState(options: UseURLStateOptions): UseURLStateReturn {
  const { scene } = options;
  const appState = useAppState();
  const fractal = useFractalParams();
  const graphics = useGraphicsSettings();

  const startFromURL = ref(false);
  const initial = readStateFromURL();
  const previewMode = initial?.preview ?? false;

  if (initial) {
    fractal.fractalType = initial.fractalType;
    fractal.power = initial.power;
    fractal.maxIterations = initial.maxIterations;
    fractal.bailout = initial.bailout;
    fractal.colorMode = initial.colorMode;
    fractal.renderMode = initial.renderMode;
    graphics.dynamicIterations = initial.dynamicIterations;
    scene.camera.position[0] = initial.x;
    scene.camera.position[1] = initial.y;
    scene.camera.position[2] = initial.z;
    scene.camera.setFromEuler(initial.yaw, initial.pitch, initial.roll);
    startFromURL.value = true;
  } else {
    fractal.setFractalType('mandelbulb');
  }

  /** Build a share URL for the current live camera + fractal state. */
  function buildCurrentShareURL(): string {
    return buildShareURL({ ...scene.getCurrentState(), preview: false });
  }

  function syncURLState(): void {
    if (appState.mode !== 'playing') return;
    const url = buildCurrentShareURL();
    const params = url.split('?')[1] ?? '';
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  }

  return { previewMode, startFromURL, buildCurrentShareURL, syncURLState };
}
