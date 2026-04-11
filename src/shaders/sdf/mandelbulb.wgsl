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
  }

  // Distance estimator
  let dist = 0.5 * log(r) * r / dr;

  return SDFResult(dist, iterations, z, minDist);
}
