import type { ColorMode, FractalType } from '../stores/fractalParams';

export interface SharedState {
  fractalType: FractalType;
  power: number;
  maxIterations: number;
  bailout: number;
  colorMode: ColorMode;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

const FRACTAL_TYPES = new Set([
  'mandelbulb',
  'mandelbox',
  'menger',
  'sierpinski',
  'quatjulia',
  'kleinian',
  'koch3d',
  'apollonian',
  'juliabulb',
]);
const COLOR_MODES = new Set([
  'distance',
  'orbit_trap',
  'iteration',
  'ao',
  'normal',
  'curvature',
  'glow',
  'stripe',
]);

export function readStateFromURL(): SharedState | null {
  const params = new URLSearchParams(window.location.search);
  const f = params.get('f');
  if (!f || !FRACTAL_TYPES.has(f)) return null;

  const get = (key: string, fallback: number) => {
    const v = params.get(key);
    if (v === null) return fallback;
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const color = params.get('c') ?? 'distance';

  return {
    fractalType: f as FractalType,
    power: get('p', 8),
    maxIterations: get('i', 20),
    bailout: get('b', 2),
    colorMode: COLOR_MODES.has(color) ? (color as ColorMode) : 'distance',
    x: get('x', 0),
    y: get('y', 0),
    z: get('z', 3),
    yaw: get('yaw', -Math.PI / 2),
    pitch: get('pitch', 0),
  };
}

export function buildShareURL(state: SharedState): string {
  const params = new URLSearchParams();
  params.set('f', state.fractalType);
  params.set('p', state.power.toFixed(2));
  params.set('i', String(state.maxIterations));
  params.set('b', state.bailout.toFixed(2));
  params.set('c', state.colorMode);
  params.set('x', state.x.toFixed(4));
  params.set('y', state.y.toFixed(4));
  params.set('z', state.z.toFixed(4));
  params.set('yaw', state.yaw.toFixed(4));
  params.set('pitch', state.pitch.toFixed(4));

  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?${params.toString()}`;
}
