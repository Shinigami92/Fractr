struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // Apollonian gasket: sphere inversion packing
  var z = pos;
  var iterations = 0u;
  var minDist = length(z);
  var scale = 1.0;
  let maxIter = uniforms.maxIterations;
  let k = 1.0; // packing factor

  for (var i = 0u; i < maxIter; i++) {
    iterations = i + 1u;

    // Fold into positive octant
    z = abs(z);

    // Sort components descending
    if (z.x - z.y < 0.0) { let tmp = z.x; z.x = z.y; z.y = tmp; }
    if (z.x - z.z < 0.0) { let tmp = z.x; z.x = z.z; z.z = tmp; }
    if (z.y - z.z < 0.0) { let tmp = z.y; z.y = z.z; z.z = tmp; }

    // Translate
    z = z - vec3f(1.0, 1.0, 1.0);

    // Sphere inversion
    let r2 = dot(z, z);
    let invR = max(0.5 / r2, 1.0);
    z = z * invR;
    scale *= invR;

    // Translate back
    z = z + vec3f(1.0, 1.0, 1.0);

    minDist = min(minDist, length(z) / scale);
  }

  // Distance to sphere
  let dist = (length(z) - 1.0) / scale;

  return SDFResult(dist, iterations, z, minDist);
}
