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
  | 'juliabulb';
export type ColorMode =
  | 'distance'
  | 'orbit_trap'
  | 'iteration'
  | 'ao'
  | 'normal'
  | 'curvature'
  | 'glow'
  | 'stripe';

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
  mandelbulb: {
    label: 'Mandelbulb',
    power: { label: 'Power', min: 2, max: 16, step: 0.1, default: 8 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
  mandelbox: {
    label: 'Mandelbox',
    power: { label: 'Scale', min: -3, max: 3, step: 0.1, default: -1.5 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 15 },
    bailout: { label: 'Bailout Radius', min: 1, max: 200, step: 1, default: 100 },
  },
  menger: {
    label: 'Menger Sponge',
    maxIterations: { label: 'Max Iterations', min: 1, max: 12, step: 1, default: 6 },
  },
  sierpinski: {
    label: 'Sierpinski Tetrahedron',
    maxIterations: { label: 'Max Iterations', min: 1, max: 16, step: 1, default: 10 },
  },
  quatjulia: {
    label: 'Quaternion Julia',
    power: { label: 'Seed', min: -5, max: 5, step: 0.1, default: -1.5 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 4 },
  },
  kleinian: {
    label: 'Pseudo-Kleinian',
    maxIterations: { label: 'Max Iterations', min: 1, max: 32, step: 1, default: 12 },
  },
  koch3d: {
    label: 'Koch Snowflake 3D',
    maxIterations: { label: 'Max Iterations', min: 1, max: 12, step: 1, default: 6 },
  },
  apollonian: {
    label: 'Apollonian Gasket',
    maxIterations: { label: 'Max Iterations', min: 1, max: 16, step: 1, default: 8 },
  },
  juliabulb: {
    label: 'Juliabulb',
    power: { label: 'Seed', min: -5, max: 5, step: 0.1, default: 1.0 },
    maxIterations: { label: 'Max Iterations', min: 4, max: 64, step: 1, default: 20 },
    bailout: { label: 'Bailout Radius', min: 1, max: 10, step: 0.1, default: 2 },
  },
};

const FRACTAL_TYPES: FractalType[] = [
  'mandelbulb',
  'mandelbox',
  'menger',
  'sierpinski',
  'quatjulia',
  'kleinian',
  'koch3d',
  'apollonian',
  'juliabulb',
];
const COLOR_MODES: ColorMode[] = [
  'distance',
  'orbit_trap',
  'iteration',
  'ao',
  'normal',
  'curvature',
  'glow',
  'stripe',
];

export const useFractalParams = defineStore('fractalParams', () => {
  const fractalType = ref<FractalType>('mandelbulb');
  const power = ref(8);
  const maxIterations = ref(20);
  const bailout = ref(2);
  const colorMode = ref<ColorMode>('distance');

  const config = computed(() => FRACTAL_CONFIGS[fractalType.value]);

  function reset(): void {
    setFractalType('mandelbulb');
    colorMode.value = 'distance';
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
    config,
    reset,
    cycleColorMode,
    cycleFractalType,
    setFractalType,
    adjustIterations,
  };
});
