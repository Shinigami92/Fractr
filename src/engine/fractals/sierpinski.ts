import type { SDFParams } from './SDFParams';

export function sierpinskiSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  const a = [
    [1, 1, 1],
    [-1, -1, 1],
    [1, -1, -1],
    [-1, 1, -1],
  ] as const;
  const scale = 2;

  for (let i = 0; i < params.maxIterations; i++) {
    let ci = 0;
    let d = (zx - a[0][0]) ** 2 + (zy - a[0][1]) ** 2 + (zz - a[0][2]) ** 2;
    for (let j = 1; j < 4; j++) {
      const dj = (zx - a[j]![0]) ** 2 + (zy - a[j]![1]) ** 2 + (zz - a[j]![2]) ** 2;
      if (dj < d) {
        ci = j;
        d = dj;
      }
    }
    zx = zx * scale - a[ci]![0] * (scale - 1);
    zy = zy * scale - a[ci]![1] * (scale - 1);
    zz = zz * scale - a[ci]![2] * (scale - 1);
  }

  return (Math.hypot(zx, zy, zz) - 1.5) * scale ** -params.maxIterations;
}
