import type { SDFParams } from './SDFParams';

export function bristorbrotSDF(x: number, y: number, z: number, params: SDFParams): number {
  let dr = 1;
  let zx = x,
    zy = y,
    zz = z;
  let r = Math.hypot(zx, zy, zz);
  for (let i = 0; i < params.maxIterations; i++) {
    if (r > params.bailout) break;
    dr = 2 * r * dr + 1;
    const nx = zx * zx - zy * zy - zz * zz;
    const ny = 2 * zx * zy;
    const nz = 2 * zx * zz;
    zx = nx + x;
    zy = ny + y;
    zz = nz + z;
    r = Math.hypot(zx, zy, zz);
  }
  return (0.5 * Math.log(r) * r) / dr;
}
