struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // Gyroid: triply-periodic minimal surface with fractal thickness modulation
  let scale = uniforms.power; // Controls period
  let p = pos * scale;

  // Base gyroid SDF
  var g = sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x);

  // Add recursive detail at multiple scales
  let maxIter = uniforms.maxIterations;
  var amplitude = 0.5;
  var freq = 2.0;
  var iterations = 0u;
  var minDist = abs(g);

  for (var i = 0u; i < maxIter; i++) {
    iterations = i + 1u;
    let q = p * freq;
    let detail = sin(q.x) * cos(q.y) + sin(q.y) * cos(q.z) + sin(q.z) * cos(q.x);
    g = g + detail * amplitude;
    minDist = min(minDist, abs(detail * amplitude));
    amplitude *= 0.5;
    freq *= 2.0;
  }

  // Shell thickness
  let thickness = 0.3;
  let dist = (abs(g) - thickness) / scale;

  return SDFResult(dist, iterations, pos, minDist);
}
