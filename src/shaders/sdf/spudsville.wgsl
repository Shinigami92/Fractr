struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // Spudsville: hybrid Mandelbulb + Mandelbox alternating iterations
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

    if (i % 2u == 0u) {
      // Mandelbulb step
      let theta = acos(z.z / r);
      let phi = atan2(z.y, z.x);
      let rp = pow(r, power);
      dr = pow(r, power - 1.0) * power * dr + 1.0;
      let nt = theta * power;
      let np = phi * power;
      z = rp * vec3f(sin(nt) * cos(np), sin(nt) * sin(np), cos(nt)) + pos;
    } else {
      // Mandelbox step: box fold + sphere fold
      z = clamp(z, vec3f(-1.0), vec3f(1.0)) * 2.0 - z;
      let r2 = dot(z, z);
      let k = max(1.0 / max(r2, 0.25), 1.0);
      z *= k;
      dr *= k;
      z = z * 2.0 + pos;
      dr = dr * 2.0 + 1.0;
    }

    r = length(z);
    minDist = min(minDist, r);
  }

  let dist = 0.5 * log(r) * r / dr;
  return SDFResult(dist, iterations, z, minDist);
}
