fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  // Fresnel: bright at glancing angles, dark head-on
  let cosTheta = abs(dot(-ray.direction, normal));
  let fresnel = pow(1.0 - cosTheta, 3.0);

  // X-ray / hologram palette
  let core = vec3f(0.02, 0.04, 0.08);
  let edge = vec3f(0.4, 0.8, 1.0);
  let color = mix(core, edge, fresnel);

  let fog = exp(-t * 0.3);
  return color * fog;
}
