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
