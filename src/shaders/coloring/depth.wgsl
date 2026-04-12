fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  let anim = f32(uniforms.animatedColors);
  let time = uniforms.time;

  let maxDist = 10.0;
  let depth = 1.0 - clamp(t / maxDist, 0.0, 1.0);
  let d = depth * depth;

  // Animated: pulsing depth bands
  let bands = d + anim * sin(d * 20.0 + time * 2.0) * 0.08;
  let clamped = clamp(bands, 0.0, 1.0);

  return vec3f(clamped);
}
