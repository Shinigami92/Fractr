import type { SDFParams } from './SDFParams';

export function mandelbulbSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  let dr = 1;
  let r = Math.hypot(zx, zy, zz);
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

    r = Math.hypot(zx, zy, zz);
  }

  return (0.5 * Math.log(r) * r) / dr;
}
