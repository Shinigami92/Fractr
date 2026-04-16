import {
  COLOR_MODES,
  type ColorMode,
  FRACTAL_TYPES,
  type FractalType,
  RENDER_MODES,
  type RenderMode,
} from '../stores/fractalParams';

export interface SharedState {
  fractalType: FractalType;
  power: number;
  maxIterations: number;
  bailout: number;
  colorMode: ColorMode;
  renderMode: RenderMode;
  dynamicIterations: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  preview: boolean;
}

const FRACTAL_TYPE_SET = new Set<string>(FRACTAL_TYPES);
const COLOR_MODE_SET = new Set<string>(COLOR_MODES);
const RENDER_MODE_SET = new Set<string>(RENDER_MODES);

export function readStateFromURL(): SharedState | null {
  const params = new URLSearchParams(window.location.search);
  const f = params.get('f');
  if (!f || !FRACTAL_TYPE_SET.has(f)) return null;

  const get = (key: string, fallback: number) => {
    const v = params.get(key);
    if (v === null) return fallback;
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const color = params.get('c') ?? 'distance';
  const render = params.get('r') ?? 'ray';

  return {
    fractalType: f as FractalType,
    power: get('p', 8),
    maxIterations: get('i', 20),
    bailout: get('b', 2),
    colorMode: COLOR_MODE_SET.has(color) ? (color as ColorMode) : 'distance',
    renderMode: RENDER_MODE_SET.has(render) ? (render as RenderMode) : 'ray',
    x: get('x', 0),
    y: get('y', 0),
    z: get('z', 3),
    yaw: get('yaw', -Math.PI / 2),
    pitch: get('pitch', 0),
    roll: get('roll', 0),
    dynamicIterations: params.get('dyn') !== '0',
    preview: params.get('preview') === '1',
  };
}

export function buildShareURL(state: SharedState): string {
  const params = new URLSearchParams();
  params.set('f', state.fractalType);
  params.set('p', state.power.toFixed(2));
  params.set('i', String(state.maxIterations));
  params.set('b', state.bailout.toFixed(2));
  params.set('c', state.colorMode);
  params.set('r', state.renderMode);
  params.set('dyn', state.dynamicIterations ? '1' : '0');
  params.set('x', state.x.toFixed(6));
  params.set('y', state.y.toFixed(6));
  params.set('z', state.z.toFixed(6));
  params.set('yaw', state.yaw.toFixed(5));
  params.set('pitch', state.pitch.toFixed(5));
  params.set('roll', state.roll.toFixed(5));

  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?${params.toString()}`;
}
