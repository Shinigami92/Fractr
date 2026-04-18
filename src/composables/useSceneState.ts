/* oxlint-disable typescript/prefer-readonly-parameter-types -- SavedState/FPSCamera instances have mutable internals */
import type { Ref } from 'vue';
import { ref } from 'vue';
import { FPSCamera } from '../engine/camera/FPSCamera';
import type { SavedState } from '../services/savesDB';
import { useFractalParams } from '../stores/fractalParams';
import { useGraphicsSettings } from '../stores/graphicsSettings';

export interface LiveSceneParamOverrides {
  maxIterations?: number;
  maxRaySteps?: number;
}

export interface LiveSceneParams {
  power: number;
  maxIterations: number;
  bailout: number;
  maxRaySteps: number;
  resolutionScale: number;
  animatedColors: boolean;
  stepFactor: number;
  originOffset: [number, number, number] | undefined;
}

export interface CameraPos {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
}

export interface UseSceneStateReturn {
  camera: FPSCamera;
  cameraPos: Ref<CameraPos>;
  syncCameraPos: () => void;
  resetCamera: () => void;
  getCurrentState: () => SavedState;
  applyState: (state: SavedState) => void;
  buildLiveSceneParams: (overrides?: LiveSceneParamOverrides) => LiveSceneParams;
}

/**
 * Owns the live `FPSCamera` instance and exposes helpers to snapshot / apply
 * scene state (fractal + graphics + camera) and to build the parameter bag
 * consumed by `renderer.updateUniforms`.
 */
export function useSceneState(): UseSceneStateReturn {
  const fractal = useFractalParams();
  const graphics = useGraphicsSettings();

  const camera = new FPSCamera(0, 0, 3);
  const cameraPos = ref({ x: 0, y: 0, z: 3, yaw: 0, pitch: 0, roll: 0 });

  function syncCameraPos(): void {
    cameraPos.value = {
      x: camera.position[0]!,
      y: camera.position[1]!,
      z: camera.position[2]!,
      yaw: camera.yaw,
      pitch: camera.pitch,
      roll: camera.roll,
    };
  }

  function resetCamera(): void {
    const cam = fractal.config.camera;
    camera.position[0] = cam?.x ?? 0;
    camera.position[1] = cam?.y ?? 0;
    camera.position[2] = cam?.z ?? 3;
    camera.yaw = cam?.yaw ?? -Math.PI / 2;
    camera.pitch = cam?.pitch ?? 0;
    camera.roll = 0;
  }

  function getCurrentState(): SavedState {
    return {
      fractalType: fractal.fractalType,
      power: fractal.power,
      maxIterations: fractal.maxIterations,
      bailout: fractal.bailout,
      colorMode: fractal.colorMode,
      renderMode: fractal.renderMode,
      dynamicIterations: graphics.dynamicIterations,
      x: camera.position[0]!,
      y: camera.position[1]!,
      z: camera.position[2]!,
      yaw: camera.yaw,
      pitch: camera.pitch,
      roll: camera.roll,
    };
  }

  /**
   * Apply a saved state to the live scene: fractal/graphics store fields
   * and camera pose. Renderer mode/accumulation sync is handled by the
   * watchers registered in `useRendererLifecycle` (when store values
   * actually change). Callers whose flow may leave store values unchanged
   * must restore renderer state explicitly.
   */
  function applyState(state: SavedState): void {
    fractal.fractalType = state.fractalType;
    fractal.power = state.power;
    fractal.maxIterations = state.maxIterations;
    fractal.bailout = state.bailout;
    fractal.colorMode = state.colorMode;
    fractal.renderMode = state.renderMode;
    graphics.dynamicIterations = state.dynamicIterations;
    camera.position[0] = state.x;
    camera.position[1] = state.y;
    camera.position[2] = state.z;
    camera.setFromEuler(state.yaw, state.pitch, state.roll);
  }

  // For periodic SDFs (declared via FractalConfig.periodOffset), snap the camera
  // position to a multiple of the SDF's period so the GPU sees small coordinates
  // with full f32 precision. Subtraction is done here in JS f64, so no
  // cancellation loss.
  function computeOriginOffset(): [number, number, number] | undefined {
    const periodFn = fractal.config.periodOffset;
    if (!periodFn) return undefined;
    const period = periodFn(fractal.power);
    return [
      Math.round(camera.position[0]! / period) * period,
      Math.round(camera.position[1]! / period) * period,
      Math.round(camera.position[2]! / period) * period,
    ];
  }

  /**
   * Assemble the parameter bag passed to `renderer.updateUniforms` for a live
   * scene (main gameplay loop + title-screen preview loop). Overrides let the
   * caller substitute the effective iteration count (dynamic iterations) or
   * cap cost for the low-quality title preview.
   */
  function buildLiveSceneParams(overrides?: LiveSceneParamOverrides): LiveSceneParams {
    return {
      power: fractal.power,
      maxIterations: overrides?.maxIterations ?? fractal.maxIterations,
      bailout: fractal.bailout,
      maxRaySteps: overrides?.maxRaySteps ?? graphics.maxRaySteps,
      resolutionScale: graphics.resolutionScale,
      animatedColors: graphics.animatedColors,
      stepFactor: fractal.config.stepFactor ?? 1,
      originOffset: computeOriginOffset(),
    };
  }

  return {
    camera,
    cameraPos,
    syncCameraPos,
    resetCamera,
    getCurrentState,
    applyState,
    buildLiveSceneParams,
  };
}
