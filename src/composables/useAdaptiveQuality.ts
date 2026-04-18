import { useGraphicsSettings } from '../stores/graphicsSettings';

// Adaptive quality: resolution scale is quantized to SCALE_STEP buckets. It
// drops when FPS falls below target*DROP_THRESHOLD and rises when FPS exceeds
// target*RISE_THRESHOLD. The drop is reevaluated faster than the rise to
// react quickly to stutter without oscillating.

const ADAPTIVE_QUALITY_SCALE_STEP = 0.05;
const ADAPTIVE_QUALITY_MIN_SCALE = 0.3;

/** Seconds between drop-checks when FPS is below target. */
const ADAPTIVE_QUALITY_DROP_INTERVAL_SEC = 0.2;
/** Seconds between rise-checks when FPS is above target. */
const ADAPTIVE_QUALITY_RISE_INTERVAL_SEC = 0.8;

/** FPS ratio under which adaptive quality starts dropping. */
const ADAPTIVE_QUALITY_DROP_THRESHOLD = 0.85;
/** FPS ratio above which adaptive quality starts rising. */
const ADAPTIVE_QUALITY_RISE_THRESHOLD = 0.95;

/** FPS ratio under which drops become aggressive (multiplied). */
const ADAPTIVE_QUALITY_CRITICAL_THRESHOLD = 0.5;
/** Multiplier applied to SCALE_STEP when FPS is critically low. */
const ADAPTIVE_QUALITY_CRITICAL_DROP_MULTIPLIER = 3;

/** Extra penalty to max scale while the camera is moving (0..1). */
const ADAPTIVE_QUALITY_MOVEMENT_PENALTY = 0.1;

export interface UseAdaptiveQualityOptions {
  /** Called with the quantized scale whenever it actually changes. */
  readonly onScaleChange: (scale: number) => void;
}

export interface UseAdaptiveQualityReturn {
  update: (dt: number, currentFps: number, moving: boolean) => void;
  reset: () => void;
}

function computeNextScale(
  current: number,
  target: number,
  currentFps: number,
  moving: boolean,
): number {
  const belowTarget = currentFps < target * ADAPTIVE_QUALITY_DROP_THRESHOLD;
  const maxScale = 1.0 - (moving ? ADAPTIVE_QUALITY_MOVEMENT_PENALTY : 0);

  if (belowTarget && current > ADAPTIVE_QUALITY_MIN_SCALE) {
    const urgency =
      currentFps < target * ADAPTIVE_QUALITY_CRITICAL_THRESHOLD
        ? ADAPTIVE_QUALITY_CRITICAL_DROP_MULTIPLIER
        : 1;
    return Math.max(ADAPTIVE_QUALITY_MIN_SCALE, current - ADAPTIVE_QUALITY_SCALE_STEP * urgency);
  }
  if (currentFps > target * ADAPTIVE_QUALITY_RISE_THRESHOLD && current < maxScale) {
    return Math.min(maxScale, current + ADAPTIVE_QUALITY_SCALE_STEP);
  }
  return current;
}

function quantizeScale(scale: number): number {
  return Math.round(scale / ADAPTIVE_QUALITY_SCALE_STEP) * ADAPTIVE_QUALITY_SCALE_STEP;
}

/**
 * Tracks render-resolution scale based on frame rate and camera motion.
 *
 * The scale quantizes to ADAPTIVE_QUALITY_SCALE_STEP buckets, drops when FPS
 * falls below target*DROP_THRESHOLD (reevaluated every DROP_INTERVAL seconds)
 * and rises when FPS is above target*RISE_THRESHOLD (every RISE_INTERVAL).
 * When the camera is moving, the max scale is reduced by MOVEMENT_PENALTY to
 * avoid fighting motion-induced cost spikes.
 */
export function useAdaptiveQuality(options: UseAdaptiveQualityOptions): UseAdaptiveQualityReturn {
  const graphics = useGraphicsSettings();

  let adaptiveScale = 1.0;
  let appliedScale = 1.0;
  let adaptTimer = 0;

  function update(dt: number, currentFps: number, moving: boolean): void {
    if (!graphics.adaptiveQuality) return;
    adaptTimer += dt;
    const belowTarget = currentFps < graphics.targetFps * ADAPTIVE_QUALITY_DROP_THRESHOLD;
    const interval = belowTarget
      ? ADAPTIVE_QUALITY_DROP_INTERVAL_SEC
      : ADAPTIVE_QUALITY_RISE_INTERVAL_SEC;
    if (adaptTimer < interval) return;
    adaptTimer = 0;
    adaptiveScale = computeNextScale(adaptiveScale, graphics.targetFps, currentFps, moving);
    const quantized = quantizeScale(adaptiveScale);
    if (Math.abs(quantized - appliedScale) >= ADAPTIVE_QUALITY_SCALE_STEP) {
      appliedScale = quantized;
      options.onScaleChange(quantized);
    }
  }

  /** Reset internal state back to full quality (e.g. when entering play mode). */
  function reset(): void {
    adaptiveScale = 1.0;
    appliedScale = 1.0;
    adaptTimer = 0;
  }

  return { update, reset };
}
