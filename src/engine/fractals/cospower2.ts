import type { SDFParams } from './SDFParams';

export function cospower2SDF(x: number, y: number, z: number, params: SDFParams): number {
  let dr = 1;
  let zx = x,
    zy = y,
    zz = z;
  let r = Math.hypot(zx, zy, zz);
  for (let i = 0; i < params.maxIterations; i++) {
    if (r > params.bailout) break;
    const theta = Math.acos(Math.max(-1, Math.min(1, zz / r)));
    const phi = Math.atan2(zy, zx);
    const rp = r * r;
    dr = 2 * r * dr + 1;
    const nt = theta * 2;
    const np = phi * 2;
    zx = rp * Math.sin(nt) * Math.cos(np) + x;
    zy = rp * Math.sin(nt) * Math.sin(np) + y;
    zz = rp * Math.cos(nt) + z;
    r = Math.hypot(zx, zy, zz);
  }
  return (0.5 * Math.log(r) * r) / dr;
}
