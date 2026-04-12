import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type FractalType =
  | 'mandelbulb'
  | 'mandelbox'
  | 'menger'
  | 'sierpinski'
  | 'quatjulia'
  | 'kleinian'
  | 'koch3d'
  | 'apollonian'
  | 'juliabulb'
  | 'octahedron'
  | 'cantordust'
  | 'burningship'
  | 'tricorn'
  | 'cospower2'
  | 'kaleidobox'
  | 'spudsville'
  | 'bristorbrot'
  | 'xenodreambuie'
  | 'gyroid';
export type RenderMode =
  | 'ray'
  | 'cone'
  | 'pathtrace'
  | 'volume'
  | 'softshadow'
  | 'reflection'
  | 'dof';
export type ColorMode =
  | 'distance'
  | 'orbit_trap'
  | 'iteration'
  | 'ao'
  | 'normal'
  | 'curvature'
  | 'glow'
  | 'stripe'
  | 'fresnel'
  | 'depth'
  | 'triplanar'
  | 'temperature'
  | 'chromatic';

export interface ParamSliderConfig {
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface FractalConfig {
  label: string;
  power?: ParamSliderConfig;
  maxIterations: ParamSliderConfig;
  bailout?: ParamSliderConfig;
}

export const FRACTAL_CONFIGS: Record<FractalType, FractalConfig> = {
  // Organic bulbs
  mandelbulb: {
    label: 'Mandelbulb',
    power: { label: 'Power', min: 2, max: 16, step: 0.1, default: 8 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  burningship: {
    label: 'Burning Ship 3D',
    power: { label: 'Power', min: 2, max: 16, step: 0.1, default: 8 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  tricorn: {
    label: 'Tricorn 3D',
    power: { label: 'Power', min: 2, max: 16, step: 0.1, default: 8 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  xenodreambuie: {
    label: 'Xenodreambuie',
    power: { label: 'Power', min: 2, max: 16, step: 0.1, default: 8 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  juliabulb: {
    label: 'Juliabulb',
    power: { label: 'Seed', min: -3, max: 3, step: 0.1, default: 2.0 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 48, step: 1, default: 16 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  cospower2: {
    label: 'Cosine Power-2',
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  bristorbrot: {
    label: 'Bristorbrot',
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  quatjulia: {
    label: 'Quaternion Julia',
    power: { label: 'Seed', min: -3, max: 3, step: 0.1, default: -1.5 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 48, step: 1, default: 16 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 4 },
  },
  // Architectural boxes
  mandelbox: {
    label: 'Mandelbox',
    power: { label: 'Scale', min: -3, max: 3, step: 0.1, default: -1.5 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 15 },
    bailout: { label: 'Bailout Radius', min: 1, max: 200, step: 1, default: 100 },
  },
  kaleidobox: {
    label: 'Kaleidoscopic Box',
    power: { label: 'Scale', min: -3, max: 3, step: 0.1, default: -1.5 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 15 },
    bailout: { label: 'Bailout Radius', min: 1, max: 200, step: 1, default: 100 },
  },
  spudsville: {
    label: 'Spudsville',
    power: { label: 'Power', min: 2, max: 12, step: 0.1, default: 4 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 48, step: 1, default: 16 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 4 },
  },
  // Geometric IFS
  menger: {
    label: 'Menger Sponge',
    maxIterations: { label: 'Max Iterations', min: 1, max: 12, step: 1, default: 6 },
  },
  sierpinski: {
    label: 'Sierpinski Tetrahedron',
    maxIterations: { label: 'Max Iterations', min: 1, max: 16, step: 1, default: 8 },
  },
  koch3d: {
    label: 'Koch Snowflake 3D',
    maxIterations: { label: 'Max Iterations', min: 1, max: 12, step: 1, default: 5 },
  },
  octahedron: {
    label: 'Octahedron Fractal',
    maxIterations: { label: 'Max Iterations', min: 1, max: 16, step: 1, default: 8 },
  },
  cantordust: {
    label: 'Cantor Dust 3D',
    maxIterations: { label: 'Max Iterations', min: 1, max: 10, step: 1, default: 4 },
  },
  apollonian: {
    label: 'Apollonian Gasket',
    maxIterations: { label: 'Max Iterations', min: 1, max: 16, step: 1, default: 7 },
  },
  // Exotic
  kleinian: {
    label: 'Pseudo-Kleinian',
    maxIterations: { label: 'Max Iterations', min: 1, max: 20, step: 1, default: 10 },
  },
  gyroid: {
    label: 'Gyroid',
    power: { label: 'Scale', min: 1, max: 20, step: 0.1, default: 5 },
    maxIterations: { label: 'Detail Levels', min: 0, max: 5, step: 1, default: 2 },
  },
};

const FRACTAL_TYPES: FractalType[] = [
  // Organic bulbs
  'mandelbulb',
  'burningship',
  'tricorn',
  'xenodreambuie',
  'juliabulb',
  'cospower2',
  'bristorbrot',
  'quatjulia',
  // Architectural boxes
  'mandelbox',
  'kaleidobox',
  'spudsville',
  // Geometric IFS
  'menger',
  'sierpinski',
  'koch3d',
  'octahedron',
  'cantordust',
  'apollonian',
  // Exotic
  'kleinian',
  'gyroid',
];
const COLOR_MODES: ColorMode[] = [
  // Visually striking
  'glow',
  'distance',
  'chromatic',
  'temperature',
  'orbit_trap',
  'stripe',
  // Lighting-focused
  'ao',
  'fresnel',
  'curvature',
  'iteration',
  // Analytical
  'triplanar',
  'normal',
  'depth',
];

const RENDER_MODES: RenderMode[] = [
  'ray',
  'softshadow',
  'reflection',
  'cone',
  'pathtrace',
  'dof',
  'volume',
];

export const COLOR_MODE_OPTIONS: { value: ColorMode; label: string }[] = COLOR_MODES.map((m) => ({
  value: m,
  label: m.replace('_', ' '),
}));

export const RENDER_MODE_OPTIONS: { value: RenderMode; label: string }[] = [
  { value: 'ray', label: 'Ray Marching' },
  { value: 'softshadow', label: 'Soft Shadows' },
  { value: 'reflection', label: 'Reflections' },
  { value: 'cone', label: 'Cone Marching' },
  { value: 'pathtrace', label: 'Path Tracing' },
  { value: 'dof', label: 'Depth of Field' },
  { value: 'volume', label: 'Volume Rendering' },
];

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
    const idx = RENDER_MODES.indexOf(renderMode.value);
    const delta = reverse ? RENDER_MODES.length - 1 : 1;
    renderMode.value = RENDER_MODES[(idx + delta) % RENDER_MODES.length]!;
  }

  function cycleColorMode(reverse = false): void {
    const idx = COLOR_MODES.indexOf(colorMode.value);
    const delta = reverse ? COLOR_MODES.length - 1 : 1;
    colorMode.value = COLOR_MODES[(idx + delta) % COLOR_MODES.length]!;
  }

  function cycleFractalType(reverse = false): void {
    const idx = FRACTAL_TYPES.indexOf(fractalType.value);
    const delta = reverse ? FRACTAL_TYPES.length - 1 : 1;
    const next = FRACTAL_TYPES[(idx + delta) % FRACTAL_TYPES.length]!;
    setFractalType(next);
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
  };
});
