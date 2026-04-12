fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  let blend = abs(normal);
  let b = blend / (blend.x + blend.y + blend.z);
  let anim = f32(uniforms.animatedColors);
  let time = uniforms.time;

  // Animated: rotating axis colors
  let shift = anim * time * 0.5;
  let xColor = vec3f(0.9, 0.2 + 0.3 * sin(shift), 0.2);
  let yColor = vec3f(0.2, 0.9, 0.2 + 0.3 * sin(shift + 2.0));
  let zColor = vec3f(0.2 + 0.3 * sin(shift + 4.0), 0.2, 0.9);
  let color = xColor * b.x + yColor * b.y + zColor * b.z;

  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let lit = color * (0.2 + diffuse * 0.8);

  let fog = exp(-t * 0.3);
  return lit * fog;
}
