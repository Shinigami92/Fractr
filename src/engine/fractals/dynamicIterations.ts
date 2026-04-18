// Dynamic iterations: when enabled, the iteration count ramps logarithmically
// between a minimum factor (near-surface, max detail would saturate anyway)
// and the full configured max as the camera moves further from the surface.

/** Distance floor fed to log10 to avoid -Infinity near the surface. */
const DYN_ITER_DIST_FLOOR = 0.0001;
/** Divisor applied to -log10(dist); larger = slower ramp to max iterations. */
const DYN_ITER_LOG_SCALE_DIVISOR = 4;
/** Minimum iteration count as a fraction of dynMax. */
const DYN_ITER_MIN_FACTOR = 0.3;
/** Absolute lower bound on iterations regardless of ratio. */
const DYN_ITER_MIN_ABSOLUTE = 4;

export function computeEffectiveIterations(
  dynamicIterations: boolean,
  maxIterations: number,
  dynMaxIterations: number | undefined,
  absDist: number,
): number {
  if (!dynamicIterations) return maxIterations;
  const dynMax = Math.min(maxIterations, dynMaxIterations ?? maxIterations);
  const iterScale = Math.max(
    0,
    Math.min(1, -Math.log10(Math.max(absDist, DYN_ITER_DIST_FLOOR)) / DYN_ITER_LOG_SCALE_DIVISOR),
  );
  const minIter = Math.max(DYN_ITER_MIN_ABSOLUTE, Math.ceil(dynMax * DYN_ITER_MIN_FACTOR));
  return Math.ceil(minIter + (dynMax - minIter) * iterScale);
}
