struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // Bristorbrot: bristorian algebra z^2 + c
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

    dr = 2.0 * r * dr + 1.0;

    // Bristorian squaring
    let newX = z.x * z.x - z.y * z.y - z.z * z.z;
    let newY = z.y * (2.0 * z.x - z.z);
    let newZ = z.z * (2.0 * z.x + z.y);

    z = vec3f(newX, newY, newZ) + pos;
    r = length(z);
    minDist = min(minDist, r);
  }

  let dist = 0.5 * log(r) * r / dr;
  return SDFResult(dist, iterations, z, minDist);
}
