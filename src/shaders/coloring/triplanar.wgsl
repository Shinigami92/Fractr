fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  // Triplanar: project RGB along world axes, blend by normal
  let blend = abs(normal);
  let b = blend / (blend.x + blend.y + blend.z); // Normalize weights

  let xColor = vec3f(0.9, 0.2, 0.2); // red = X-facing
  let yColor = vec3f(0.2, 0.9, 0.2); // green = Y-facing
  let zColor = vec3f(0.2, 0.2, 0.9); // blue = Z-facing
  let color = xColor * b.x + yColor * b.y + zColor * b.z;

  // Light
  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let lit = color * (0.2 + diffuse * 0.8);

  let fog = exp(-t * 0.3);
  return lit * fog;
}
