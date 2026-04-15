struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  var z = pos;
  var dr = 1.0;
  var r = length(z);
  var minDist = r;
  var iterations = 0u;
  let power = uniforms.power;
  let bailout = uniforms.bailout;
  let maxIter = uniforms.maxIterations;

  // Track max r across all iterations AND the paired dr at that peak, to suppress
  // period-N attractor flicker (z enters cycles near the surface; using the final r
  // makes DE depend on cycle phase, causing parity/period flicker as maxIter changes).
  // Taking the running max is period-invariant for any N.
  var rMax = r;
  var drAtMax = dr;

  for (var i = 0u; i < maxIter; i++) {
    if (r > bailout) { break; }
    iterations = i + 1u;

    // Convert to spherical coordinates
    let theta = acos(z.z / r);
    let phi = atan2(z.y, z.x);

    // Power of r
    let rp = pow(r, power);
    dr = pow(r, power - 1.0) * power * dr + 1.0;

    // Scale and rotate the point
    let newTheta = theta * power;
    let newPhi = phi * power;

    z = rp * vec3f(
      sin(newTheta) * cos(newPhi),
      sin(newTheta) * sin(newPhi),
      cos(newTheta),
    ) + pos;

    r = length(z);
    minDist = min(minDist, r);
    if (r > rMax) {
      rMax = r;
      drAtMax = dr;
    }
  }

  // Use the running max r (and dr at that moment) for the DE — period-invariant
  // regardless of cycle length. For bailed-out rays, rMax == final r so DE is unchanged.
  let dist = 0.5 * log(rMax) * rMax / drAtMax;

  return SDFResult(dist, iterations, z, minDist);
}
