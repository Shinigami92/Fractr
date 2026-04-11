struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

// GLSL-style mod: always returns positive result
fn glsl_mod(x: vec3f, y: f32) -> vec3f {
  return x - y * floor(x / y);
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  var z = pos;
  var minDist = length(z);
  var iterations = 0u;
  let maxIter = uniforms.maxIterations;

  // Unit cube SDF as starting shape
  var d = max(max(abs(z.x), abs(z.y)), abs(z.z)) - 1.0;
  var s = 1.0;

  for (var i = 0u; i < maxIter; i++) {
    iterations = i + 1u;

    let a = glsl_mod(z * s, 2.0) - 1.0;
    s *= 3.0;
    let r = abs(1.0 - 3.0 * abs(a));

    // Distance to the infinite cross
    let da = max(r.x, r.y);
    let db = max(r.y, r.z);
    let dc = max(r.z, r.x);
    let c = (min(da, min(db, dc)) - 1.0) / s;

    d = max(d, c);
    minDist = min(minDist, abs(c));
  }

  return SDFResult(d, iterations, z, minDist);
}
