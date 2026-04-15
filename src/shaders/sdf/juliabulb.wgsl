struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // Juliabulb: Mandelbulb iteration with a Julia constant
  let julia = vec3f(uniforms.power * 0.1, -0.5, 0.3);
  var z = pos;
  var dr = 1.0;
  var r = length(z);
  var minDist = r;
  var iterations = 0u;
  let power = 8.0; // Fixed power-8 bulb
  let bailout = uniforms.bailout;
  let maxIter = uniforms.maxIterations;

  // Track max r and paired dr to suppress period-N attractor flicker at deep zoom.
  var rMax = r;
  var drAtMax = dr;

  for (var i = 0u; i < maxIter; i++) {
    if (r > bailout) { break; }
    iterations = i + 1u;

    let theta = acos(z.z / r);
    let phi = atan2(z.y, z.x);
    let rp = pow(r, power);
    dr = pow(r, power - 1.0) * power * dr + 1.0;

    let newTheta = theta * power;
    let newPhi = phi * power;

    z = rp * vec3f(
      sin(newTheta) * cos(newPhi),
      sin(newTheta) * sin(newPhi),
      cos(newTheta),
    ) + julia;

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
