fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  let anim = f32(uniforms.animatedColors);
  let time = uniforms.time;

  // Use unshifted world position so bands don't jump when the renderer
  // snaps the origin for periodic SDFs (see Renderer.updateUniforms).
  let worldHitPos = hitPos + uniforms.originOffset;

  // Animated: moving bands
  let offset = anim * time * 0.5;
  let s1 = sin(worldHitPos.x * 8.0 + worldHitPos.y * 8.0 + offset);
  let s2 = sin(worldHitPos.y * 8.0 + worldHitPos.z * 8.0 + offset);
  let s3 = sin(worldHitPos.z * 8.0 + worldHitPos.x * 8.0 + offset);
  let band = clamp((s1 + s2 + s3) / 3.0 * 0.5 + 0.5, 0.0, 1.0);

  let c1 = vec3f(0.92, 0.78, 0.35);
  let c2 = vec3f(0.12, 0.10, 0.18);
  let base = mix(c2, c1, band);

  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let lit = base * (0.25 + diffuse * 0.75);

  return lit * exp(-t * 0.3);
}
