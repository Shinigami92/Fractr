import type { SDFParams } from './SDFParams';

export function octahedronSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x,
    zy = y,
    zz = z;
  const scale = 2;
  let r = 1;
  for (let i = 0; i < params.maxIterations; i++) {
    zx = Math.abs(zx);
    zy = Math.abs(zy);
    zz = Math.abs(zz);
    if (zx < zy) {
      const t = zx;
      zx = zy;
      zy = t;
    }
    if (zx < zz) {
      const t = zx;
      zx = zz;
      zz = t;
    }
    if (zy < zz) {
      const t = zy;
      zy = zz;
      zz = t;
    }
    zx = zx * scale - (scale - 1);
    zy = zy * scale - (scale - 1);
    zz = zz * scale - (scale - 1);
    if (zz < -1) zz = -2 - zz;
    const r2 = zx * zx + zy * zy + zz * zz;
    if (r2 < 0.5) {
      zx *= 2;
      zy *= 2;
      zz *= 2;
      r *= 2;
    }
    r *= scale;
  }
  const a = Math.abs(zx / r) + Math.abs(zy / r) + Math.abs(zz / r);
  return (a - 1) * 0.577;
}
