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

// Soft shadow: march toward light, track closest approach
fn calcSoftShadow(origin: vec3f, lightDir: vec3f, tMin: f32, tMax: f32, k: f32) -> f32 {
  var shadow = 1.0;
  var t = tMin;
  for (var i = 0u; i < 64u; i++) {
    let p = origin + lightDir * t;
    let d = sceneSDF(p).distance;
    if (d < 0.0001) { return 0.0; }
    shadow = min(shadow, k * d / t);
    t += clamp(d, 0.01, 0.2);
    if (t > tMax) { break; }
  }
  return clamp(shadow, 0.0, 1.0);
}

// Ray marching with soft shadows
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
    let eps = max(1e-6, t * pixelSize * 0.5);
    if (result.distance < eps) { break; }
    if (t > MAX_DISTANCE) { break; }
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
  let baseColor = computeColor(result, ray, hitPos, t, normal, stepRatio);

  // Soft shadow from directional light
  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let shadow = calcSoftShadow(hitPos + normal * 0.002, lightDir, 0.01, 10.0, 16.0);

  // Apply shadow: darken shadowed areas but keep enough ambient for cavities
  let shadowed = baseColor * (0.4 + shadow * 0.6);

  return vec4f(shadowed, 1.0);
}
