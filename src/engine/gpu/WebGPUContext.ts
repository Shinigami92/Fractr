/* oxlint-disable typescript/prefer-readonly-parameter-types -- WebGPU and DOM element types wrap mutable handles */
export class WebGPUContext {
  readonly adapter: GPUAdapter;
  readonly device: GPUDevice;
  readonly context: GPUCanvasContext;
  readonly format: GPUTextureFormat;

  private constructor(
    adapter: GPUAdapter,
    device: GPUDevice,
    context: GPUCanvasContext,
    format: GPUTextureFormat,
  ) {
    this.adapter = adapter;
    this.device = device;
    this.context = context;
    this.format = format;
  }

  static async create(canvas: HTMLCanvasElement): Promise<WebGPUContext> {
    if (navigator.gpu == null) {
      throw new Error('WebGPU is not supported in this browser');
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });
    if (!adapter) {
      throw new Error('Failed to obtain WebGPU adapter');
    }

    const device = await adapter.requestDevice();
    void device.lost.then((info) => {
      // 'destroyed' fires on our own device.destroy() (e.g. HMR teardown) —
      // not an error. Only log genuine device loss.
      if (info.reason === 'destroyed') return;
      console.error('WebGPU device lost:', info.message);
    });

    const context = canvas.getContext('webgpu');
    if (!context) {
      throw new Error('Failed to obtain WebGPU canvas context');
    }

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
      alphaMode: 'opaque',
    });

    return new WebGPUContext(adapter, device, context, format);
  }

  destroy(): void {
    this.device.destroy();
  }
}
