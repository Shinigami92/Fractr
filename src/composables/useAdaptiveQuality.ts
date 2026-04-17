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
  onScaleChange: (scale: number) => void;
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
export function useAdaptiveQuality(options: UseAdaptiveQualityOptions) {
  const graphics = useGraphicsSettings();

  let adaptiveScale = 1.0;
  let appliedScale = 1.0;
  let adaptTimer = 0;

  function update(dt: number, currentFps: number, moving: boolean): void {
    if (!graphics.adaptiveQuality) return;

    adaptTimer += dt;

    const target = graphics.targetFps;
    const belowTarget = currentFps < target * ADAPTIVE_QUALITY_DROP_THRESHOLD;
    const interval = belowTarget
      ? ADAPTIVE_QUALITY_DROP_INTERVAL_SEC
      : ADAPTIVE_QUALITY_RISE_INTERVAL_SEC;

    if (adaptTimer < interval) return;
    adaptTimer = 0;

    // Movement penalty: reduce target scale while moving for smoother experience
    const movementPenalty = moving ? ADAPTIVE_QUALITY_MOVEMENT_PENALTY : 0;
    const maxScale = 1.0 - movementPenalty;

    if (belowTarget && adaptiveScale > ADAPTIVE_QUALITY_MIN_SCALE) {
      // Drop faster when far below target
      const urgency =
        currentFps < target * ADAPTIVE_QUALITY_CRITICAL_THRESHOLD
          ? ADAPTIVE_QUALITY_CRITICAL_DROP_MULTIPLIER
          : 1;
      adaptiveScale = Math.max(
        ADAPTIVE_QUALITY_MIN_SCALE,
        adaptiveScale - ADAPTIVE_QUALITY_SCALE_STEP * urgency,
      );
    } else if (currentFps > target * ADAPTIVE_QUALITY_RISE_THRESHOLD && adaptiveScale < maxScale) {
      adaptiveScale = Math.min(maxScale, adaptiveScale + ADAPTIVE_QUALITY_SCALE_STEP);
    }

    // Only resize when quantized scale actually changed
    const quantized =
      Math.round(adaptiveScale / ADAPTIVE_QUALITY_SCALE_STEP) * ADAPTIVE_QUALITY_SCALE_STEP;
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
