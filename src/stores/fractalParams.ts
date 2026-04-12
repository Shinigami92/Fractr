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
  | 'dof'
  | 'ao_render'
  | 'sss'
  | 'cel'
  | 'wireframe'
  | 'duallighting'
  | 'fog'
  | 'multibounce'
  | 'radiosity'
  | 'bidir';
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
}

export const FRACTAL_CONFIGS: Record<FractalType, FractalConfig> = {
  // Organic bulbs
  mandelbulb: {
    label: 'Mandelbulb',
    short: 'Mandelbulb',
    power: { label: 'Power', min: 2, max: 16, step: 0.1, default: 8 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  burningship: {
    label: 'Burning Ship 3D',
    short: 'Burn Ship',
    power: { label: 'Power', min: 2, max: 16, step: 0.1, default: 8 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  tricorn: {
    label: 'Tricorn 3D',
    short: 'Tricorn',
    power: { label: 'Power', min: 2, max: 16, step: 0.1, default: 8 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  xenodreambuie: {
    label: 'Xenodreambuie',
    short: 'Xeno',
    power: { label: 'Power', min: 2, max: 16, step: 0.1, default: 8 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  juliabulb: {
    label: 'Juliabulb',
    short: 'Juliabulb',
    power: { label: 'Seed', min: -3, max: 3, step: 0.1, default: 2.0 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 48, step: 1, default: 16 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  cospower2: {
    label: 'Cosine Power-2',
    short: 'Cos Pow-2',
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  bristorbrot: {
    label: 'Bristorbrot',
    short: 'Bristorbrot',
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  quatjulia: {
    label: 'Quaternion Julia',
    short: 'Quat Julia',
    power: { label: 'Seed', min: -3, max: 3, step: 0.1, default: -1.5 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 48, step: 1, default: 16 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 4 },
  },
  // Architectural boxes
  mandelbox: {
    label: 'Mandelbox',
    short: 'Mandelbox',
    power: { label: 'Scale', min: -3, max: 3, step: 0.1, default: -1.5 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 15 },
    bailout: { label: 'Bailout Radius', min: 1, max: 200, step: 1, default: 100 },
    defaultDynamicIterations: false,
  },
  kaleidobox: {
    label: 'Kaleidoscopic Box',
    short: 'Kaleido',
    power: { label: 'Scale', min: -3, max: 3, step: 0.1, default: -1.5 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 15 },
    bailout: { label: 'Bailout Radius', min: 1, max: 200, step: 1, default: 100 },
    defaultDynamicIterations: false,
  },
  spudsville: {
    label: 'Spudsville',
    short: 'Spudsville',
    power: { label: 'Power', min: 2, max: 12, step: 0.1, default: 4 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 48, step: 1, default: 14 },
    bailout: { label: 'Bailout Radius', min: 1, max: 200, step: 1, default: 12 },
    camera: { x: 2.0, y: 1.5, z: 3.0, yaw: -2.35, pitch: -0.3 },
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
  },
  // Exotic
  kleinian: {
    label: 'Pseudo-Kleinian',
    short: 'Kleinian',
    maxIterations: { label: 'Max Iterations', min: 1, max: 20, step: 1, default: 10 },
    camera: { x: 0, y: 0, z: 5, yaw: -Math.PI / 2, pitch: 0 },
    defaultDynamicIterations: false,
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
    maxIterations: { label: 'Detail Levels', min: 0, max: 5, step: 1, default: 2 },
    defaultDynamicIterations: false,
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
  'duallighting',
  'ao_render',
  'cel',
  'wireframe',
  'sss',
  'cone',
  'pathtrace',
  'multibounce',
  'radiosity',
  'bidir',
  'dof',
  'fog',
  'volume',
];

export interface ModeOption {
  value: string;
  label: string;
  short: string;
}

export const COLOR_MODE_OPTIONS: ModeOption[] = [
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
];

export const RENDER_MODE_OPTIONS: ModeOption[] = [
  { value: 'ray', label: 'Ray Marching', short: 'Ray' },
  { value: 'softshadow', label: 'Soft Shadows', short: 'Shadows' },
  { value: 'reflection', label: 'Reflections', short: 'Reflect' },
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
