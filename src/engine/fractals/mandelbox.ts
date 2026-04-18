import type { SDFParams } from './SDFParams';

export function mandelboxSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  let dr = 1;
  const { power: scale, maxIterations, bailout } = params;
  const FOLD = 1;
  const MIN_R2 = 0.25;
  const FIXED_R2 = 1;

  for (let i = 0; i < maxIterations; i++) {
    if (Math.hypot(zx, zy, zz) > bailout) break;

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

  return Math.hypot(zx, zy, zz) / Math.abs(dr);
}
