fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  // Map normal direction to RGB: X=red, Y=green, Z=blue
  let color = normal * 0.5 + 0.5;

  let fog = exp(-t * 0.3);
  return color * fog;
}
