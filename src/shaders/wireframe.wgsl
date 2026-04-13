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
    let eps = max(1e-6, t * pixelSize * 0.5);
    if (result.distance < eps) { break; }
    if (t > MAX_DISTANCE) { break; }
    t += max(result.distance, t * pixelSize * 0.1);
  }

  if (t > MAX_DISTANCE) {
    let bgGrad = uv.y * 0.02;
    return vec4f(vec3f(bgGrad), 1.0);
  }

  let hitPos = ray.origin + ray.direction * t;
  let normalEps = max(0.0005, t * pixelSize);
  let normal = estimateNormal(hitPos, normalEps);

  // Edge detection via normal discontinuity
  let eps2 = normalEps * 2.0;
  let n1 = estimateNormal(hitPos + vec3f(eps2, 0.0, 0.0), normalEps);
  let n2 = estimateNormal(hitPos + vec3f(0.0, eps2, 0.0), normalEps);
  let n3 = estimateNormal(hitPos + vec3f(0.0, 0.0, eps2), normalEps);

  let edgeX = 1.0 - dot(normal, n1);
  let edgeY = 1.0 - dot(normal, n2);
  let edgeZ = 1.0 - dot(normal, n3);
  let edge = clamp((edgeX + edgeY + edgeZ) * 15.0, 0.0, 1.0);

  // Silhouette edge from viewing angle
  let silhouette = 1.0 - abs(dot(normal, -ray.direction));
  let silEdge = clamp(pow(silhouette, 3.0) * 5.0, 0.0, 1.0);

  let totalEdge = clamp(edge + silEdge, 0.0, 1.0);

  // Blueprint style: bright edges on dark surface
  let edgeColor = vec3f(0.3, 0.8, 1.0);
  let surfaceColor = vec3f(0.02, 0.03, 0.05);
  let finalColor = mix(surfaceColor, edgeColor, totalEdge);

  let fog = exp(-t * 0.3);
  return vec4f(finalColor * fog, 1.0);
}
