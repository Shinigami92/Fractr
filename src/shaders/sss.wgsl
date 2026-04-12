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

// Subsurface scattering approximation
fn calcSSS(p: vec3f, n: vec3f, lightDir: vec3f) -> f32 {
  // March into the surface along the inverse light direction
  let enterPoint = p - n * 0.01;
  var thickness = 0.0;
  for (var i = 1u; i <= 6u; i++) {
    let dist = f32(i) * 0.05;
    let samplePos = enterPoint + lightDir * dist;
    let d = sceneSDF(samplePos).distance;
    thickness += max(0.0, -d); // negative = inside surface
  }
  return exp(-thickness * 8.0);
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
  let stepRatio = f32(steps) / f32(maxSteps);
  let baseColor = computeColor(result, ray, hitPos, t, normal, stepRatio);

  // SSS: light bleeding through thin parts
  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let sss = calcSSS(hitPos, normal, lightDir);

  // Warm translucent color for scattered light
  let sssColor = vec3f(1.0, 0.4, 0.2) * sss * 0.6;

  // Combine: base rendering + translucent backlight
  let backLight = max(dot(-normal, lightDir), 0.0) * sss;
  let finalColor = baseColor + sssColor * backLight;

  let fog = exp(-t * 0.3);
  return vec4f(finalColor * fog, 1.0);
}
