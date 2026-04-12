fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  let trap = result.minDist;
  let iterRatio = f32(result.iterations) / f32(uniforms.maxIterations);
  let anim = f32(uniforms.animatedColors);
  let time = uniforms.time;

  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let ambient = 0.15;

  // Animated: rotating trap phase
  let phase = trap * 6.0 + anim * time * 1.2;
  let r = 0.5 + 0.5 * sin(phase + 0.0);
  let g = 0.5 + 0.5 * sin(phase + 2.1);
  let b = 0.5 + 0.5 * sin(phase + 4.2);
  let color = vec3f(r, g, b) * (0.5 + iterRatio * 0.5);

  let lit = color * (ambient + diffuse * 0.85);
  let fog = exp(-t * 0.3);
  return lit * fog;
}
