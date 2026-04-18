import type { SDFParams } from './SDFParams';

export function koch3dSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  const scale = 3;
  let r = 1;

  for (let i = 0; i < params.maxIterations; i++) {
    zx = Math.abs(zx);
    zy = Math.abs(zy);
    zz = Math.abs(zz);
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
    zx = zx * scale - (scale - 1);
    zy = zy * scale - (scale - 1);
    zz = zz * scale - (scale - 1);
    r *= scale;
  }

  return (Math.hypot(zx, zy, zz) - 1.5) / r;
}
