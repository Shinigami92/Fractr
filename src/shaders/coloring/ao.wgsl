fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  // Ambient occlusion: more ray steps = more occluded = darker
  let ao = 1.0 - stepRatio;
  let aoStrength = ao * ao; // Quadratic falloff for more contrast

  // Simple directional light
  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);

  // Warm-to-cool AO tint
  let bright = vec3f(0.95, 0.92, 0.88);
  let shadow = vec3f(0.12, 0.10, 0.15);
  let color = mix(shadow, bright, aoStrength) * (0.3 + diffuse * 0.7);

  let fog = exp(-t * 0.3);
  return color * fog;
}
