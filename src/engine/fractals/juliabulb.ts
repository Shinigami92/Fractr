import type { SDFParams } from './SDFParams';

export function juliabulbSDF(x: number, y: number, z: number, params: SDFParams): number {
  const julia = [params.power * 0.1, -0.5, 0.3];
  let zx = x;
  let zy = y;
  let zz = z;
  let dr = 1;
  let r = Math.hypot(zx, zy, zz);
  const power = 8;

  for (let i = 0; i < params.maxIterations; i++) {
    if (r > params.bailout) break;
    const theta = Math.acos(zz / r);
    const phi = Math.atan2(zy, zx);
    const rp = r ** power;
    dr = r ** (power - 1) * power * dr + 1;
    const nt = theta * power;
    const np = phi * power;
    zx = rp * Math.sin(nt) * Math.cos(np) + julia[0]!;
    zy = rp * Math.sin(nt) * Math.sin(np) + julia[1]!;
    zz = rp * Math.cos(nt) + julia[2]!;
    r = Math.hypot(zx, zy, zz);
  }

  return (0.5 * Math.log(r) * r) / dr;
}
