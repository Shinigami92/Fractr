fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  let glow = stepRatio * stepRatio;
  let iterRatio = f32(result.iterations) / f32(uniforms.maxIterations);
  let time = uniforms.time;
  let anim = f32(uniforms.animatedColors);

  // Neon color palette — animated: cycling hue shift
  let hueShift = anim * time * 0.3;
  let c1 = vec3f(0.1 + 0.4 * sin(hueShift), 0.4, 1.0 - 0.3 * sin(hueShift));
  let c2 = vec3f(1.0, 0.2 + 0.3 * sin(hueShift + 2.0), 0.6);
  let c3 = vec3f(0.2, 1.0 - 0.3 * sin(hueShift + 4.0), 0.5);

  let pulse = 1.0 + anim * sin(time * 2.0) * 0.15;
  let glowColor = mix(c1, c2, iterRatio) + c3 * glow * 0.5;

  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let rim = 1.0 - max(dot(normal, -ray.direction), 0.0);
  let rimGlow = pow(rim, 3.0);

  let color = glowColor * (0.2 + diffuse * 0.5 + rimGlow * 0.8) * pulse;

  let fog = exp(-t * 0.2);
  return color * fog;
}
