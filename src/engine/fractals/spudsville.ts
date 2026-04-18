import type { SDFParams } from './SDFParams';

export function spudsvilleSDF(x: number, y: number, z: number, params: SDFParams): number {
  let dr = 1;
  let zx = x,
    zy = y,
    zz = z;
  let r = Math.hypot(zx, zy, zz);
  const { power, maxIterations, bailout } = params;
  for (let i = 0; i < maxIterations; i++) {
    if (r > bailout) break;
    if (i % 2 === 0) {
      const phi = Math.atan2(zy, zx);
      const theta = Math.acos(zz / r);
      const rp = r ** power;
      dr = r ** (power - 1) * power * dr + 1;
      zx = rp * Math.sin(theta * power) * Math.cos(phi * power) + x;
      zy = rp * Math.sin(theta * power) * Math.sin(phi * power) + y;
      zz = rp * Math.cos(theta * power) + z;
    } else {
      zx = Math.max(-1, Math.min(1, zx)) * 2 - zx;
      zy = Math.max(-1, Math.min(1, zy)) * 2 - zy;
      zz = Math.max(-1, Math.min(1, zz)) * 2 - zz;
      const r2 = zx * zx + zy * zy + zz * zz;
      const k = Math.max(1 / Math.max(r2, 0.25), 1);
      zx *= k;
      zy *= k;
      zz *= k;
      dr *= k;
      zx = zx * 2 + x;
      zy = zy * 2 + y;
      zz = zz * 2 + z;
      dr = dr * 2 + 1;
    }
    r = Math.hypot(zx, zy, zz);
  }
  return (0.5 * Math.log(r) * r) / dr;
}
