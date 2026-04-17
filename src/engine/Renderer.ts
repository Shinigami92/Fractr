import blitSrc from '../shaders/blit.wgsl?raw';
import type { ColorMode, FractalType, RenderMode } from '../stores/fractalParams';
import type { FPSCamera } from './camera/FPSCamera';
import { PipelineManager } from './gpu/PipelineManager';
import { UniformBuffer } from './gpu/UniformBuffer';
import type { WebGPUContext } from './gpu/WebGPUContext';

export class Renderer {
  private readonly ctx: WebGPUContext;
  private readonly pipelineManager: PipelineManager;
  private readonly uniformBuffer: UniformBuffer;
  private bindGroup: GPUBindGroup;
  // Set by App.vue via setFractalType/setColorMode/setRenderMode before the
  // first render. Kept uninitialized here so stale defaults can't mask a
  // missed bootstrap call.
  private currentFractal!: FractalType;
  private currentColor!: ColorMode;
  private currentRenderMode!: RenderMode;
  private width = 1;
  private height = 1;

  // Progressive accumulation
  private accumulationTexture: GPUTexture | null = null;
  private blitPipeline: GPURenderPipeline;
  private blitBindGroupLayout: GPUBindGroupLayout;
  private blitBindGroup: GPUBindGroup | null = null;
  private _sampleCount = 0;

  // Frame pacing: track in-flight GPU work to avoid stalling on getCurrentTexture
  private framesInFlight = 0;
  private static readonly MAX_FRAMES_IN_FLIGHT = 2;

  get sampleCount(): number {
    return this._sampleCount;
  }

