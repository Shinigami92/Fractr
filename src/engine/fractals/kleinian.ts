import type { SDFParams } from './SDFParams';

export function kleinianSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  let dr = 1;
  const box = [1, 1, 0.5];
  // Track minimum |DE| across iterations for safe camera-speed estimation.
  // Detecting walls requires deeper iterations (macro-shape fold is too loose),
  // but past a certain `dr` the DE degrades into chaotic noise. Bail out when
  // `dr` suggests precision has collapsed — before that, tighter iteration
  // values win; after, trust the last known good estimate.
  const iter = Math.min(16, params.maxIterations);
  let minAbsDist = Infinity;
  let bestSigned = 0;

  for (let i = 0; i < iter; i++) {
    zx = Math.max(-box[0]!, Math.min(box[0]!, zx)) * 2 - zx;
    zy = Math.max(-box[1]!, Math.min(box[1]!, zy)) * 2 - zy;
    zz = Math.max(-box[2]!, Math.min(box[2]!, zz)) * 2 - zz;
    const r2 = zx * zx + zy * zy + zz * zz;
    const k = Math.max(1.2 / r2, 1);
    zx *= k;
    zy *= k;
    zz *= k;
    dr *= k;
    zx += 0.2;
    zy += 0.3;
    zz += -0.4;
    const d = (Math.hypot(zx, zy, zz) - 0.5) / dr;
    const ad = Math.abs(d);
    if (ad < minAbsDist) {
      minAbsDist = ad;
      bestSigned = d;
    }
    if (dr > 1e6) break;
  }

  return bestSigned;
}
