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

fn marchRayHit(origin: vec3f, dir: vec3f, maxSteps: u32, pixelSize: f32) -> vec4f {
  var t = 0.001;
  for (var i = 0u; i < maxSteps; i++) {
    let p = origin + dir * t;
    let d = sceneSDF(p).distance;
    let eps = max(1e-6, t * pixelSize * 0.5);
    if (d < eps) { return vec4f(p, t); }
    if (t > MAX_DISTANCE) { break; }
    t += max(d, t * pixelSize * 0.1);
  }
  return vec4f(0.0, 0.0, 0.0, -1.0);
}

// Soft shadow for direct lighting
fn calcShadow(origin: vec3f, lightDir: vec3f) -> f32 {
  var shadow = 1.0;
  var t = 0.01;
  for (var i = 0u; i < 32u; i++) {
    let d = sceneSDF(origin + lightDir * t).distance;
    if (d < 0.0001) { return 0.0; }
    shadow = min(shadow, 10.0 * d / t);
    t += clamp(d, 0.01, 0.2);
    if (t > 10.0) { break; }
  }
  return clamp(shadow, 0.0, 1.0);
}

// Fresnel reflectance (Schlick approximation)
fn fresnelSchlick(cosTheta: f32, ior: f32) -> f32 {
  let r0 = pow((1.0 - ior) / (1.0 + ior), 2.0);
  return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
}

// Whitted ray tracing: reflection + refraction + shadow
@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = fragCoord.xy / uniforms.resolution;
  let ray = rayFromCamera(uv);
  let pixelSize = 2.0 / uniforms.resolution.y;
  let maxSteps = uniforms.maxRaySteps;
  let lightDir = normalize(vec3f(0.5, 0.8, -0.3));
  let lightColor = vec3f(1.1, 1.0, 0.9);
  let ior = 1.45; // glass-like index of refraction

  // Primary ray
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

  // Fresnel: determines reflection vs refraction ratio
  let cosI = max(dot(-ray.direction, normal), 0.0);
  let fresnel = fresnelSchlick(cosI, ior);

  // 1. Direct illumination with shadow
  let diffuse = max(dot(normal, lightDir), 0.0);
  let shadow = calcShadow(hitPos + normal * 0.002, lightDir);
  let specDir = reflect(-lightDir, normal);
  let specular = pow(max(dot(specDir, -ray.direction), 0.0), 32.0);
  let directLight = surfaceColor * lightColor * diffuse * shadow + lightColor * specular * shadow * 0.3;

  // 2. Reflection ray
  let reflectDir = reflect(ray.direction, normal);
  let reflectHit = marchRayHit(hitPos + normal * 0.002, reflectDir, maxSteps / 2u, pixelSize);
  var reflectColor = vec3f(0.02);
  if (reflectHit.w > 0.0) {
    let rn = estimateNormal(reflectHit.xyz, max(0.0005, reflectHit.w * pixelSize));
    let rr = sceneSDF(reflectHit.xyz);
    reflectColor = computeColor(rr, Ray(hitPos, reflectDir), reflectHit.xyz, reflectHit.w, rn, 0.5);
    let rd = max(dot(rn, lightDir), 0.0);
    reflectColor = reflectColor * (0.2 + rd * 0.8) * exp(-reflectHit.w * 0.3);
  }

  // 3. Refraction ray (bend through surface)
  let refractDir = refract(ray.direction, normal, 1.0 / ior);
  var refractColor = vec3f(0.01, 0.02, 0.03);
  if (length(refractDir) > 0.0) {
    // March inside the fractal
    let refractHit = marchRayHit(hitPos - normal * 0.003, refractDir, maxSteps / 3u, pixelSize);
    if (refractHit.w > 0.0) {
      let rn2 = estimateNormal(refractHit.xyz, max(0.0005, refractHit.w * pixelSize));
      let rr2 = sceneSDF(refractHit.xyz);
      refractColor = computeColor(rr2, Ray(hitPos, refractDir), refractHit.xyz, refractHit.w, rn2, 0.5);
      // Absorption: deeper = more tinted
      let absorption = exp(-refractHit.w * vec3f(0.8, 0.4, 0.2));
      refractColor = refractColor * absorption;
    }
  }

  // Combine: Fresnel blend between reflection and refraction + direct light
  let indirectColor = mix(refractColor, reflectColor, fresnel);
  let finalColor = directLight * 0.4 + indirectColor * 0.6;

  return vec4f(finalColor, 1.0);
}
