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
 * offset 100: maxRaySteps           u32      (4 bytes)
 * offset 104: resolutionScale       f32      (4 bytes)
 * offset 108: frameCount            u32      (4 bytes)
 * offset 112: animatedColors        u32      (4 bytes)
 * offset 116: stepFactor            f32      (4 bytes)
 * Total: 128 bytes (struct aligns to 16; 120 padded to 128)
 */

const BUFFER_SIZE = 128;

// Offsets in 4-byte words (Float32Array / Uint32Array indices). Keep in sync
// with the WGSL struct documented above — each value is (byte offset) / 4.
const IDX_VIEW_PROJ_INVERSE = 0; // mat4x4f occupies indices 0..15
const IDX_CAMERA_POSITION = 16; // vec3f occupies indices 16..18
const IDX_TIME = 19;
const IDX_RESOLUTION = 20; // vec2f occupies indices 20..21
const IDX_POWER = 22;
const IDX_MAX_ITERATIONS = 23;
const IDX_BAILOUT = 24;
const IDX_MAX_RAY_STEPS = 25;
const IDX_RESOLUTION_SCALE = 26;
const IDX_FRAME_COUNT = 27;
const IDX_ANIMATED_COLORS = 28;
const IDX_STEP_FACTOR = 29;

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
    this.floatView.set(m, IDX_VIEW_PROJ_INVERSE);
  }

  setCameraPosition(x: number, y: number, z: number): void {
    this.floatView[IDX_CAMERA_POSITION] = x;
    this.floatView[IDX_CAMERA_POSITION + 1] = y;
    this.floatView[IDX_CAMERA_POSITION + 2] = z;
  }

  setTime(t: number): void {
    this.floatView[IDX_TIME] = t;
  }

  setResolution(w: number, h: number): void {
    this.floatView[IDX_RESOLUTION] = w;
    this.floatView[IDX_RESOLUTION + 1] = h;
  }

  setPower(p: number): void {
    this.floatView[IDX_POWER] = p;
  }

  setMaxIterations(n: number): void {
    this.uintView[IDX_MAX_ITERATIONS] = n;
  }

  setBailout(b: number): void {
    this.floatView[IDX_BAILOUT] = b;
  }

  setMaxRaySteps(steps: number): void {
    this.uintView[IDX_MAX_RAY_STEPS] = steps;
  }

  setResolutionScale(scale: number): void {
    this.floatView[IDX_RESOLUTION_SCALE] = scale;
  }

  setFrameCount(count: number): void {
    this.uintView[IDX_FRAME_COUNT] = count;
  }

  setAnimatedColors(enabled: boolean): void {
    this.uintView[IDX_ANIMATED_COLORS] = enabled ? 1 : 0;
  }

  setStepFactor(f: number): void {
    this.floatView[IDX_STEP_FACTOR] = f;
  }

  upload(device: GPUDevice): void {
    device.queue.writeBuffer(this.buffer, 0, this.data);
  }
}
