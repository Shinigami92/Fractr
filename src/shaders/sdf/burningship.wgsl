struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // 3D Burning Ship (triplex power with y as polar axis + abs on all outputs).
  // Formula from https://www.reddit.com/r/fractals/comments/1na1g04/
  //   sq_r   = length(z)
  //   sq_xz  = length(z.xz)
  //   r      = sq_r^power
  //   theta  = atan2(sq_xz, y) * power      (polar from y axis)
  //   zangle = atan2(x, z)     * power      (azimuth in xz plane)
  //   x' = |sin(zangle)*sin(theta)*r + cx|
  //   y' = |cos(theta)*r + cy|
  //   z' = |sin(theta)*cos(zangle)*r + cz|
  // Produces the Gothic-cathedral / ship-hull silhouette that defines the
  // 3D Burning Ship family.
  var z = pos;
  var dr = 1.0;
  var r = length(z);
  var minDist = r;
  var iterations = 0u;
  let power = uniforms.power;
  let bailout = uniforms.bailout;
  let maxIter = uniforms.maxIterations;

  // Track max r and paired dr to suppress period-N attractor flicker at deep zoom.
  var rMax = r;
  var drAtMax = dr;

  for (var i = 0u; i < maxIter; i++) {
    if (r > bailout) { break; }
    iterations = i + 1u;

    let rXZ = length(vec2f(z.x, z.z));
    let rp = pow(r, power);
    let theta = atan2(rXZ, z.y) * power;
    let zangle = atan2(z.x, z.z) * power;
    dr = pow(r, power - 1.0) * power * dr + 1.0;

    let nx = abs(sin(zangle) * sin(theta) * rp + pos.x);
    let ny = abs(cos(theta) * rp + pos.y);
    let nz = abs(sin(theta) * cos(zangle) * rp + pos.z);
    z = vec3f(nx, ny, nz);

    r = length(z);
    minDist = min(minDist, r);
    if (r > rMax) {
      rMax = r;
      drAtMax = dr;
    }
  }

  let dist = 0.5 * log(rMax) * rMax / drAtMax;
  return SDFResult(dist, iterations, z, minDist);
}
