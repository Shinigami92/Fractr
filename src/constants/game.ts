// Shared game-loop and UI tuning constants. Kept here (rather than inline in
// App.vue or composables) so that tuning values have a single discoverable
// home and survive composable extraction.

/** Hold duration in milliseconds before a radial menu opens. */
export const RADIAL_MENU_HOLD_DELAY_MS = 200;

// Adaptive quality: resolution scale is quantized to SCALE_STEP buckets. It
// drops when FPS falls below target*DROP_THRESHOLD and rises when FPS exceeds
// target*RISE_THRESHOLD. The drop is reevaluated faster than the rise to
// react quickly to stutter without oscillating.

export const ADAPTIVE_QUALITY_SCALE_STEP = 0.05;
export const ADAPTIVE_QUALITY_MIN_SCALE = 0.3;

/** Seconds between drop-checks when FPS is below target. */
export const ADAPTIVE_QUALITY_DROP_INTERVAL_SEC = 0.2;
/** Seconds between rise-checks when FPS is above target. */
export const ADAPTIVE_QUALITY_RISE_INTERVAL_SEC = 0.8;

/** FPS ratio under which adaptive quality starts dropping. */
export const ADAPTIVE_QUALITY_DROP_THRESHOLD = 0.85;
/** FPS ratio above which adaptive quality starts rising. */
export const ADAPTIVE_QUALITY_RISE_THRESHOLD = 0.95;

/** FPS ratio under which drops become aggressive (multiplied). */
export const ADAPTIVE_QUALITY_CRITICAL_THRESHOLD = 0.5;
/** Multiplier applied to SCALE_STEP when FPS is critically low. */
export const ADAPTIVE_QUALITY_CRITICAL_DROP_MULTIPLIER = 3;

/** Extra penalty to max scale while the camera is moving (0..1). */
export const ADAPTIVE_QUALITY_MOVEMENT_PENALTY = 0.1;

// Dynamic iterations: when enabled, the iteration count ramps logarithmically
// between a minimum factor (near-surface, max detail would saturate anyway)
// and the full configured max as the camera moves further from the surface.

/** Distance floor fed to log10 to avoid -Infinity near the surface. */
export const DYN_ITER_DIST_FLOOR = 0.0001;
/** Divisor applied to -log10(dist); larger = slower ramp to max iterations. */
export const DYN_ITER_LOG_SCALE_DIVISOR = 4;
/** Minimum iteration count as a fraction of dynMax. */
export const DYN_ITER_MIN_FACTOR = 0.3;
/** Absolute lower bound on iterations regardless of ratio. */
export const DYN_ITER_MIN_ABSOLUTE = 4;

// Title/select-screen preview loop: renders at a reduced canvas resolution
// and with drastically capped iteration / ray-step counts so the idle preview
// doesn't pin the GPU before gameplay begins.

/** Canvas resolution scale applied outside of active gameplay. */
export const PREVIEW_RESOLUTION_SCALE = 0.25;
/** Max fractal iterations while the title preview is active. */
export const PREVIEW_MAX_ITERATIONS = 8;
/** Max ray-march steps while the title preview is active. */
export const PREVIEW_MAX_RAY_STEPS = 64;

/** MouseEvent.button for the "browser forward" side button. */
export const MOUSE_BUTTON_BROWSER_FORWARD = 4;
