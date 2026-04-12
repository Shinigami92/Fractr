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

// Soft shadow for god rays
fn calcShadow(origin: vec3f, dir: vec3f) -> f32 {
  var shadow = 1.0;
  var t = 0.01;
  for (var i = 0u; i < 32u; i++) {
    let d = sceneSDF(origin + dir * t).distance;
    if (d < 0.0001) { return 0.0; }
    shadow = min(shadow, 8.0 * d / t);
    t += clamp(d, 0.01, 0.3);
    if (t > 10.0) { break; }
  }
  return clamp(shadow, 0.0, 1.0);
}

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = fragCoord.xy / uniforms.resolution;
  let ray = rayFromCamera(uv);
  let pixelSize = 2.0 / uniforms.resolution.y;

  let lightDir = normalize(vec3f(0.5, 0.8, -0.3));
  let lightColor = vec3f(1.0, 0.9, 0.7);

  // Accumulate volumetric fog along the ray (god rays)
  var fogAccum = vec3f(0.0);
  let fogSteps = 32u;
  let fogStepSize = MAX_DISTANCE / f32(fogSteps);

  for (var i = 0u; i < fogSteps; i++) {
    let fogT = f32(i) * fogStepSize;
    let fogPos = ray.origin + ray.direction * fogT;
    let shadow = calcShadow(fogPos, lightDir);
    let fogDensity = 0.015;
    let extinction = exp(-fogT * 0.1);
    fogAccum = fogAccum + lightColor * shadow * fogDensity * extinction;
  }

  // Primary ray march
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
    return vec4f(vec3f(bgGrad) + fogAccum, 1.0);
  }

  let hitPos = ray.origin + ray.direction * t;
  let normalEps = max(0.0005, t * pixelSize);
  let normal = estimateNormal(hitPos, normalEps);
  let stepRatio = f32(steps) / f32(maxSteps);
  let surfaceColor = computeColor(result, ray, hitPos, t, normal, stepRatio);

  // Blend surface with fog
  let fogBlend = 1.0 - exp(-t * 0.15);
  let fogColor = vec3f(0.05, 0.03, 0.08);
  let finalColor = mix(surfaceColor, fogColor, fogBlend) + fogAccum;

  return vec4f(finalColor, 1.0);
}
