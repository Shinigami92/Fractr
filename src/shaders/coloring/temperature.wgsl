fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  // Blackbody radiation palette based on iteration count
  let iterRatio = f32(result.iterations) / f32(uniforms.maxIterations);

  // Blackbody: black → red → orange → yellow → white
  let r = clamp(iterRatio * 3.0, 0.0, 1.0);
  let g = clamp(iterRatio * 3.0 - 1.0, 0.0, 1.0);
  let b = clamp(iterRatio * 3.0 - 2.0, 0.0, 1.0);
  let color = vec3f(r, g * 0.8, b * 0.6);

  // Light
  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let lit = color * (0.15 + diffuse * 0.85);

  let fog = exp(-t * 0.3);
  return lit * fog;
}
