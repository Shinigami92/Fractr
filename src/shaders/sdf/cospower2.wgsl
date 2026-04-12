struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // Power-2 Mandelbulb: spherical squaring with power=2
  // Uses the standard Mandelbulb formula at low power for smooth organic shapes
  var z = pos;
  var dr = 1.0;
  var r = length(z);
  var minDist = r;
  var iterations = 0u;
  let bailout = uniforms.bailout;
  let maxIter = uniforms.maxIterations;

  for (var i = 0u; i < maxIter; i++) {
    if (r > bailout) { break; }
    iterations = i + 1u;

    // Spherical coordinates
    let theta = acos(clamp(z.z / r, -1.0, 1.0));
    let phi = atan2(z.y, z.x);

    // Power-2 transform
    let rp = r * r;
    dr = 2.0 * r * dr + 1.0;

    let newTheta = theta * 2.0;
    let newPhi = phi * 2.0;

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
