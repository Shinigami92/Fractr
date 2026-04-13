const MAX_DISTANCE = 20.0;

fn estimateNormal(p: vec3f, eps: f32) -> vec3f {
  // Tetrahedron technique: 4 SDF evaluations instead of 6
  let e = vec2f(1.0, -1.0) * 0.5773 * eps;
  return normalize(
    e.xyy * sceneSDF(p + e.xyy).distance +
    e.yyx * sceneSDF(p + e.yyx).distance +
    e.yxy * sceneSDF(p + e.yxy).distance +
    e.xxx * sceneSDF(p + e.xxx).distance
  );
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = fragCoord.xy / uniforms.resolution;
  let ray = rayFromCamera(uv);

  // Pixel footprint: approximate screen-space size of one pixel in world units
  let pixelSize = 2.0 / uniforms.resolution.y;

  var t = 0.0;
  var result: SDFResult;
  var steps = 0u;
  let maxSteps = uniforms.maxRaySteps;

  for (var i = 0u; i < maxSteps; i++) {
    let p = ray.origin + ray.direction * t;
    result = sceneSDF(p);
    steps = i + 1u;

    // Distance-dependent epsilon: no point in sub-pixel precision
    let eps = max(1e-6, t * pixelSize * 0.5);
    if (result.distance < eps) { break; }
    if (t > MAX_DISTANCE) { break; }

    // Clamp minimum step to a fraction of pixel footprint to prevent
    // thousands of micro-steps near the surface; stepFactor (<1) adds
    // safety margin for non-Lipschitz DEs (set per fractal)
    t += max(result.distance, t * pixelSize * 0.1) * uniforms.stepFactor;
  }

  if (t > MAX_DISTANCE) {
    let bgGrad = uv.y * 0.03;
    return vec4f(vec3f(bgGrad), 1.0);
  }

  let hitPos = ray.origin + ray.direction * t;
  let normalEps = max(0.0005, t * pixelSize);
  let normal = estimateNormal(hitPos, normalEps);
  let stepRatio = f32(steps) / f32(maxSteps);
  let color = computeColor(result, ray, hitPos, t, normal, stepRatio);

  return vec4f(color, 1.0);
}
