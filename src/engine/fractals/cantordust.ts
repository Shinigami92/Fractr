import type { SDFParams } from './SDFParams';

function glslMod(v: number, m: number): number {
  return v - m * Math.floor(v / m);
}

export function cantordustSDF(x: number, y: number, z: number, params: SDFParams): number {
  let d = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) - 1;
  let s = 1;
  for (let i = 0; i < params.maxIterations; i++) {
    const ax = glslMod(x * s, 2) - 1;
    const ay = glslMod(y * s, 2) - 1;
    const az = glslMod(z * s, 2) - 1;
    s *= 3;
    const rx = Math.abs(ax);
    const ry = Math.abs(ay);
    const rz = Math.abs(az);
    const crossX = Math.max(1 - ry * 3, 1 - rz * 3);
    const crossY = Math.max(1 - rx * 3, 1 - rz * 3);
    const crossZ = Math.max(1 - rx * 3, 1 - ry * 3);
    d = Math.max(d, Math.max(crossX, crossY, crossZ) / s);
  }
  return d;
}
