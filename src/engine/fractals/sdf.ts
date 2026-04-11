import type { FractalType } from '../../stores/fractalParams';

interface SDFParams {
  power: number;
  maxIterations: number;
  bailout: number;
}

function mandelbulbSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  let dr = 1;
  let r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  const { power, maxIterations, bailout } = params;

  for (let i = 0; i < maxIterations; i++) {
    if (r > bailout) break;

    const theta = Math.acos(zz / r);
    const phi = Math.atan2(zy, zx);
    const rp = r ** power;
    dr = r ** (power - 1) * power * dr + 1;

    const newTheta = theta * power;
    const newPhi = phi * power;
    zx = rp * Math.sin(newTheta) * Math.cos(newPhi) + x;
    zy = rp * Math.sin(newTheta) * Math.sin(newPhi) + y;
    zz = rp * Math.cos(newTheta) + z;

    r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  }

  return (0.5 * Math.log(r) * r) / dr;
}

function mandelboxSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  let dr = 1;
  const { power: scale, maxIterations, bailout } = params;
  const FOLD = 1;
  const MIN_R2 = 0.25;
  const FIXED_R2 = 1;

  for (let i = 0; i < maxIterations; i++) {
    if (Math.sqrt(zx * zx + zy * zy + zz * zz) > bailout) break;

    // Box fold
    zx = Math.max(-FOLD, Math.min(FOLD, zx)) * 2 - zx;
    zy = Math.max(-FOLD, Math.min(FOLD, zy)) * 2 - zy;
    zz = Math.max(-FOLD, Math.min(FOLD, zz)) * 2 - zz;

    // Sphere fold
    const r2 = zx * zx + zy * zy + zz * zz;
    let factor = 1;
    if (r2 < MIN_R2) {
      factor = FIXED_R2 / MIN_R2;
    } else if (r2 < FIXED_R2) {
      factor = FIXED_R2 / r2;
    }
    zx *= factor;
    zy *= factor;
    zz *= factor;
    dr = dr * factor;

    // Scale and translate
    zx = zx * scale + x;
    zy = zy * scale + y;
    zz = zz * scale + z;
    dr = dr * Math.abs(scale) + 1;
  }

  return Math.sqrt(zx * zx + zy * zy + zz * zz) / Math.abs(dr);
}

function mengerSDF(x: number, y: number, z: number, params: SDFParams): number {
  let d = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) - 1;
  let s = 1;

  for (let i = 0; i < params.maxIterations; i++) {
    // GLSL-style mod
    const ax = ((((x * s) % 2) + 2) % 2) - 1;
    const ay = ((((y * s) % 2) + 2) % 2) - 1;
    const az = ((((z * s) % 2) + 2) % 2) - 1;
    s *= 3;

    const rx = Math.abs(1 - 3 * Math.abs(ax));
    const ry = Math.abs(1 - 3 * Math.abs(ay));
    const rz = Math.abs(1 - 3 * Math.abs(az));

    const da = Math.max(rx, ry);
    const db = Math.max(ry, rz);
    const dc = Math.max(rz, rx);
    const c = (Math.min(da, db, dc) - 1) / s;

    d = Math.max(d, c);
  }

  return d;
}

const SDF_FUNCTIONS: Record<
  FractalType,
  (x: number, y: number, z: number, params: SDFParams) => number
> = {
  mandelbulb: mandelbulbSDF,
  mandelbox: mandelboxSDF,
  menger: mengerSDF,
};

export function evaluateSDF(
  fractalType: FractalType,
  x: number,
  y: number,
  z: number,
  params: SDFParams,
): number {
  return SDF_FUNCTIONS[fractalType](x, y, z, params);
}
