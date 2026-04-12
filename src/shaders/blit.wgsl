@group(0) @binding(0) var srcTexture: texture_2d<f32>;

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  let x = f32(i32(vertexIndex) / 2) * 4.0 - 1.0;
  let y = f32(i32(vertexIndex) % 2) * 4.0 - 1.0;
  return vec4f(x, y, 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let color = textureLoad(srcTexture, vec2i(pos.xy), 0);
  return vec4f(color.rgb, 1.0);
}
