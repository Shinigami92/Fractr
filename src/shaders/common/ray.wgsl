struct Ray {
  origin: vec3f,
  direction: vec3f,
}

fn rayFromCamera(uv: vec2f) -> Ray {
  // Convert UV [0,1] to clip space [-1,1]
  let ndc = vec2f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);

  // Reconstruct world-space ray using inverse view-projection
  let nearPoint = uniforms.viewProjectionInverse * vec4f(ndc, -1.0, 1.0);
  let farPoint = uniforms.viewProjectionInverse * vec4f(ndc, 1.0, 1.0);

  let near = nearPoint.xyz / nearPoint.w;
  let far = farPoint.xyz / farPoint.w;

  return Ray(
    uniforms.cameraPosition,
    normalize(far - near),
  );
}
