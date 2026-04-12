fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  // Glow: accumulated density from ray steps near the surface
  let glow = stepRatio * stepRatio;

  // Neon color palette based on iteration
  let iterRatio = f32(result.iterations) / f32(uniforms.maxIterations);
  let c1 = vec3f(0.1, 0.4, 1.0); // electric blue
  let c2 = vec3f(1.0, 0.2, 0.6); // hot pink
  let c3 = vec3f(0.2, 1.0, 0.5); // neon green

  let glowColor = mix(c1, c2, iterRatio) + c3 * glow * 0.5;

  // Surface gets bright core, surrounding gets soft glow
  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let rim = 1.0 - max(dot(normal, -ray.direction), 0.0);
  let rimGlow = pow(rim, 3.0);

  let color = glowColor * (0.2 + diffuse * 0.5 + rimGlow * 0.8);

  let fog = exp(-t * 0.2);
  return color * fog;
}
