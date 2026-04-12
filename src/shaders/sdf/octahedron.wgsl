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
  let scale = 2.0;
  var r = 1.0;

  for (var i = 0u; i < maxIter; i++) {
    iterations = i + 1u;

    // Octahedral symmetry: fold into fundamental domain
    z = abs(z);
    if (z.x - z.y < 0.0) { let tmp = z.x; z.x = z.y; z.y = tmp; }
    if (z.x - z.z < 0.0) { let tmp = z.x; z.x = z.z; z.z = tmp; }
    if (z.y - z.z < 0.0) { let tmp = z.y; z.y = z.z; z.z = tmp; }

    // Menger-like cross removal with octahedral twist
    z = z * scale;
    z = z - vec3f(scale - 1.0, scale - 1.0, scale - 1.0);

    // Octahedral edge fold: creates the interesting detail
    if (z.z < -1.0) { z.z = -2.0 - z.z; }

    // Sphere inversion for extra complexity
    let r2 = dot(z, z);
    if (r2 < 0.5) {
      z *= 2.0;
      r *= 2.0;
    }

    r *= scale;
    minDist = min(minDist, length(z) / r);
  }

  // Octahedron base shape: |x|+|y|+|z| = 1
  let a = abs(z / r);
  let dist = (a.x + a.y + a.z - 1.0) * 0.577 / 1.0;

  return SDFResult(dist, iterations, z, minDist);
}
