import { acceptHMRUpdate, defineStore } from 'pinia';
import { computed, ref } from 'vue';

export interface ParamSliderConfig {
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface CameraStart {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface FractalConfig {
  label: string;
  short: string;
  power?: ParamSliderConfig;
  maxIterations: ParamSliderConfig;
  bailout?: ParamSliderConfig;
  camera?: CameraStart;
  defaultDynamicIterations?: boolean;
  /** Over-relaxation factor for ray marching (<1 adds safety margin for non-Lipschitz DEs). Default 1.0. */
  stepFactor?: number;
  /** Spatial period for coordinate re-centering (only for translation-invariant SDFs). Returns the period in world units; undefined disables re-centering. */
  periodOffset?: (power: number) => number;
  /** Ceiling for effective iterations in dynamic-iteration mode. Lets the slider max stay high for forced high-quality static renders (dyn off) while keeping navigation responsive. Defaults to maxIterations.max. */
  dynMaxIterations?: number;
}

// Single source of truth for fractals: adding an entry here is enough — the
// FractalType union and FRACTAL_TYPES list are derived from this object's keys.
// The `satisfies` clause validates shape; the public `FRACTAL_CONFIGS` is
// re-typed below as Record<FractalType, FractalConfig> so consumers can read
// optional fields (power, bailout, …) without narrowing per variant.
const _FRACTAL_CONFIGS = {
  // Organic bulbs
  mandelbulb: {
    label: 'Mandelbulb',
    short: 'Mandelbulb',
    power: { label: 'Power', min: 2, max: 16, step: 0.1, default: 8 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 200, step: 1, default: 40 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
    stepFactor: 0.6,
  },
  burningship: {
    label: 'Burning Ship 3D',
    short: 'Burn Ship',
    power: { label: 'Power', min: 2, max: 16, step: 0.1, default: 8 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 200, step: 1, default: 40 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
    stepFactor: 0.6,
  },
  tricorn: {
    label: 'Tricorn 3D',
    short: 'Tricorn',
    power: { label: 'Power', min: 2, max: 16, step: 0.1, default: 8 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 200, step: 1, default: 40 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
    stepFactor: 0.6,
  },
  xenodreambuie: {
    label: 'Xenodreambuie',
    short: 'Xeno',
    power: { label: 'Power', min: 2, max: 16, step: 0.1, default: 8 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 200, step: 1, default: 40 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
    stepFactor: 0.6,
  },
  juliabulb: {
    label: 'Juliabulb',
    short: 'Juliabulb',
    power: { label: 'Seed', min: -3, max: 3, step: 0.1, default: 2.0 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 200, step: 1, default: 40 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
    stepFactor: 0.6,
  },
  cospower2: {
    label: 'Cosine Power-2',
    short: 'Cos Pow-2',
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
    stepFactor: 0.5,
  },
  bristorbrot: {
    label: 'Bristorbrot',
    short: 'Bristorbrot',
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
    stepFactor: 0.3,
  },
  quatjulia: {
    label: 'Quaternion Julia',
    short: 'Quat Julia',
    power: { label: 'Seed', min: -3, max: 3, step: 0.1, default: -1.5 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 48, step: 1, default: 16 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 4 },
    stepFactor: 0.7,
  },
  // Architectural boxes
  mandelbox: {
    label: 'Mandelbox',
    short: 'Mandelbox',
    power: { label: 'Scale', min: -3, max: 3, step: 0.1, default: -1.5 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 100, step: 1, default: 48 },
    bailout: { label: 'Bailout Radius', min: 1, max: 200, step: 1, default: 100 },
    defaultDynamicIterations: false,
  },
  kaleidobox: {
    label: 'Kaleidoscopic Box',
    short: 'Kaleido',
    power: { label: 'Scale', min: -3, max: 3, step: 0.1, default: -1.5 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 100, step: 1, default: 72 },
    bailout: { label: 'Bailout Radius', min: 1, max: 200, step: 1, default: 100 },
    defaultDynamicIterations: false,
  },
  spudsville: {
    label: 'Spudsville',
    short: 'Spudsville',
    power: { label: 'Power', min: 2, max: 12, step: 0.1, default: 4 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 14 },
    bailout: { label: 'Bailout Radius', min: 1, max: 200, step: 1, default: 12 },
    camera: { x: 2.0, y: 1.5, z: 3.0, yaw: -2.35, pitch: -0.3 },
    stepFactor: 0.6,
  },
  // Geometric IFS
  menger: {
    label: 'Menger Sponge',
    short: 'Menger',
    maxIterations: { label: 'Max Iterations', min: 1, max: 20, step: 1, default: 12 },
  },
  sierpinski: {
    label: 'Sierpinski Tetrahedron',
    short: 'Sierpinski',
    maxIterations: { label: 'Max Iterations', min: 1, max: 24, step: 1, default: 10 },
    defaultDynamicIterations: false,
  },
  koch3d: {
    label: 'Koch Snowflake 3D',
    short: 'Koch 3D',
    maxIterations: { label: 'Max Iterations', min: 1, max: 16, step: 1, default: 12 },
  },
  octahedron: {
    label: 'Octahedron Fractal',
    short: 'Octahedron',
    maxIterations: { label: 'Max Iterations', min: 1, max: 16, step: 1, default: 8 },
  },
  cantordust: {
    label: 'Cantor Dust 3D',
    short: 'Cantor',
    maxIterations: { label: 'Max Iterations', min: 1, max: 10, step: 1, default: 4 },
  },
  apollonian: {
    label: 'Apollonian Gasket',
    short: 'Apollonian',
    maxIterations: { label: 'Max Iterations', min: 1, max: 16, step: 1, default: 7 },
    stepFactor: 0.5,
  },
  // Exotic
  kleinian: {
    label: 'Pseudo-Kleinian',
    short: 'Kleinian',
    maxIterations: { label: 'Max Iterations', min: 1, max: 100, step: 1, default: 64 },
    camera: { x: 0, y: 0, z: 5, yaw: -Math.PI / 2, pitch: 0 },
    stepFactor: 0.2,
    dynMaxIterations: 40,
  },
  gyroid: {
    label: 'Gyroid',
    short: 'Gyroid',
    power: { label: 'Scale', min: 1, max: 20, step: 0.1, default: 5 },
    camera: {
      x: 0.224,
      y: 0.064,
      z: 1.249,
      yaw: (-47.1 * Math.PI) / 180,
      pitch: (-32.7 * Math.PI) / 180,
    },
    maxIterations: { label: 'Detail Levels', min: 1, max: 24, step: 1, default: 16 },
    stepFactor: 0.2,
    periodOffset: (power) => (2 * Math.PI) / power,
  },
} satisfies Record<string, FractalConfig>;

export type FractalType = keyof typeof _FRACTAL_CONFIGS;
export const FRACTAL_CONFIGS: Record<FractalType, FractalConfig> = _FRACTAL_CONFIGS;
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.keys widens to `string[]`; keys are guaranteed to match FractalType by construction.
export const FRACTAL_TYPES = Object.keys(FRACTAL_CONFIGS) as FractalType[];

export interface ModeOption {
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

/** Returns the next value in a cyclic list (wraps at both ends). */
function nextInCycle<T>(list: ReadonlyArray<T>, current: T, reverse: boolean): T {
  const idx = list.indexOf(current);
  const delta = reverse ? list.length - 1 : 1;
  return list[(idx + delta) % list.length]!;
}

export const useFractalParams = defineStore('fractalParams', () => {
  const fractalType = ref<FractalType>('mandelbulb');
  const power = ref(8);
  const maxIterations = ref(20);
  const bailout = ref(2);
  const colorMode = ref<ColorMode>('glow');
  const renderMode = ref<RenderMode>('ray');

  const config = computed(() => FRACTAL_CONFIGS[fractalType.value]);

  function reset(): void {
    setFractalType('mandelbulb');
    colorMode.value = 'glow';
    renderMode.value = 'ray';
  }

  function cycleRenderMode(reverse = false): void {
    renderMode.value = nextInCycle(RENDER_MODES, renderMode.value, reverse);
  }

  function cycleColorMode(reverse = false): void {
    colorMode.value = nextInCycle(COLOR_MODES, colorMode.value, reverse);
  }

  function cycleFractalType(reverse = false): void {
    setFractalType(nextInCycle(FRACTAL_TYPES, fractalType.value, reverse));
  }

  function setFractalType(type: FractalType): void {
    fractalType.value = type;
    const cfg = FRACTAL_CONFIGS[type];
    power.value = cfg.power?.default ?? 0;
    maxIterations.value = cfg.maxIterations.default;
    bailout.value = cfg.bailout?.default ?? 0;
  }

  function adjustIterations(delta: number): void {
    const cfg = FRACTAL_CONFIGS[fractalType.value].maxIterations;
    maxIterations.value = Math.max(cfg.min, Math.min(cfg.max, maxIterations.value + delta));
  }

  function adjustBailout(delta: number): void {
    const cfg = FRACTAL_CONFIGS[fractalType.value].bailout;
    if (!cfg) return;
    bailout.value = Math.max(cfg.min, Math.min(cfg.max, bailout.value + delta));
  }

  return {
    fractalType,
    power,
    maxIterations,
    bailout,
    colorMode,
    renderMode,
    config,
    reset,
    cycleColorMode,
    cycleRenderMode,
    cycleFractalType,
    setFractalType,
    adjustIterations,
    adjustBailout,
  };
});

if (import.meta.hot) {
  const hmrHandler = acceptHMRUpdate(useFractalParams, import.meta.hot);
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Vite HMR mod type is not readonly
  import.meta.hot.accept((mod) => {
    hmrHandler(mod);
  });
}
