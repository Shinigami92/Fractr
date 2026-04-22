fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  let anim = f32(uniforms.animatedColors);
  let time = uniforms.time;

  // Use unshifted world position so colors don't jump when the renderer
  // snaps the origin for periodic SDFs (see Renderer.updateUniforms).
  let worldHitPos = hitPos + uniforms.originOffset;

  // Animated: phase shifts over time for flowing rainbow
  let phase = dot(worldHitPos, vec3f(3.0, 5.0, 7.0)) + anim * time * 1.5;
  let r = sin(phase) * 0.5 + 0.5;
  let g = sin(phase + 2.094) * 0.5 + 0.5;
  let b = sin(phase + 4.189) * 0.5 + 0.5;
  let color = vec3f(r, g, b);

  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let lit = color * (0.2 + diffuse * 0.8);

  let fog = exp(-t * 0.3);
  return lit * fog;
}
