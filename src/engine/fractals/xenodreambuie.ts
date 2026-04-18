import type { SDFParams } from './SDFParams';

export function xenodreambuieSDF(x: number, y: number, z: number, params: SDFParams): number {
  let dr = 1;
  let zx = x,
    zy = y,
    zz = z;
  let r = Math.hypot(zx, zy, zz);
  const { power, maxIterations, bailout } = params;
  for (let i = 0; i < maxIterations; i++) {
    if (r > bailout) break;
    const rp = r ** power;
    dr = r ** (power - 1) * power * dr + 1;
    const theta = Math.atan2(zy, zx) * power;
    const phi = Math.asin(zz / r) * power;
    zx = rp * Math.cos(phi) * Math.cos(theta) + x;
    zy = rp * Math.cos(phi) * Math.sin(theta) + y;
    zz = rp * Math.sin(phi) + z;
    r = Math.hypot(zx, zy, zz);
  }
  return (0.5 * Math.log(r) * r) / dr;
}
