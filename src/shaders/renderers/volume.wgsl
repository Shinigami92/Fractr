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

// Volume rendering: treat the fractal as a density field
@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = fragCoord.xy / uniforms.resolution;
  let ray = rayFromCamera(uv);
  let pixelSize = 2.0 / uniforms.resolution.y;
  let maxSteps = uniforms.maxRaySteps;

  var t = 0.0;
  var accumColor = vec3f(0.0);
  var accumAlpha = 0.0;
  var steps = 0u;
  var lastResult: SDFResult;

  let stepSize = MAX_DISTANCE / f32(maxSteps);

  for (var i = 0u; i < maxSteps; i++) {
    if (accumAlpha > 0.95) { break; }
    if (t > MAX_DISTANCE) { break; }
    steps = i + 1u;

    let p = ray.origin + ray.direction * t;
    let result = sceneSDF(p);
    lastResult = result;

    // Density: high when close to surface, zero when far
    let density = clamp(1.0 - result.distance * 5.0, 0.0, 1.0);

    if (density > 0.01) {
      // Color based on iteration and position
      let iterRatio = f32(result.iterations) / f32(uniforms.maxIterations);
      let distFactor = clamp(result.minDist * 2.0, 0.0, 1.0);

      let c1 = vec3f(0.3, 0.1, 0.6);
      let c2 = vec3f(0.1, 0.5, 0.7);
      let c3 = vec3f(0.9, 0.3, 0.4);
      let sampleColor = mix(c1, c2, iterRatio) + c3 * distFactor * 0.3;

      // Simple lighting from density gradient
      let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
      let gradX = sceneSDF(p + vec3f(0.01, 0.0, 0.0)).distance - result.distance;
      let gradY = sceneSDF(p + vec3f(0.0, 0.01, 0.0)).distance - result.distance;
      let gradZ = sceneSDF(p + vec3f(0.0, 0.0, 0.01)).distance - result.distance;
      let grad = normalize(vec3f(gradX, gradY, gradZ));
      let light = max(dot(grad, lightDir), 0.0) * 0.6 + 0.4;

      let alpha = density * stepSize * 8.0;
      let contrib = sampleColor * light * alpha;
      accumColor = accumColor + contrib * (1.0 - accumAlpha);
      accumAlpha = accumAlpha + alpha * (1.0 - accumAlpha);
    }

    // Adaptive step size: smaller near surface
    t += max(stepSize, result.distance * 0.5);
  }

  // Background blend
  let bgGrad = uv.y * 0.03;
  let bg = vec3f(bgGrad);
  let finalColor = accumColor + bg * (1.0 - accumAlpha);

  return vec4f(finalColor, 1.0);
}
