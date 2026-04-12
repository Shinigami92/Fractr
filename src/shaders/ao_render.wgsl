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

// Multi-sample ambient occlusion: probe along normal for occlusion
fn calcAO(p: vec3f, n: vec3f) -> f32 {
  var ao = 0.0;
  var weight = 1.0;
  for (var i = 1u; i <= 5u; i++) {
    let dist = f32(i) * 0.05;
    let samplePos = p + n * dist;
    let d = sceneSDF(samplePos).distance;
    ao += weight * (dist - d);
    weight *= 0.5;
  }
  return clamp(1.0 - ao * 10.0, 0.0, 1.0);
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = fragCoord.xy / uniforms.resolution;
  let ray = rayFromCamera(uv);
  let pixelSize = 2.0 / uniforms.resolution.y;

  var t = 0.0;
  var result: SDFResult;
  var steps = 0u;
  let maxSteps = uniforms.maxRaySteps;

  for (var i = 0u; i < maxSteps; i++) {
    let p = ray.origin + ray.direction * t;
    result = sceneSDF(p);
    steps = i + 1u;
    let eps = max(0.0001, t * pixelSize * 0.5);
    if (result.distance < eps) { break; }
    if (t > MAX_DISTANCE) { break; }
    t += max(result.distance, t * pixelSize * 0.1);
  }

  if (t > MAX_DISTANCE) {
    let bgGrad = uv.y * 0.03;
    return vec4f(vec3f(bgGrad), 1.0);
  }

  let hitPos = ray.origin + ray.direction * t;
  let normalEps = max(0.0005, t * pixelSize);
  let normal = estimateNormal(hitPos, normalEps);

  // Multi-sample AO
  let ao = calcAO(hitPos + normal * 0.001, normal);

  let stepRatio = f32(steps) / f32(maxSteps);
  let baseColor = computeColor(result, ray, hitPos, t, normal, stepRatio);

  // Apply AO: darken occluded areas
  let finalColor = baseColor * (ao * 0.8 + 0.2);

  return vec4f(finalColor, 1.0);
}
