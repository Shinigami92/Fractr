fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  // Stripe pattern from surface position
  let s1 = sin(hitPos.x * 8.0 + hitPos.y * 8.0);
  let s2 = sin(hitPos.y * 8.0 + hitPos.z * 8.0);
  let s3 = sin(hitPos.z * 8.0 + hitPos.x * 8.0);
  let band = clamp((s1 + s2 + s3) / 3.0 * 0.5 + 0.5, 0.0, 1.0);

  // Two-tone palette
  let c1 = vec3f(0.92, 0.78, 0.35); // gold
  let c2 = vec3f(0.12, 0.10, 0.18); // deep purple
  let base = mix(c2, c1, band);

  // Light
  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let lit = base * (0.25 + diffuse * 0.75);

  // Fog
  return lit * exp(-t * 0.3);
}
