interface ModeOption {
  value: string;
  label: string;
  short: string;
}

// Single source of truth for color modes (order = UI cycle order).
// ColorMode union and COLOR_MODES list are derived below.
export const COLOR_MODE_OPTIONS = [
  { value: 'glow', label: 'Glow', short: 'Glow' },
  { value: 'distance', label: 'Distance Estimation', short: 'Distance' },
  { value: 'chromatic', label: 'Chromatic', short: 'Chromatic' },
  { value: 'temperature', label: 'Temperature', short: 'Temp' },
  { value: 'orbit_trap', label: 'Orbit Trap', short: 'Orbit Trap' },
  { value: 'stripe', label: 'Stripe', short: 'Stripe' },
  { value: 'ao', label: 'Ambient Occlusion', short: 'AO' },
  { value: 'fresnel', label: 'Fresnel', short: 'Fresnel' },
  { value: 'curvature', label: 'Curvature', short: 'Curvature' },
  { value: 'iteration', label: 'Iteration Gradient', short: 'Iteration' },
  { value: 'triplanar', label: 'Triplanar', short: 'Triplanar' },
  { value: 'normal', label: 'Normal', short: 'Normal' },
  { value: 'depth', label: 'Depth', short: 'Depth' },
] as const satisfies ReadonlyArray<ModeOption>;

export type ColorMode = (typeof COLOR_MODE_OPTIONS)[number]['value'];
export const COLOR_MODES: ColorMode[] = COLOR_MODE_OPTIONS.map((o) => o.value);
