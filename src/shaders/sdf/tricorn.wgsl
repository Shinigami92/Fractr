struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // Tricorn/Mandelbar 3D: conjugate (negate y) before transform
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

    let theta = acos(z.z / r);
    // Conjugate: negate phi
    let phi = -atan2(z.y, z.x);
    let rp = pow(r, power);
    dr = pow(r, power - 1.0) * power * dr + 1.0;

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

  let dist = 0.5 * log(r) * r / dr;
  return SDFResult(dist, iterations, z, minDist);
}
