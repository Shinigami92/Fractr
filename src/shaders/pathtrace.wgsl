const MAX_DISTANCE = 20.0;
const PI = 3.14159265;

fn estimateNormal(p: vec3f, eps: f32) -> vec3f {
  let e = vec2f(1.0, -1.0) * 0.5773 * eps;
  return normalize(
    e.xyy * sceneSDF(p + e.xyy).distance +
    e.yyx * sceneSDF(p + e.yyx).distance +
    e.yxy * sceneSDF(p + e.yxy).distance +
    e.xxx * sceneSDF(p + e.xxx).distance
  );
}

// Hash function for pseudo-random numbers
fn hash(p: vec2f) -> f32 {
  let h = dot(p, vec2f(127.1, 311.7));
  return fract(sin(h) * 43758.5453);
}

fn randomDir(seed: vec2f, normal: vec3f) -> vec3f {
  let r1 = hash(seed);
  let r2 = hash(seed + vec2f(73.1, 19.3));
  let theta = 2.0 * PI * r1;
  let r = sqrt(r2);
  let x = r * cos(theta);
  let y = r * sin(theta);
  let z = sqrt(1.0 - r2);

  // Build tangent space from normal
  var tangent: vec3f;
  if (abs(normal.x) < 0.9) {
    tangent = normalize(cross(vec3f(1.0, 0.0, 0.0), normal));
  } else {
    tangent = normalize(cross(vec3f(0.0, 1.0, 0.0), normal));
  }
  let bitangent = cross(normal, tangent);

  return normalize(tangent * x + bitangent * y + normal * z);
}

fn marchRay(origin: vec3f, dir: vec3f, maxSteps: u32, pixelSize: f32) -> vec4f {
  // Returns vec4(hitPos, t) or vec4(0) if miss
  var t = 0.001;
  for (var i = 0u; i < maxSteps; i++) {
    let p = origin + dir * t;
    let d = sceneSDF(p).distance;
    let eps = max(1e-6, t * pixelSize * 0.5);
    if (d < eps) { return vec4f(p, t); }
    if (t > MAX_DISTANCE) { break; }
    t += max(d, t * pixelSize * 0.1) * uniforms.stepFactor;
  }
  return vec4f(0.0, 0.0, 0.0, -1.0);
}

// Path tracing: primary ray + one bounce for global illumination
@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = fragCoord.xy / uniforms.resolution;
  let ray = rayFromCamera(uv);
  let pixelSize = 2.0 / uniforms.resolution.y;
  let maxSteps = uniforms.maxRaySteps;

  var t = 0.0;
  var result: SDFResult;
  var steps = 0u;

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
  let directColor = computeColor(result, ray, hitPos, t, normal, stepRatio);

  // One-bounce GI: cast a random ray from the hit point
  let seed = fragCoord.xy + vec2f(uniforms.time * 100.0);
  let bounceDir = randomDir(seed, normal);
  let bounceHit = marchRay(hitPos + normal * 0.002, bounceDir, maxSteps / 2u, pixelSize);

  var indirectLight = vec3f(0.05); // sky ambient
  if (bounceHit.w > 0.0) {
    let bounceNormal = estimateNormal(bounceHit.xyz, max(0.0005, bounceHit.w * pixelSize));
    let bounceResult = sceneSDF(bounceHit.xyz);
    let bounceColor = computeColor(bounceResult, Ray(hitPos, bounceDir), bounceHit.xyz, bounceHit.w, bounceNormal, 0.5);
    indirectLight = bounceColor * max(dot(normal, bounceDir), 0.0);
  }

  let finalColor = directColor * 0.7 + indirectLight * 0.3;
  return vec4f(finalColor, 1.0);
}
