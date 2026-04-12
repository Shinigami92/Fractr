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

// Radiosity: every surface emits light proportional to its color
// Multiple random hemisphere samples, no directional light
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

  // Surface emission (its own color as light source)
  let emission = computeColor(result, ray, hitPos, t, normal, stepRatio);

  // Gather incoming radiosity from 4 random hemisphere directions
  let seed0 = fragCoord.xy + vec2f(uniforms.time * 100.0, uniforms.time * 73.0);
  var incoming = vec3f(0.0);
  let numSamples = 4u;

  for (var s = 0u; s < numSamples; s++) {
    let seed = seed0 + vec2f(f32(s) * 37.1, f32(s) * 59.3);
    let dir = randomDir(seed, normal);
    let cosWeight = max(dot(normal, dir), 0.0);

    var sampleT = 0.001;
    var sampleResult: SDFResult;
    var hit = false;
    for (var i = 0u; i < maxSteps / 3u; i++) {
      let p = hitPos + normal * 0.002 + dir * sampleT;
      sampleResult = sceneSDF(p);
      let eps = max(0.0001, sampleT * pixelSize * 0.5);
      if (sampleResult.distance < eps) { hit = true; break; }
      if (sampleT > MAX_DISTANCE) { break; }
      sampleT += max(sampleResult.distance, sampleT * pixelSize * 0.1);
    }

    if (hit) {
      let samplePos = hitPos + normal * 0.002 + dir * sampleT;
      let sampleNormal = estimateNormal(samplePos, max(0.0005, sampleT * pixelSize));
      let sampleColor = computeColor(sampleResult, Ray(hitPos, dir), samplePos, sampleT, sampleNormal, 0.5);
      // Other surface emits light proportional to its color
      incoming = incoming + sampleColor * cosWeight;
    } else {
      // Sky contribution
      incoming = incoming + vec3f(0.02) * cosWeight;
    }
  }

  incoming = incoming / f32(numSamples);

  // Radiosity: soft, even illumination from all surfaces
  let finalColor = emission * 0.3 + incoming * 0.7;

  return vec4f(finalColor, 1.0);
}
