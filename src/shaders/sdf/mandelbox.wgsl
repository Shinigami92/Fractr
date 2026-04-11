struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

const FOLD_LIMIT = 1.0;
const MIN_RADIUS_SQ = 0.25; // minRadius^2
const FIXED_RADIUS_SQ = 1.0; // fixedRadius^2

fn boxFold(z: vec3f) -> vec3f {
  return clamp(z, vec3f(-FOLD_LIMIT), vec3f(FOLD_LIMIT)) * 2.0 - z;
}

fn sphereFold(z: vec3f, dr: f32) -> vec2f {
  // Returns (new_dr, scale_factor) packed as vec2f
  let r2 = dot(z, z);
  if (r2 < MIN_RADIUS_SQ) {
    let factor = FIXED_RADIUS_SQ / MIN_RADIUS_SQ;
    return vec2f(dr * factor, factor);
  } else if (r2 < FIXED_RADIUS_SQ) {
    let factor = FIXED_RADIUS_SQ / r2;
    return vec2f(dr * factor, factor);
  }
  return vec2f(dr, 1.0);
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  var z = pos;
  var dr = 1.0;
  var minDist = length(z);
  var iterations = 0u;
  let scale = uniforms.power; // Reuse power as Mandelbox scale
  let maxIter = uniforms.maxIterations;
  let bailout = uniforms.bailout;

  for (var i = 0u; i < maxIter; i++) {
    if (length(z) > bailout) { break; }
    iterations = i + 1u;

    // Box fold
    z = boxFold(z);

    // Sphere fold
    let sf = sphereFold(z, dr);
    dr = sf.x;
    let factor = sf.y;
    z *= factor;

    // Scale and translate
    z = z * scale + pos;
    dr = dr * abs(scale) + 1.0;

    minDist = min(minDist, length(z));
  }

  let dist = length(z) / abs(dr);

  return SDFResult(dist, iterations, z, minDist);
}
