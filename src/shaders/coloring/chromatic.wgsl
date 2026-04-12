fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  // Rainbow spectrum from surface position — iridescent / oil-slick
  let phase = dot(hitPos, vec3f(3.0, 5.0, 7.0));
  let r = sin(phase) * 0.5 + 0.5;
  let g = sin(phase + 2.094) * 0.5 + 0.5; // +2π/3
  let b = sin(phase + 4.189) * 0.5 + 0.5; // +4π/3
  let color = vec3f(r, g, b);

  // Light
  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let lit = color * (0.2 + diffuse * 0.8);

  let fog = exp(-t * 0.3);
  return lit * fog;
}
