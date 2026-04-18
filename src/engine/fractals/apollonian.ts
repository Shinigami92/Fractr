import type { SDFParams } from './SDFParams';

export function apollonianSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  let scale = 1;

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
    zx -= 1;
    zy -= 1;
    zz -= 1;
    const r2 = zx * zx + zy * zy + zz * zz;
    const invR = Math.max(0.5 / r2, 1);
    zx *= invR;
    zy *= invR;
    zz *= invR;
    scale *= invR;
    zx += 1;
    zy += 1;
    zz += 1;
  }

  return (Math.hypot(zx, zy, zz) - 1) / scale;
}