  constructor(ctx: WebGPUContext) {
    this.ctx = ctx;
    this.pipelineManager = new PipelineManager(ctx);
    this.uniformBuffer = new UniformBuffer(ctx.device);
    this.bindGroup = this.createBindGroup();

    // Blit pipeline for copying accumulation texture to canvas
    this.blitBindGroupLayout = ctx.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float' },
        },
      ],
    });

    const blitModule = ctx.device.createShaderModule({
      label: 'blit',
      code: blitSrc,
    });

    this.blitPipeline = ctx.device.createRenderPipeline({
      label: 'blit-pipeline',
      layout: ctx.device.createPipelineLayout({
        bindGroupLayouts: [this.blitBindGroupLayout],
      }),
      vertex: { module: blitModule, entryPoint: 'vs' },
      fragment: {
        module: blitModule,
        entryPoint: 'fs',
        targets: [{ format: ctx.format }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  private createBindGroup(): GPUBindGroup {
    return this.ctx.device.createBindGroup({
      layout: this.pipelineManager.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer.buffer },
        },
      ],
    });
  }

  private ensureAccumulationTexture(): void {
    if (
      this.accumulationTexture &&
      this.accumulationTexture.width === this.width &&
      this.accumulationTexture.height === this.height
    ) {
      return;
    }

    this.accumulationTexture?.destroy();

    this.accumulationTexture = this.ctx.device.createTexture({
      label: 'accumulation',
      size: { width: this.width, height: this.height },
      format: 'rgba16float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    this.blitBindGroup = this.ctx.device.createBindGroup({
      layout: this.blitBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: this.accumulationTexture.createView(),
        },
      ],
    });

    this._sampleCount = 0;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this._sampleCount = 0;
  }

  setFractalType(type: FractalType): void {
    this.currentFractal = type;
  }

  setColorMode(mode: ColorMode): void {
    this.currentColor = mode;
  }

  setRenderMode(mode: RenderMode): void {
    this.currentRenderMode = mode;
  }

  resetAccumulation(): void {
    this._sampleCount = 0;
  }

  updateUniforms(
    camera: FPSCamera,
    params: {
      power: number;
      maxIterations: number;
      bailout: number;
      maxRaySteps: number;
      resolutionScale: number;
      animatedColors: boolean;
      stepFactor: number;
      originOffset?: [number, number, number];
    },
    time: number,
  ): void {
    const aspect = this.width / this.height;
    const offset = params.originOffset;
    const sx = camera.position[0]! - (offset?.[0] ?? 0);
    const sy = camera.position[1]! - (offset?.[1] ?? 0);
    const sz = camera.position[2]! - (offset?.[2] ?? 0);
    const shifted = offset ? new Float32Array([sx, sy, sz]) : undefined;
    const vpInverse = camera.getViewProjectionInverse(aspect, undefined, shifted);

    this.uniformBuffer.setViewProjectionInverse(vpInverse);
    this.uniformBuffer.setCameraPosition(sx, sy, sz);
    this.uniformBuffer.setTime(time);
    this.uniformBuffer.setResolution(this.width, this.height);
    this.uniformBuffer.setPower(params.power);
    this.uniformBuffer.setMaxIterations(params.maxIterations);
    this.uniformBuffer.setBailout(params.bailout);
    this.uniformBuffer.setMaxRaySteps(params.maxRaySteps);
    this.uniformBuffer.setResolutionScale(params.resolutionScale);
    this.uniformBuffer.setFrameCount(this._sampleCount);
    this.uniformBuffer.setAnimatedColors(params.animatedColors);
    this.uniformBuffer.setStepFactor(params.stepFactor);
    this.uniformBuffer.upload(this.ctx.device);
  }

  render(accumulate = false): void {
    // Skip frame if GPU is saturated — prevents getCurrentTexture() stalls
    // that cause frame-pacing judder at sub-vsync FPS.
    if (this.framesInFlight >= Renderer.MAX_FRAMES_IN_FLIGHT) return;
    this.framesInFlight++;

    this.ensureAccumulationTexture();
    const commandEncoder = this.ctx.device.createCommandEncoder();
    const canvasView = this.ctx.context.getCurrentTexture().createView();

    if (accumulate) {
      // Accumulation path: render to float texture with blending, then blit
      const accumView = this.accumulationTexture!.createView();
      const blendWeight = 1 / (this._sampleCount + 1);

      const samplePass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: accumView,
            loadOp: this._sampleCount === 0 ? 'clear' : 'load',
            storeOp: 'store',
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
          },
        ],
      });

      const blendPipeline = this.pipelineManager.getOrCreateAccumPipeline(
        this.currentFractal,
        this.currentColor,
        this.currentRenderMode,
      );
      samplePass.setPipeline(blendPipeline);
      samplePass.setBindGroup(0, this.bindGroup);
      samplePass.setBlendConstant({ r: blendWeight, g: blendWeight, b: blendWeight, a: 1 });
      samplePass.draw(3);
      samplePass.end();

      this._sampleCount++;

      // Blit accumulation to canvas
      const blitPass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: canvasView,
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
          },
        ],
      });
      blitPass.setPipeline(this.blitPipeline);
      blitPass.setBindGroup(0, this.blitBindGroup!);
      blitPass.draw(3);
      blitPass.end();
    } else {
      // Fast path: render directly to canvas (no accumulation overhead)
      // Keep sampleCount at 0 so accumulation starts clean when camera stops
      this._sampleCount = 0;

      const pipeline = this.pipelineManager.getOrCreatePipeline(
        this.currentFractal,
        this.currentColor,
        this.currentRenderMode,
      );

      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: canvasView,
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
          },
        ],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.draw(3);
      pass.end();
    }

    this.ctx.device.queue.submit([commandEncoder.finish()]);
    // onSubmittedWorkDone resolves when the GPU finishes processing all
    // commands submitted up to this point. Decrementing here lets the next
    // render() call know there's a free slot in the pipeline, avoiding
    // getCurrentTexture() stalls that cause frame-pacing judder.
    void this.ctx.device.queue.onSubmittedWorkDone().then(() => {
      this.framesInFlight--;
    });
  }

  destroy(): void {
    this.accumulationTexture?.destroy();
    this.uniformBuffer.buffer.destroy();
    this.ctx.destroy();
  }
}
