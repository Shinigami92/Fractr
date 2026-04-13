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

  var tangent: vec3f;
  if (abs(normal.x) < 0.9) {
    tangent = normalize(cross(vec3f(1.0, 0.0, 0.0), normal));
  } else {
    tangent = normalize(cross(vec3f(0.0, 1.0, 0.0), normal));
  }
  let bitangent = cross(normal, tangent);
  return normalize(tangent * x + bitangent * y + normal * z);
}

struct HitInfo {
  hit: bool,
  pos: vec3f,
  normal: vec3f,
  t: f32,
  result: SDFResult,
}

fn marchRay(origin: vec3f, dir: vec3f, maxSteps: u32, pixelSize: f32) -> HitInfo {
  var t = 0.001;
  var result: SDFResult;
  for (var i = 0u; i < maxSteps; i++) {
    let p = origin + dir * t;
    result = sceneSDF(p);
    let eps = max(1e-6, t * pixelSize * 0.5);
    if (result.distance < eps) {
      let n = estimateNormal(p, max(0.0005, t * pixelSize));
      return HitInfo(true, p, n, t, result);
    }
    if (t > MAX_DISTANCE) { break; }
    t += max(result.distance, t * pixelSize * 0.1) * uniforms.stepFactor;
  }
  return HitInfo(false, vec3f(0.0), vec3f(0.0), -1.0, result);
}

// Multi-bounce GI: 3 bounces for rich color bleeding and indirect light
@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = fragCoord.xy / uniforms.resolution;
  let ray = rayFromCamera(uv);
  let pixelSize = 2.0 / uniforms.resolution.y;
  let maxSteps = uniforms.maxRaySteps;
  let seed0 = fragCoord.xy + vec2f(uniforms.time * 100.0, uniforms.time * 57.0);

  // Primary ray
  let hit0 = marchRay(ray.origin, ray.direction, maxSteps, pixelSize);
  if (!hit0.hit) {
    let bgGrad = uv.y * 0.03;
    return vec4f(vec3f(bgGrad), 1.0);
  }

  let stepRatio = 0.3;
  let directColor = computeColor(hit0.result, ray, hit0.pos, hit0.t, hit0.normal, stepRatio);

  // Bounce 1
  let seed1 = seed0 + vec2f(17.3, 91.7);
  let dir1 = randomDir(seed1, hit0.normal);
  let hit1 = marchRay(hit0.pos + hit0.normal * 0.002, dir1, maxSteps / 3u, pixelSize);

  var bounce1Color = vec3f(0.03);
  if (hit1.hit) {
    bounce1Color = computeColor(hit1.result, Ray(hit0.pos, dir1), hit1.pos, hit1.t, hit1.normal, 0.5);

    // Bounce 2
    let seed2 = seed0 + vec2f(43.1, 137.9);
    let dir2 = randomDir(seed2, hit1.normal);
    let hit2 = marchRay(hit1.pos + hit1.normal * 0.002, dir2, maxSteps / 4u, pixelSize);

    if (hit2.hit) {
      let bounce2Color = computeColor(hit2.result, Ray(hit1.pos, dir2), hit2.pos, hit2.t, hit2.normal, 0.5);

      // Bounce 3
      let seed3 = seed0 + vec2f(79.3, 211.1);
      let dir3 = randomDir(seed3, hit2.normal);
      let hit3 = marchRay(hit2.pos + hit2.normal * 0.002, dir3, maxSteps / 6u, pixelSize);

      var bounce3Color = vec3f(0.02);
      if (hit3.hit) {
        bounce3Color = computeColor(hit3.result, Ray(hit2.pos, dir3), hit3.pos, hit3.t, hit3.normal, 0.5);
      }

      bounce1Color = bounce1Color + bounce2Color * max(dot(hit1.normal, dir2), 0.0) * 0.5;
      bounce1Color = bounce1Color + bounce3Color * max(dot(hit2.normal, dir3), 0.0) * 0.25;
    }
  }

  let indirectLight = bounce1Color * max(dot(hit0.normal, dir1), 0.0);
  let finalColor = directColor * 0.5 + indirectLight * 0.5;

  return vec4f(finalColor, 1.0);
}
