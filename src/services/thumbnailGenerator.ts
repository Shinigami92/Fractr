/* oxlint-disable typescript/prefer-readonly-parameter-types -- HTMLCanvasElement/Renderer/FPSCamera/ThumbnailRenderDeps wrap mutable DOM/class handles */
import { promiseTimeout } from '@vueuse/core';
import type { FPSCamera } from '../engine/camera/FPSCamera';
import type { Renderer } from '../engine/Renderer';
import { FRACTAL_CONFIGS } from '../stores/fractalParams';
import type { SavedState } from './savesDB';

/** Default MIME type for stored save thumbnails. */
const THUMBNAIL_MIME = 'image/webp';
/** WebP quality for stored thumbnails. Small tradeoff vs. IndexedDB blob size. */
const THUMBNAIL_QUALITY = 0.7;
/** Minimum frame-accumulation budget in milliseconds. */
const MIN_RENDER_MS = 300;
/** Per-iteration frame-accumulation budget. */
const RENDER_MS_PER_ITERATION = 30;
/** Extra post-render delay to let the GPU flush before toBlob reads the canvas. */
const GPU_SETTLE_MS = 300;

export interface ThumbnailRenderDeps {
  readonly renderer: Renderer;
  readonly camera: FPSCamera;
  readonly canvas: HTMLCanvasElement;
  readonly maxRaySteps: number;
}

/** Capture the current canvas contents as a compressed WebP blob. */
export function captureCanvasThumbnail(canvas: HTMLCanvasElement): Promise<Blob | undefined> {
  return new Promise<Blob | undefined>((resolve) => {
    canvas.toBlob(
      (b) => {
        resolve(b ?? undefined);
      },
      THUMBNAIL_MIME,
      THUMBNAIL_QUALITY,
    );
  });
}

/** Capture the current canvas contents as a lossless PNG blob. */
export function captureCanvasPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => {
      resolve(b);
    }, 'image/png');
  });
}

function computeOriginOffsetForState(
  state: SavedState,
  periodFn: ((power: number) => number) | undefined,
): [number, number, number] | undefined {
  if (!periodFn) return undefined;
  const period = periodFn(state.power);
  return [
    Math.round(state.x / period) * period,
    Math.round(state.y / period) * period,
    Math.round(state.z / period) * period,
  ];
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

/**
 * Render `state` at full quality and capture the resulting canvas contents
 * as a WebP blob. Mutates renderer + camera to the saved pose and leaves
 * them there — the caller is responsible for restoring prior state.
 */
export async function renderSavedStateToBlob(
  deps: ThumbnailRenderDeps,
  state: SavedState,
): Promise<Blob | undefined> {
  const { renderer, camera, canvas, maxRaySteps } = deps;

  renderer.setFractalType(state.fractalType);
  renderer.setColorMode(state.colorMode);
  renderer.setRenderMode(state.renderMode);
  camera.position[0] = state.x;
  camera.position[1] = state.y;
  camera.position[2] = state.z;
  camera.setFromEuler(state.yaw, state.pitch, state.roll);

  const cfg = FRACTAL_CONFIGS[state.fractalType];
  const params = {
    power: state.power,
    maxIterations: state.maxIterations,
    bailout: state.bailout,
    maxRaySteps,
    resolutionScale: 1,
    animatedColors: false,
    stepFactor: cfg.stepFactor ?? 1,
    originOffset: computeOriginOffsetForState(state, cfg.periodOffset),
  };

  renderer.updateUniforms(camera, params, 0);
  renderer.resetAccumulation();

  // Time-based rendering: keep rendering until enough samples accumulate
  const renderTimeMs = Math.max(MIN_RENDER_MS, state.maxIterations * RENDER_MS_PER_ITERATION);
  const startMs = performance.now();
  while (performance.now() - startMs < renderTimeMs) {
    renderer.updateUniforms(camera, params, 0);
    renderer.render(false);
    // oxlint-disable-next-line no-await-in-loop -- frame pacing is inherently serial; must wait one rAF between renders for GPU accumulation
    await waitForAnimationFrame();
  }

  // Extra settle for GPU flush before toBlob reads the canvas
  await promiseTimeout(GPU_SETTLE_MS);

  return captureCanvasThumbnail(canvas);
}
