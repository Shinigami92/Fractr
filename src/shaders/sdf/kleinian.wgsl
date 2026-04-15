struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // Pseudo-Kleinian: kaleidoscopic IFS with box and sphere inversions
  var z = pos;
  var iterations = 0u;
  var minDist = length(z);
  var dr = 1.0;
  // For >= 8 iterations, round up to a multiple of 4 to suppress period-N attractor flicker
  // (orbit enters short cycles; since there's no bailout, every ray's final state depends
  // on maxIter mod N, causing DE to oscillate as iterations change by 1). Below 8 we keep
  // per-iteration fidelity so users exploring low-detail variants see every step.
  let rawIter = uniforms.maxIterations;
  let maxIter = select(rawIter, (rawIter + 3u) & ~3u, rawIter >= 8u);
  let boxSize = vec3f(1.0, 1.0, 0.5);
  let foldPlane = 1.2;

  for (var i = 0u; i < maxIter; i++) {
    iterations = i + 1u;

    // Box fold
    z = clamp(z, -boxSize, boxSize) * 2.0 - z;

    // Sphere inversion
    let r2 = dot(z, z);
    let k = max(foldPlane / r2, 1.0);
    z *= k;
    dr *= k;

    // Translation
    z = z + vec3f(0.2, 0.3, -0.4);

    minDist = min(minDist, length(z) / dr);
  }

  let dist = (length(z) - 0.5) / dr;

  return SDFResult(dist, iterations, z, minDist);
}
