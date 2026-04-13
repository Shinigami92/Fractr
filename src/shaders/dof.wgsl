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

fn hash2(p: vec2f) -> vec2f {
  let h = vec2f(dot(p, vec2f(127.1, 311.7)), dot(p, vec2f(269.5, 183.3)));
  return fract(sin(h) * 43758.5453);
}

// Depth of field: jitter ray origin on a lens disk
@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = fragCoord.xy / uniforms.resolution;
  let ray = rayFromCamera(uv);
  let pixelSize = 2.0 / uniforms.resolution.y;
  let maxSteps = uniforms.maxRaySteps;

  // Auto-focus: nearest surface distance from camera
  let focalDist = max(sceneSDF(ray.origin).distance, 0.1);
  // Aperture scales with focal distance for consistent blur ratio
  let aperture = focalDist * 0.02;

  // Jitter on lens disk using time-based hash for temporal accumulation
  let seed = fragCoord.xy + vec2f(uniforms.time * 137.0, uniforms.time * 73.0);
  let rng = hash2(seed);
  let angle = rng.x * 6.28318;
  let radius = sqrt(rng.y) * aperture;
  let lensOffset = vec2f(cos(angle), sin(angle)) * radius;

  // Compute focus point along original ray
  let focusPoint = ray.origin + ray.direction * focalDist;

  // Build right/up vectors from ray direction
  var up = vec3f(0.0, 1.0, 0.0);
  let right = normalize(cross(ray.direction, up));
  up = cross(right, ray.direction);

  // New ray from offset lens position toward focus point
  let newOrigin = ray.origin + right * lensOffset.x + up * lensOffset.y;
  let newDir = normalize(focusPoint - newOrigin);

  var t = 0.0;
  var result: SDFResult;
  var steps = 0u;

  for (var i = 0u; i < maxSteps; i++) {
    let p = newOrigin + newDir * t;
    result = sceneSDF(p);
    steps = i + 1u;
    let eps = max(1e-6, t * pixelSize * 0.5);
    if (result.distance < eps) { break; }
    if (t > MAX_DISTANCE) { break; }
    t += max(result.distance, t * pixelSize * 0.1);
  }

  if (t > MAX_DISTANCE) {
    let bgGrad = uv.y * 0.03;
    return vec4f(vec3f(bgGrad), 1.0);
  }

  let hitPos = newOrigin + newDir * t;
  let normalEps = max(0.0005, t * pixelSize);
  let normal = estimateNormal(hitPos, normalEps);
  let stepRatio = f32(steps) / f32(maxSteps);
  let color = computeColor(result, Ray(newOrigin, newDir), hitPos, t, normal, stepRatio);

  return vec4f(color, 1.0);
}
