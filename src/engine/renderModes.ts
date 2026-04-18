interface ModeOption {
  value: string;
  label: string;
  short: string;
}

// Single source of truth for render modes (order = UI cycle order).
// RenderMode union and RENDER_MODES list are derived below.
export const RENDER_MODE_OPTIONS = [
  { value: 'ray', label: 'Ray Marching', short: 'Ray' },
  { value: 'softshadow', label: 'Soft Shadows', short: 'Shadows' },
  { value: 'reflection', label: 'Reflections', short: 'Reflect' },
  { value: 'whitted', label: 'Whitted Ray Trace', short: 'Whitted' },
  { value: 'duallighting', label: 'Dual Lighting', short: 'Dual Light' },
  { value: 'ao_render', label: 'Ambient Occlusion', short: 'AO' },
  { value: 'cel', label: 'Cel Shading', short: 'Cel' },
  { value: 'wireframe', label: 'Wireframe / Edges', short: 'Wireframe' },
  { value: 'sss', label: 'Subsurface Scattering', short: 'SSS' },
  { value: 'cone', label: 'Cone Marching', short: 'Cone' },
  { value: 'pathtrace', label: 'Path Tracing (1 bounce)', short: 'Path Trace' },
  { value: 'multibounce', label: 'Multi-bounce GI (3 bounces)', short: 'Multi-GI' },
  { value: 'radiosity', label: 'Radiosity', short: 'Radiosity' },
  { value: 'bidir', label: 'Bidirectional Path Trace', short: 'Bidir' },
  { value: 'dof', label: 'Depth of Field', short: 'DoF' },
  { value: 'fog', label: 'Volumetric Fog', short: 'Fog' },
  { value: 'volume', label: 'Volume Rendering', short: 'Volume' },
] as const satisfies ReadonlyArray<ModeOption>;

export type RenderMode = (typeof RENDER_MODE_OPTIONS)[number]['value'];
export const RENDER_MODES: RenderMode[] = RENDER_MODE_OPTIONS.map((o) => o.value);
