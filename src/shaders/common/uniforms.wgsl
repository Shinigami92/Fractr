struct Uniforms {
  viewProjectionInverse: mat4x4f,
  cameraPosition: vec3f,
  time: f32,
  resolution: vec2f,
  power: f32,
  maxIterations: u32,
  bailout: f32,
  colorMode: u32,
  maxRaySteps: u32,
  resolutionScale: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
