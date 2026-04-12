fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  let iterRatio = f32(result.iterations) / f32(uniforms.maxIterations);
  let anim = f32(uniforms.animatedColors);
  let time = uniforms.time;

  // Animated: heat wave ripple
  let wave = iterRatio + anim * sin(iterRatio * 10.0 + time * 2.0) * 0.1;
  let r = clamp(wave * 3.0, 0.0, 1.0);
  let g = clamp(wave * 3.0 - 1.0, 0.0, 1.0);
  let b = clamp(wave * 3.0 - 2.0, 0.0, 1.0);
  let color = vec3f(r, g * 0.8, b * 0.6);

  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let lit = color * (0.15 + diffuse * 0.85);

  let fog = exp(-t * 0.3);
  return lit * fog;
}
