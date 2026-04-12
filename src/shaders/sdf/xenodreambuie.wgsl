struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // Xenodreambuie: alternative 3D mandelbrot with different angular mapping
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

    let rp = pow(r, power);
    dr = pow(r, power - 1.0) * power * dr + 1.0;

    // Xenodreambuie uses atan2 for both angles (different from Mandelbulb)
    let theta = atan2(z.y, z.x) * power;
    let phi = asin(z.z / r) * power;

    z = rp * vec3f(
      cos(phi) * cos(theta),
      cos(phi) * sin(theta),
      sin(phi),
    ) + pos;

    r = length(z);
    minDist = min(minDist, r);
  }

  let dist = 0.5 * log(r) * r / dr;
  return SDFResult(dist, iterations, z, minDist);
}
