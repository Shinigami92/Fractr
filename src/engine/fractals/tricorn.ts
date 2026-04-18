import type { SDFParams } from './SDFParams';

export function tricornSDF(x: number, y: number, z: number, params: SDFParams): number {
  let dr = 1;
  let zx = x,
    zy = y,
    zz = z;
  let r = Math.hypot(zx, zy, zz);
  const { power, maxIterations, bailout } = params;
  for (let i = 0; i < maxIterations; i++) {
    if (r > bailout) break;
    const phi = -Math.atan2(zy, zx);
    const theta = Math.acos(zz / r);
    const rp = r ** power;
    dr = r ** (power - 1) * power * dr + 1;
    zx = rp * Math.sin(theta * power) * Math.cos(phi * power) + x;
    zy = rp * Math.sin(theta * power) * Math.sin(phi * power) + y;
    zz = rp * Math.cos(theta * power) + z;
    r = Math.hypot(zx, zy, zz);
  }
  return (0.5 * Math.log(r) * r) / dr;
}
