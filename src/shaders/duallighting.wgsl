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

  // Warm key light (upper right)
  let keyDir = normalize(vec3f(0.6, 0.8, -0.2));
  let keyDiffuse = max(dot(normal, keyDir), 0.0);
  let keyColor = vec3f(1.0, 0.85, 0.7); // warm orange

  // Cool fill light (lower left)
  let fillDir = normalize(vec3f(-0.5, -0.3, 0.4));
  let fillDiffuse = max(dot(normal, fillDir), 0.0);
  let fillColor = vec3f(0.4, 0.5, 0.9); // cool blue

  // Rim light from behind
  let rimDir = normalize(vec3f(0.0, 0.2, 1.0));
  let rim = pow(max(1.0 - dot(-ray.direction, normal), 0.0), 4.0);
  let rimColor = vec3f(0.8, 0.6, 1.0); // purple

  let lit = baseColor * (
    keyColor * keyDiffuse * 0.6 +
    fillColor * fillDiffuse * 0.25 +
    rimColor * rim * 0.3 +
    vec3f(0.08) // ambient
  );

  let fog = exp(-t * 0.3);
  return vec4f(lit * fog, 1.0);
}
