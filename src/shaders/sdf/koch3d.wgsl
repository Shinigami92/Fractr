struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  var z = pos;
  var iterations = 0u;
  var minDist = length(z);
  let maxIter = uniforms.maxIterations;
  let scale = 3.0;
  var r = 1.0;

  for (var i = 0u; i < maxIter; i++) {
    iterations = i + 1u;

    // Absolute value fold (octahedral symmetry)
    z = abs(z);

    // Conditional folds to create Koch-like star pattern
    if (z.x + z.y < 0.0) {
      let tmp = z.x;
      z.x = -z.y;
      z.y = -tmp;
    }
    if (z.x + z.z < 0.0) {
      let tmp = z.x;
      z.x = -z.z;
      z.z = -tmp;
    }
    if (z.y + z.z < 0.0) {
      let tmp = z.y;
      z.y = -z.z;
      z.z = -tmp;
    }

    // Scale and offset to create Koch recursion
    z = z * scale - vec3f(scale - 1.0, scale - 1.0, scale - 1.0);

    r *= scale;
    minDist = min(minDist, length(z) / r);
  }

  // Base shape: sphere
  let dist = (length(z) - 1.5) / r;

  return SDFResult(dist, iterations, z, minDist);
}
