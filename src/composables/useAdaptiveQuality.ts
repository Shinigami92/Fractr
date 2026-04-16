import {
  ADAPTIVE_QUALITY_CRITICAL_DROP_MULTIPLIER,
  ADAPTIVE_QUALITY_CRITICAL_THRESHOLD,
  ADAPTIVE_QUALITY_DROP_INTERVAL_SEC,
  ADAPTIVE_QUALITY_DROP_THRESHOLD,
  ADAPTIVE_QUALITY_MIN_SCALE,
  ADAPTIVE_QUALITY_MOVEMENT_PENALTY,
  ADAPTIVE_QUALITY_RISE_INTERVAL_SEC,
  ADAPTIVE_QUALITY_RISE_THRESHOLD,
  ADAPTIVE_QUALITY_SCALE_STEP,
} from '../constants/game';
import { useGraphicsSettings } from '../stores/graphicsSettings';

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
