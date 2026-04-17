import type { ShallowRef } from 'vue';
import type { Renderer } from '../engine/Renderer';
import { useAppState } from '../stores/appState';
import { useGameLoop } from './useGameLoop';
import type { SceneState } from './useSceneState';

// Title/select-screen preview loop: renders at a reduced canvas resolution
// and with drastically capped iteration / ray-step counts so the idle preview
// doesn't pin the GPU before gameplay begins.

/** Max fractal iterations while the title preview is active. */
const PREVIEW_MAX_ITERATIONS = 8;
/** Max ray-march steps while the title preview is active. */
const PREVIEW_MAX_RAY_STEPS = 64;

export interface UsePreviewLoopDeps {
  rendererRef: ShallowRef<Renderer | null>;
  scene: SceneState;
  previewMode: boolean;
  getTimeSeconds: () => number;
}

/**
 * Title / menu preview loop: auto-orbits the camera around the origin when
 * the app is on the title or fractal-select screen, and renders at reduced
 * cost. Freezes the camera (but keeps rendering) when paused or in settings.
 *
 * `previewMode` (shared-URL screenshot mode) keeps the camera at the exact
 * URL-supplied pose and renders continuously at full quality with no UI.
 */
export function usePreviewLoop(deps: UsePreviewLoopDeps) {
  const appState = useAppState();

  const previewLoop = useGameLoop({
    update() {
      // Only auto-orbit on title/select screen (and settings opened from title)
      // In preview mode, camera stays fixed at URL position
      const shouldOrbit =
        !deps.previewMode &&
        (appState.mode === 'title' ||
          appState.mode === 'select' ||
          (appState.mode === 'settings' && appState.settingsSource === 'title'));

      const { camera } = deps.scene;
      if (shouldOrbit) {
        const t = performance.now() / 5000;
        camera.position[0] = Math.cos(t) * 3;
        camera.position[1] = Math.sin(t * 0.3) * 0.5;
        camera.position[2] = Math.sin(t) * 3;
        camera.yaw = t + Math.PI;
        camera.pitch = -Math.sin(t * 0.3) * 0.15;
      }
      // Paused / settings-from-pause: keep current camera position (frozen frame)

      // Use low quality only on title screen, not in settings or preview mode
      const lowQuality = appState.mode === 'title' && !deps.previewMode;
      deps.rendererRef.value?.updateUniforms(
        camera,
        deps.scene.buildLiveSceneParams(
          lowQuality
            ? { maxIterations: PREVIEW_MAX_ITERATIONS, maxRaySteps: PREVIEW_MAX_RAY_STEPS }
            : undefined,
        ),
        deps.getTimeSeconds(),
      );
    },
    render() {
      deps.rendererRef.value?.render();
    },
  });

  return { previewLoop };
}
