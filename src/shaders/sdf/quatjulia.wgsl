struct SDFResult {
  distance: f32,
  iterations: u32,
  lastOrbit: vec3f,
  minDist: f32,
}

fn sceneSDF(pos: vec3f) -> SDFResult {
  // Quaternion Julia set: iterate q = q^2 + c in 4D, slice to 3D
  let c = vec4f(uniforms.power * -0.2, 0.6, 0.2, -0.4);
  var q = vec4f(pos, 0.0);
  var dq = vec4f(1.0, 0.0, 0.0, 0.0);
  var r = length(q);
  var minDist = r;
  var iterations = 0u;
  let maxIter = uniforms.maxIterations;
  let bailout = uniforms.bailout;

  for (var i = 0u; i < maxIter; i++) {
    if (r > bailout) { break; }
    iterations = i + 1u;

    // q' = 2 * q * dq (quaternion derivative)
    dq = 2.0 * vec4f(
      q.x * dq.x - q.y * dq.y - q.z * dq.z - q.w * dq.w,
      q.x * dq.y + q.y * dq.x + q.z * dq.w - q.w * dq.z,
      q.x * dq.z - q.y * dq.w + q.z * dq.x + q.w * dq.y,
      q.x * dq.w + q.y * dq.z - q.z * dq.y + q.w * dq.x,
    );

    // q = q^2 + c (quaternion squaring)
    let newQ = vec4f(
      q.x * q.x - q.y * q.y - q.z * q.z - q.w * q.w,
      2.0 * q.x * q.y,
      2.0 * q.x * q.z,
      2.0 * q.x * q.w,
    ) + c;

    q = newQ;
    r = length(q);
    minDist = min(minDist, r);
  }

  let dist = 0.5 * r * log(r) / length(dq);

  return SDFResult(dist, iterations, q.xyz, minDist);
}
