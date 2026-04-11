const EPSILON = 0.0001;
const MAX_DISTANCE = 20.0;

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = fragCoord.xy / uniforms.resolution;
  let ray = rayFromCamera(uv);

  var t = 0.0;
  var result: SDFResult;
  let maxSteps = uniforms.maxRaySteps;

  for (var i = 0u; i < maxSteps; i++) {
    let p = ray.origin + ray.direction * t;
    result = sceneSDF(p);

    if (result.distance < EPSILON) { break; }
    if (t > MAX_DISTANCE) { break; }

    t += result.distance;
  }

  if (t > MAX_DISTANCE) {
    // Background: subtle gradient
    let bgGrad = uv.y * 0.03;
    return vec4f(vec3f(bgGrad), 1.0);
  }

  let hitPos = ray.origin + ray.direction * t;
  let color = computeColor(result, ray, hitPos, t);

  return vec4f(color, 1.0);
}
