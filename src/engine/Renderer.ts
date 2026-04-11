import type { ColorMode, FractalType } from '../stores/fractalParams';
import type { FPSCamera } from './camera/FPSCamera';
import { PipelineManager } from './gpu/PipelineManager';
import { UniformBuffer } from './gpu/UniformBuffer';
import type { WebGPUContext } from './gpu/WebGPUContext';

export class Renderer {
  private readonly ctx: WebGPUContext;
  private readonly pipelineManager: PipelineManager;
  private readonly uniformBuffer: UniformBuffer;
  private bindGroup: GPUBindGroup;
  private currentFractal: FractalType = 'mandelbulb';
  private currentColor: ColorMode = 'distance';
  private width = 1;
  private height = 1;

  constructor(ctx: WebGPUContext) {
    this.ctx = ctx;
    this.pipelineManager = new PipelineManager(ctx);
    this.uniformBuffer = new UniformBuffer(ctx.device);

    this.bindGroup = this.createBindGroup();
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

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  setFractalType(type: FractalType): void {
    this.currentFractal = type;
  }

  setColorMode(mode: ColorMode): void {
    this.currentColor = mode;
  }

  updateUniforms(
    camera: FPSCamera,
    params: {
      power: number;
      maxIterations: number;
      bailout: number;
      colorMode: number;
      maxRaySteps: number;
      resolutionScale: number;
    },
    time: number,
  ): void {
    const aspect = this.width / this.height;
    const vpInverse = camera.getViewProjectionInverse(aspect);

    this.uniformBuffer.setViewProjectionInverse(vpInverse);
    this.uniformBuffer.setCameraPosition(
      camera.position[0]!,
      camera.position[1]!,
      camera.position[2]!,
    );
    this.uniformBuffer.setTime(time);
    this.uniformBuffer.setResolution(this.width, this.height);
    this.uniformBuffer.setPower(params.power);
    this.uniformBuffer.setMaxIterations(params.maxIterations);
    this.uniformBuffer.setBailout(params.bailout);
    this.uniformBuffer.setColorMode(params.colorMode);
    this.uniformBuffer.setMaxRaySteps(params.maxRaySteps);
    this.uniformBuffer.setResolutionScale(params.resolutionScale);
    this.uniformBuffer.upload(this.ctx.device);
  }

  render(): void {
    const pipeline = this.pipelineManager.getOrCreatePipeline(
      this.currentFractal,
      this.currentColor,
    );

    const commandEncoder = this.ctx.device.createCommandEncoder();
    const textureView = this.ctx.context.getCurrentTexture().createView();

    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.draw(3);
    passEncoder.end();

    this.ctx.device.queue.submit([commandEncoder.finish()]);
  }

  destroy(): void {
    this.uniformBuffer.buffer.destroy();
    this.ctx.destroy();
  }
}
