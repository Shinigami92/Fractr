/**
 * Uniform buffer layout (must match WGSL struct exactly):
 *
 * offset  0: viewProjectionInverse  mat4x4f  (64 bytes)
 * offset 64: cameraPosition         vec3f    (12 bytes)
 * offset 76: time                   f32      (4 bytes)
 * offset 80: resolution             vec2f    (8 bytes)
 * offset 88: power                  f32      (4 bytes)
 * offset 92: maxIterations          u32      (4 bytes)
 * offset 96: bailout                f32      (4 bytes)
 * offset 100: colorMode             u32      (4 bytes)
 * offset 104: maxRaySteps           u32      (4 bytes)
 * offset 108: resolutionScale       f32      (4 bytes)
 * offset 112: frameCount            u32      (4 bytes)
 * offset 116: animatedColors        u32      (4 bytes)
 * offset 120: stepFactor            f32      (4 bytes)
 * Total: 128 bytes (aligned to 16 = 128, padded from 124)
 */

const BUFFER_SIZE = 128;

export class UniformBuffer {
  readonly buffer: GPUBuffer;
  private readonly data: ArrayBuffer;
  private readonly floatView: Float32Array;
  private readonly uintView: Uint32Array;

  constructor(device: GPUDevice) {
    this.data = new ArrayBuffer(BUFFER_SIZE);
    this.floatView = new Float32Array(this.data);
    this.uintView = new Uint32Array(this.data);

    this.buffer = device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  setViewProjectionInverse(m: Float32Array): void {
    this.floatView.set(m, 0);
  }

  setCameraPosition(x: number, y: number, z: number): void {
    this.floatView[16] = x;
    this.floatView[17] = y;
    this.floatView[18] = z;
  }

  setTime(t: number): void {
    this.floatView[19] = t;
  }

  setResolution(w: number, h: number): void {
    this.floatView[20] = w;
    this.floatView[21] = h;
  }

  setPower(p: number): void {
    this.floatView[22] = p;
  }

  setMaxIterations(n: number): void {
    this.uintView[23] = n;
  }

  setBailout(b: number): void {
    this.floatView[24] = b;
  }

  setColorMode(mode: number): void {
    this.uintView[25] = mode;
  }

  setMaxRaySteps(steps: number): void {
    this.uintView[26] = steps;
  }

  setResolutionScale(scale: number): void {
    this.floatView[27] = scale;
  }

  setFrameCount(count: number): void {
    this.uintView[28] = count;
  }

  setAnimatedColors(enabled: boolean): void {
    this.uintView[29] = enabled ? 1 : 0;
  }

  setStepFactor(f: number): void {
    this.floatView[30] = f;
  }

  upload(device: GPUDevice): void {
    device.queue.writeBuffer(this.buffer, 0, this.data);
  }
}
