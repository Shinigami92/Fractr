import type { SDFParams } from './SDFParams';

export function quatjuliaSDF(x: number, y: number, z: number, params: SDFParams): number {
  const c = [params.power * -0.2, 0.6, 0.2, -0.4];
  let qx = x;
  let qy = y;
  let qz = z;
  let qw = 0;
  let dqx = 1;
  let dqy = 0;
  let dqz = 0;
  let dqw = 0;
  let r = Math.hypot(qx, qy, qz, qw);

  for (let i = 0; i < params.maxIterations; i++) {
    if (r > params.bailout) break;
    const ndx = 2 * (qx * dqx - qy * dqy - qz * dqz - qw * dqw);
    const ndy = 2 * (qx * dqy + qy * dqx + qz * dqw - qw * dqz);
    const ndz = 2 * (qx * dqz - qy * dqw + qz * dqx + qw * dqy);
    const ndw = 2 * (qx * dqw + qy * dqz - qz * dqy + qw * dqx);
    dqx = ndx;
    dqy = ndy;
    dqz = ndz;
    dqw = ndw;
    const nqx = qx * qx - qy * qy - qz * qz - qw * qw + c[0]!;
    const nqy = 2 * qx * qy + c[1]!;
    const nqz = 2 * qx * qz + c[2]!;
    const nqw = 2 * qx * qw + c[3]!;
    qx = nqx;
    qy = nqy;
    qz = nqz;
    qw = nqw;
    r = Math.hypot(qx, qy, qz, qw);
  }

  const dr = Math.hypot(dqx, dqy, dqz, dqw);
  return (0.5 * r * Math.log(r)) / dr;
}
