fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  let cosTheta = abs(dot(-ray.direction, normal));
  let fresnel = pow(1.0 - cosTheta, 3.0);
  let anim = f32(uniforms.animatedColors);
  let time = uniforms.time;

  // Animated: pulsing edge glow with color cycling
  let pulse = 1.0 + anim * sin(time * 3.0) * 0.3;
  let hue = anim * time * 0.4;
  let core = vec3f(0.02, 0.04, 0.08);
  let edge = vec3f(0.4 + 0.3 * sin(hue), 0.8 - 0.2 * sin(hue + 1.0), 1.0 - 0.3 * sin(hue + 2.0));

  let color = mix(core, edge, fresnel) * pulse;

  let fog = exp(-t * 0.3);
  return color * fog;
}
