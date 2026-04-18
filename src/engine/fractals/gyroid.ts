import type { SDFParams } from './SDFParams';

export function gyroidSDF(x: number, y: number, z: number, params: SDFParams): number {
  const scale = params.power;
  const px = x * scale,
    py = y * scale,
    pz = z * scale;
  let g = Math.sin(px) * Math.cos(py) + Math.sin(py) * Math.cos(pz) + Math.sin(pz) * Math.cos(px);
  let amp = 0.5,
    freq = 2;
  for (let i = 0; i < params.maxIterations; i++) {
    const qx = px * freq,
      qy = py * freq,
      qz = pz * freq;
    g +=
      (Math.sin(qx) * Math.cos(qy) + Math.sin(qy) * Math.cos(qz) + Math.sin(qz) * Math.cos(qx)) *
      amp;
    amp *= 0.5;
    freq *= 2;
  }
  return (Math.abs(g) - 0.3) / scale;
}
