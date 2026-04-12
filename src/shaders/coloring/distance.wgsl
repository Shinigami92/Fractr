fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  let iterRatio = f32(result.iterations) / f32(uniforms.maxIterations);
  let distFactor = clamp(result.minDist * 2.0, 0.0, 1.0);
  let anim = f32(uniforms.animatedColors);
  let time = uniforms.time;

  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let ambient = 0.15;

  // Animated: shifting palette over time
  let shift = anim * time * 0.2;
  let c1 = vec3f(0.486 + 0.2 * sin(shift), 0.231, 0.914 - 0.2 * sin(shift));
  let c2 = vec3f(0.024, 0.714 + 0.2 * sin(shift + 2.0), 0.831);
  let c3 = vec3f(0.969, 0.380 + 0.2 * sin(shift + 4.0), 0.502);

  let color = mix(c1, c2, iterRatio) + c3 * distFactor * 0.3;
  let lit = color * (ambient + diffuse * 0.85);

  let fog = exp(-t * 0.3);
  return lit * fog;
}
