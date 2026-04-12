struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // Power-2 Mandelbulb using cosine formula
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

    // Power-2 using cosine: z = z^2 + c with spherical squaring
    let r2 = r * r;
    dr = 2.0 * r * dr + 1.0;

    let newX = z.x * z.x - z.y * z.y - z.z * z.z;
    let newY = 2.0 * z.x * z.y * cos(z.z * 0.5);
    let newZ = 2.0 * z.x * z.z * sin(z.y * 0.5);

    z = vec3f(newX, newY, newZ) + pos;
    r = length(z);
    minDist = min(minDist, r);
  }

  let dist = 0.5 * log(r) * r / dr;
  return SDFResult(dist, iterations, z, minDist);
}
