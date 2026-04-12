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

  // Vertices of a regular tetrahedron
  let a1 = vec3f(1.0, 1.0, 1.0);
  let a2 = vec3f(-1.0, -1.0, 1.0);
  let a3 = vec3f(1.0, -1.0, -1.0);
  let a4 = vec3f(-1.0, 1.0, -1.0);

  for (var i = 0u; i < maxIter; i++) {
    iterations = i + 1u;

    // Fold toward nearest vertex
    var c = a1;
    var d = length(z - a1);
    let d2 = length(z - a2);
    if (d2 < d) { c = a2; d = d2; }
    let d3 = length(z - a3);
    if (d3 < d) { c = a3; d = d3; }
    let d4 = length(z - a4);
    if (d4 < d) { c = a4; d = d4; }

    z = z * scale - c * (scale - 1.0);
    minDist = min(minDist, length(z));
  }

  let dist = (length(z) - 1.5) * pow(scale, -f32(iterations));

  return SDFResult(dist, iterations, z, minDist);
}
