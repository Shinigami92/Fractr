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

fn marchReflection(origin: vec3f, dir: vec3f, maxSteps: u32, pixelSize: f32) -> vec4f {
  var t = 0.001;
  for (var i = 0u; i < maxSteps; i++) {
    let p = origin + dir * t;
    let d = sceneSDF(p).distance;
    let eps = max(0.0001, t * pixelSize * 0.5);
    if (d < eps) { return vec4f(p, t); }
    if (t > MAX_DISTANCE) { break; }
    t += max(d, t * pixelSize * 0.1);
  }
  return vec4f(0.0, 0.0, 0.0, -1.0);
}

// Ray marching with one reflection bounce
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
  let directColor = computeColor(result, ray, hitPos, t, normal, stepRatio);

  // Reflection
  let reflectDir = reflect(ray.direction, normal);
  let reflectHit = marchReflection(hitPos + normal * 0.002, reflectDir, maxSteps / 2u, pixelSize);

  var reflectColor = vec3f(0.02); // dark sky reflection
  if (reflectHit.w > 0.0) {
    let rNormal = estimateNormal(reflectHit.xyz, max(0.0005, reflectHit.w * pixelSize));
    let rResult = sceneSDF(reflectHit.xyz);
    let rStepRatio = 0.5;
    reflectColor = computeColor(rResult, Ray(hitPos, reflectDir), reflectHit.xyz, reflectHit.w, rNormal, rStepRatio);
  }

  // Fresnel: more reflection at grazing angles
  let cosTheta = max(dot(-ray.direction, normal), 0.0);
  let fresnel = 0.04 + 0.96 * pow(1.0 - cosTheta, 5.0);

  let finalColor = mix(directColor, reflectColor, fresnel * 0.6);
  return vec4f(finalColor, 1.0);
}
