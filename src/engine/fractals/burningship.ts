import type { SDFParams } from './SDFParams';

// 3D Burning Ship (triplex power with y as polar axis + abs on all outputs).
// Formula from https://www.reddit.com/r/fractals/comments/1na1g04/
//   sq_r   = sqrt(x²+y²+z²)
//   sq_xz  = sqrt(x²+z²)
//   r      = sq_r^power
//   theta  = atan2(sq_xz, y) * power      (polar from y axis)
//   zangle = atan2(x, z)    * power       (azimuth in xz plane)
//   x' = |sin(zangle)*sin(theta)*r + cx|
//   y' = |cos(theta)*r + cy|
//   z' = |sin(theta)*cos(zangle)*r + cz|
// Produces the Gothic-cathedral / ship-hull silhouette that defines the 3D
// Burning Ship family.
export function burningshipSDF(x: number, y: number, z: number, params: SDFParams): number {
  let dr = 1;
  let zx = x,
    zy = y,
    zz = z;
  let r = Math.hypot(zx, zy, zz);
  const { power, maxIterations, bailout } = params;
  for (let i = 0; i < maxIterations; i++) {
    if (r > bailout) break;
    const rXZ = Math.hypot(zx, zz);
    const rp = r ** power;
    const theta = Math.atan2(rXZ, zy) * power;
    const zangle = Math.atan2(zx, zz) * power;
    dr = r ** (power - 1) * power * dr + 1;
    zx = Math.abs(Math.sin(zangle) * Math.sin(theta) * rp + x);
    zy = Math.abs(Math.cos(theta) * rp + y);
    zz = Math.abs(Math.sin(theta) * Math.cos(zangle) * rp + z);
    r = Math.hypot(zx, zy, zz);
  }
  return (0.5 * Math.log(r) * r) / dr;
}
