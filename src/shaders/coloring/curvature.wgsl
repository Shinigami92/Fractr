fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  let eps = max(0.001, t * 0.002);
  let dn = sceneSDF(hitPos + normal * eps).distance - sceneSDF(hitPos - normal * eps).distance;
  let curvature = dn / (2.0 * eps);
  let anim = f32(uniforms.animatedColors);
  let time = uniforms.time;

  // Animated: oscillating color mapping
  let shift = anim * time * 0.4;
  let concave = vec3f(0.15 + 0.1 * sin(shift), 0.25, 0.9 - 0.1 * sin(shift));
  let flat = vec3f(0.85, 0.85, 0.85);
  let convex = vec3f(0.95, 0.55 + 0.1 * sin(shift + 2.0), 0.15);

  let k = clamp(curvature * 2.0, -1.0, 1.0);
  var color: vec3f;
  if (k < 0.0) {
    color = mix(flat, concave, -k);
  } else {
    color = mix(flat, convex, k);
  }

  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  color = color * (0.3 + diffuse * 0.7);

  let fog = exp(-t * 0.3);
  return color * fog;
}
