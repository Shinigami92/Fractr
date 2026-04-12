struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // Kaleidoscopic Box: Mandelbox with tetrahedral fold symmetry
  var z = pos;
  var dr = 1.0;
  var minDist = length(z);
  var iterations = 0u;
  let scale = uniforms.power;
  let maxIter = uniforms.maxIterations;
  let bailout = uniforms.bailout;

  for (var i = 0u; i < maxIter; i++) {
    if (length(z) > bailout) { break; }
    iterations = i + 1u;

    // Tetrahedral fold
    if (z.x + z.y < 0.0) { let tmp = z.x; z.x = -z.y; z.y = -tmp; }
    if (z.x + z.z < 0.0) { let tmp = z.x; z.x = -z.z; z.z = -tmp; }
    if (z.y + z.z < 0.0) { let tmp = z.y; z.y = -z.z; z.z = -tmp; }

    // Box fold
    z = clamp(z, vec3f(-1.0), vec3f(1.0)) * 2.0 - z;

    // Sphere fold
    let r2 = dot(z, z);
    let k = max(1.0 / max(r2, 0.25), 1.0);
    z *= k;
    dr *= k;

    z = z * scale + pos;
    dr = dr * abs(scale) + 1.0;
    minDist = min(minDist, length(z) / abs(dr));
  }

  let dist = length(z) / abs(dr);
  return SDFResult(dist, iterations, z, minDist);
}
