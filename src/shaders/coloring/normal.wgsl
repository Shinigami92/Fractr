fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32, normal: vec3f, stepRatio: f32) -> vec3f {
  let anim = f32(uniforms.animatedColors);
  let time = uniforms.time;

  // Animated: rotating the normal mapping axes
  let s = sin(anim * time * 0.3);
  let c = cos(anim * time * 0.3);
  let rotN = vec3f(
    normal.x * c - normal.z * s,
    normal.y,
    normal.x * s + normal.z * c,
  );
  let color = rotN * 0.5 + 0.5;

  let fog = exp(-t * 0.3);
  return color * fog;
}
