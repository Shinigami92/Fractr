fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  // Pure depth gradient: white close, black far
  let maxDist = 10.0;
  let depth = 1.0 - clamp(t / maxDist, 0.0, 1.0);
  let d = depth * depth; // Quadratic for more contrast

  return vec3f(d);
}
