const MAX_DISTANCE = 20.0;

fn estimateNormal(p: vec3f, eps: f32) -> vec3f {
  let e = vec2f(1.0, -1.0) * 0.5773 * eps;
  return normalize(
    e.xyy * sceneSDF(p + e.xyy).distance +
    e.yyx * sceneSDF(p + e.yyx).distance +
    e.yxy * sceneSDF(p + e.yxy).distance +
    e.xxx * sceneSDF(p + e.xxx).distance
  );
}

// Cone marching: track a widening cone instead of a thin ray.
// The cone radius grows with distance, giving natural soft edges
// and approximate ambient occlusion from the cone overlap ratio.
@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = fragCoord.xy / uniforms.resolution;
  let ray = rayFromCamera(uv);

  let pixelSize = 2.0 / uniforms.resolution.y;
  // Cone half-angle: one pixel wide at distance 1
  let coneAngle = pixelSize * 0.5;

  var t = 0.0;
  var result: SDFResult;
  var steps = 0u;
  let maxSteps = uniforms.maxRaySteps;

  // Track how much of the cone is "filled" by geometry
  var coneOcclusion = 0.0;

  for (var i = 0u; i < maxSteps; i++) {
    let p = ray.origin + ray.direction * t;
    result = sceneSDF(p);
    steps = i + 1u;

    // Cone radius at current distance
    let coneRadius = t * coneAngle;

    // How much of the cone cross-section is filled by the SDF surface
    // If SDF distance < cone radius, the surface intersects the cone
    let overlap = clamp(1.0 - result.distance / max(coneRadius, 0.0001), 0.0, 1.0);
    coneOcclusion = max(coneOcclusion, overlap);

    // Distance-dependent epsilon with cone awareness
    let eps = max(0.0001, coneRadius * 0.5);
    if (result.distance < eps) { break; }
    if (t > MAX_DISTANCE) { break; }

    // Step by SDF distance, clamped to cone-aware minimum
    t += max(result.distance, t * pixelSize * 0.1) * uniforms.stepFactor;
  }

  if (t > MAX_DISTANCE) {
    let bgGrad = uv.y * 0.03;
    return vec4f(vec3f(bgGrad), 1.0);
  }

  let hitPos = ray.origin + ray.direction * t;
  let normalEps = max(0.0005, t * pixelSize);
  let normal = estimateNormal(hitPos, normalEps);

  // Use cone occlusion as a soft shadow / edge softening factor
  // stepRatio is blended with cone occlusion for richer AO
  let stepRatio = f32(steps) / f32(maxSteps);
  let combinedRatio = mix(stepRatio, 1.0 - coneOcclusion, 0.3);
  let color = computeColor(result, ray, hitPos, t, normal, combinedRatio);

  // Soft edge: fade at cone boundary for anti-aliased silhouettes
  let edgeFade = clamp(coneOcclusion * 2.0, 0.0, 1.0);
  let finalColor = color * edgeFade;

  return vec4f(finalColor, 1.0);
}
