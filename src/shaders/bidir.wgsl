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

  var tangent: vec3f;
  if (abs(normal.x) < 0.9) {
    tangent = normalize(cross(vec3f(1.0, 0.0, 0.0), normal));
  } else {
    tangent = normalize(cross(vec3f(0.0, 1.0, 0.0), normal));
  }
  let bitangent = cross(normal, tangent);
  return normalize(tangent * r * cos(theta) + bitangent * r * sin(theta) + normal * sqrt(1.0 - r2));
}

// Soft shadow for light path
fn calcSoftShadow(origin: vec3f, lightDir: vec3f) -> f32 {
  var shadow = 1.0;
  var t = 0.01;
  for (var i = 0u; i < 48u; i++) {
    let d = sceneSDF(origin + lightDir * t).distance;
    if (d < 0.0001) { return 0.0; }
    shadow = min(shadow, 12.0 * d / t);
    t += clamp(d, 0.01, 0.2);
    if (t > 10.0) { break; }
  }
  return clamp(shadow, 0.0, 1.0);
}

// Bidirectional path tracing: trace from camera AND from light, connect
@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = fragCoord.xy / uniforms.resolution;
  let ray = rayFromCamera(uv);
  let pixelSize = 2.0 / uniforms.resolution.y;
  let maxSteps = uniforms.maxRaySteps;
  let seed0 = fragCoord.xy + vec2f(uniforms.time * 100.0, uniforms.time * 57.0);

  let lightDir = normalize(vec3f(0.5, 0.8, -0.3));
  let lightColor = vec3f(1.2, 1.05, 0.9);

  // Camera path: primary ray hit
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
  let surfaceColor = computeColor(result, ray, hitPos, t, normal, stepRatio);

  // Camera path: one random bounce
  let seed1 = seed0 + vec2f(17.3, 91.7);
  let bounceDir = randomDir(seed1, normal);
  let bounceCos = max(dot(normal, bounceDir), 0.0);

  var bounceContrib = vec3f(0.0);
  var bounceT = 0.001;
  for (var i = 0u; i < maxSteps / 3u; i++) {
    let p = hitPos + normal * 0.002 + bounceDir * bounceT;
    let d = sceneSDF(p).distance;
    let eps = max(1e-6, bounceT * pixelSize * 0.5);
    if (d < eps) {
      let bp = hitPos + normal * 0.002 + bounceDir * bounceT;
      let bn = estimateNormal(bp, max(0.0005, bounceT * pixelSize));
      let br = sceneSDF(bp);
      bounceContrib = computeColor(br, Ray(hitPos, bounceDir), bp, bounceT, bn, 0.5) * bounceCos;
      break;
    }
    if (bounceT > MAX_DISTANCE) { break; }
    bounceT += max(d, bounceT * pixelSize * 0.1);
  }

  // Light path: direct illumination with soft shadow
  let directLight = max(dot(normal, lightDir), 0.0);
  let shadow = calcSoftShadow(hitPos + normal * 0.002, lightDir);
  let directContrib = surfaceColor * lightColor * directLight * shadow;

  // Light path: one random bounce from light direction
  let lightHitSeed = seed0 + vec2f(113.7, 43.1);
  let lightBounceDir = randomDir(lightHitSeed, -lightDir);
  var lightBounceContrib = vec3f(0.0);

  var lightT = 0.001;
  let lightOrigin = hitPos + normal * 0.002;
  for (var i = 0u; i < maxSteps / 4u; i++) {
    let p = lightOrigin + lightBounceDir * lightT;
    let d = sceneSDF(p).distance;
    if (d < 0.001) {
      let lp = lightOrigin + lightBounceDir * lightT;
      let ln = estimateNormal(lp, 0.001);
      // Check if this light-bounced point can see our hit point
      let toHit = normalize(hitPos - lp);
      let vis = max(dot(ln, toHit), 0.0);
      lightBounceContrib = lightColor * 0.3 * vis;
      break;
    }
    if (lightT > 10.0) { break; }
    lightT += max(d, 0.01);
  }

  // Combine: direct + camera bounce + light bounce
  let finalColor = directContrib * 0.5 + bounceContrib * 0.3 + lightBounceContrib * surfaceColor * 0.2;

  return vec4f(finalColor, 1.0);
}
