fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32) -> vec3f {
  // Iteration count gradient coloring
  let iterRatio = f32(result.iterations) / f32(uniforms.maxIterations);

  // Compute normal
  let eps = 0.0005;
  let nx = sceneSDF(hitPos + vec3f(eps, 0.0, 0.0)).distance - sceneSDF(hitPos - vec3f(eps, 0.0, 0.0)).distance;
  let ny = sceneSDF(hitPos + vec3f(0.0, eps, 0.0)).distance - sceneSDF(hitPos - vec3f(0.0, eps, 0.0)).distance;
  let nz = sceneSDF(hitPos + vec3f(0.0, 0.0, eps)).distance - sceneSDF(hitPos - vec3f(0.0, 0.0, eps)).distance;
  let normal = normalize(vec3f(nx, ny, nz));

  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let ambient = 0.15;

  // Smooth gradient through warm palette
  let r = 0.5 + 0.5 * cos(6.28318 * (iterRatio * 0.8 + 0.0));
  let g = 0.5 + 0.5 * cos(6.28318 * (iterRatio * 0.8 + 0.33));
  let b = 0.5 + 0.5 * cos(6.28318 * (iterRatio * 0.8 + 0.67));
  let color = vec3f(r, g, b);

  let lit = color * (ambient + diffuse * 0.85);
  let fog = exp(-t * 0.3);
  return lit * fog;
}
