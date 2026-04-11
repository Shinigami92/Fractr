fn computeColor(result: SDFResult, ray: Ray, hitPos: vec3f, t: f32) -> vec3f {
  // Distance-estimation based coloring
  // Uses the iteration count and minimum orbit distance for color variation
  let iterRatio = f32(result.iterations) / f32(uniforms.maxIterations);
  let distFactor = clamp(result.minDist * 2.0, 0.0, 1.0);

  // Compute surface normal via central differences for lighting
  let eps = 0.0005;
  let nx = sceneSDF(hitPos + vec3f(eps, 0.0, 0.0)).distance - sceneSDF(hitPos - vec3f(eps, 0.0, 0.0)).distance;
  let ny = sceneSDF(hitPos + vec3f(0.0, eps, 0.0)).distance - sceneSDF(hitPos - vec3f(0.0, eps, 0.0)).distance;
  let nz = sceneSDF(hitPos + vec3f(0.0, 0.0, eps)).distance - sceneSDF(hitPos - vec3f(0.0, 0.0, eps)).distance;
  let normal = normalize(vec3f(nx, ny, nz));

  // Simple directional light
  let lightDir = normalize(vec3f(0.5, 1.0, -0.3));
  let diffuse = max(dot(normal, lightDir), 0.0);
  let ambient = 0.15;

  // Color palette based on iteration depth
  let c1 = vec3f(0.486, 0.231, 0.914); // violet
  let c2 = vec3f(0.024, 0.714, 0.831); // cyan
  let c3 = vec3f(0.969, 0.380, 0.502); // pink

  let color = mix(c1, c2, iterRatio) + c3 * distFactor * 0.3;
  let lit = color * (ambient + diffuse * 0.85);

  // Distance fog
  let fog = exp(-t * 0.3);
  return lit * fog;
}
