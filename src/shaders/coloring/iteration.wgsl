fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  let iterRatio = f32(result.iterations) / f32(uniforms.maxIterations);
  let anim = f32(uniforms.animatedColors);
  let time = uniforms.time;

  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let ambient = 0.15;

  // Animated: rotating gradient phase
  let phase = iterRatio * 0.8 + anim * time * 0.2;
  let r = 0.5 + 0.5 * cos(6.28318 * (phase + 0.0));
  let g = 0.5 + 0.5 * cos(6.28318 * (phase + 0.33));
  let b = 0.5 + 0.5 * cos(6.28318 * (phase + 0.67));
  let color = vec3f(r, g, b);

  let lit = color * (ambient + diffuse * 0.85);
  let fog = exp(-t * 0.3);
  return lit * fog;
}
