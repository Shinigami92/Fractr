import type { SDFParams } from './SDFParams';

export function mengerSDF(x: number, y: number, z: number, params: SDFParams): number {
  let d = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) - 1;
  let s = 1;

  for (let i = 0; i < params.maxIterations; i++) {
    // GLSL-style mod
    const ax = ((((x * s) % 2) + 2) % 2) - 1;
    const ay = ((((y * s) % 2) + 2) % 2) - 1;
    const az = ((((z * s) % 2) + 2) % 2) - 1;
    s *= 3;

    const rx = Math.abs(1 - 3 * Math.abs(ax));
    const ry = Math.abs(1 - 3 * Math.abs(ay));
    const rz = Math.abs(1 - 3 * Math.abs(az));

    const da = Math.max(rx, ry);
    const db = Math.max(ry, rz);
    const dc = Math.max(rz, rx);
    const c = (Math.min(da, db, dc) - 1) / s;

    d = Math.max(d, c);
  }

  return d;
}
