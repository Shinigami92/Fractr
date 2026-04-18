import type { SDFParams } from './SDFParams';

export function kaleidoboxSDF(x: number, y: number, z: number, params: SDFParams): number {
  let dr = 1;
  let zx = x,
    zy = y,
    zz = z;
  const { power: scale, maxIterations, bailout } = params;
  for (let i = 0; i < maxIterations; i++) {
    if (Math.hypot(zx, zy, zz) > bailout) break;
    if (zx + zy < 0) {
      const t = zx;
      zx = -zy;
      zy = -t;
    }
    if (zx + zz < 0) {
      const t = zx;
      zx = -zz;
      zz = -t;
    }
    if (zy + zz < 0) {
      const t = zy;
      zy = -zz;
      zz = -t;
    }
    zx = Math.max(-1, Math.min(1, zx)) * 2 - zx;
    zy = Math.max(-1, Math.min(1, zy)) * 2 - zy;
    zz = Math.max(-1, Math.min(1, zz)) * 2 - zz;
    const r2 = zx * zx + zy * zy + zz * zz;
    const k = Math.max(1 / Math.max(r2, 0.25), 1);
    zx *= k;
    zy *= k;
    zz *= k;
    dr *= k;
    zx = zx * scale + x;
    zy = zy * scale + y;
    zz = zz * scale + z;
    dr = dr * Math.abs(scale) + 1;
  }
  return Math.hypot(zx, zy, zz) / Math.abs(dr);
}
