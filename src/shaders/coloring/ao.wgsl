fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  let ao = 1.0 - stepRatio;
  let aoStrength = ao * ao;
  let anim = f32(uniforms.animatedColors);
  let time = uniforms.time;

  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);

  // Animated: warm-to-cool tint cycles
  let shift = anim * time * 0.3;
  let bright = vec3f(0.95 + 0.05 * sin(shift), 0.92, 0.88 - 0.05 * sin(shift));
  let shadow = vec3f(0.12, 0.10 + 0.05 * sin(shift + 2.0), 0.15);
  let color = mix(shadow, bright, aoStrength) * (0.3 + diffuse * 0.7);

  let fog = exp(-t * 0.3);
  return color * fog;
}
