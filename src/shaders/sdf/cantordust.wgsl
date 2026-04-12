struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn glsl_mod3(x: vec3f, y: f32) -> vec3f {
  return x - y * floor(x / y);
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // Cantor Dust: keep only the 8 corner cubes at each recursion level
  // Like Menger sponge but removing edges and faces too (20 of 27 sub-cubes)
  var z = pos;
  var iterations = 0u;
  var minDist = length(z);
  let maxIter = uniforms.maxIterations;

  // Start with unit cube
  var d = max(max(abs(z.x), abs(z.y)), abs(z.z)) - 1.0;
  var s = 1.0;

  for (var i = 0u; i < maxIter; i++) {
    iterations = i + 1u;

    let a = glsl_mod3(z * s, 2.0) - 1.0;
    s *= 3.0;

    // Remove everything except the 8 corners:
    // A point is in a corner if ALL three coordinates are in the outer thirds
    // i.e., |a.x| > 1/3, |a.y| > 1/3, |a.z| > 1/3
    // We carve out the cross (where any coordinate is in the middle third)
    let r = abs(a);

    // Cross along X axis (where y and z are both small)
    let crossX = max(1.0 - r.y * 3.0, 1.0 - r.z * 3.0);
    // Cross along Y axis
    let crossY = max(1.0 - r.x * 3.0, 1.0 - r.z * 3.0);
    // Cross along Z axis
    let crossZ = max(1.0 - r.x * 3.0, 1.0 - r.y * 3.0);

    let c = max(crossX, max(crossY, crossZ));
    let carved = c / s;

    d = max(d, carved);
    minDist = min(minDist, abs(carved));
  }

  return SDFResult(d, iterations, z, minDist);
}
