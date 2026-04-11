// WGSL source imports
import colorDistanceSrc from '../../shaders/coloring/distance.wgsl?raw';
import colorIterationSrc from '../../shaders/coloring/iteration.wgsl?raw';
import colorOrbitTrapSrc from '../../shaders/coloring/orbit_trap.wgsl?raw';
import raySrc from '../../shaders/common/ray.wgsl?raw';
import uniformsSrc from '../../shaders/common/uniforms.wgsl?raw';
import fullscreenSrc from '../../shaders/fullscreen.wgsl?raw';
import raymarcherSrc from '../../shaders/raymarcher.wgsl?raw';
import mandelboxSrc from '../../shaders/sdf/mandelbox.wgsl?raw';
import mandelbulbSrc from '../../shaders/sdf/mandelbulb.wgsl?raw';
import mengerSrc from '../../shaders/sdf/menger.wgsl?raw';
import type { ColorMode, FractalType } from '../../stores/fractalParams';
import type { WebGPUContext } from './WebGPUContext';

const SDF_SOURCES: Record<FractalType, string> = {
  mandelbulb: mandelbulbSrc,
  mandelbox: mandelboxSrc,
  menger: mengerSrc,
};

const COLOR_SOURCES: Record<ColorMode, string> = {
  distance: colorDistanceSrc,
  orbit_trap: colorOrbitTrapSrc,
  iteration: colorIterationSrc,
};

export class PipelineManager {
  private readonly ctx: WebGPUContext;
  private readonly cache = new Map<string, GPURenderPipeline>();
  readonly bindGroupLayout: GPUBindGroupLayout;

  constructor(ctx: WebGPUContext) {
    this.ctx = ctx;
    this.bindGroupLayout = ctx.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });
  }

  getOrCreatePipeline(fractalType: FractalType, colorMode: ColorMode): GPURenderPipeline {
    const key = `${fractalType}:${colorMode}`;
    let pipeline = this.cache.get(key);
    if (pipeline) return pipeline;

    // Assemble fragment shader from modules
    const fragmentSource = [
      uniformsSrc,
      raySrc,
      SDF_SOURCES[fractalType],
      COLOR_SOURCES[colorMode],
      raymarcherSrc,
    ].join('\n');

    const vertexModule = this.ctx.device.createShaderModule({
      label: 'fullscreen-vertex',
      code: fullscreenSrc,
    });

    const fragmentModule = this.ctx.device.createShaderModule({
      label: `fragment-${key}`,
      code: fragmentSource,
    });

    const pipelineLayout = this.ctx.device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout],
    });

    pipeline = this.ctx.device.createRenderPipeline({
      label: `pipeline-${key}`,
      layout: pipelineLayout,
      vertex: {
        module: vertexModule,
        entryPoint: 'main',
      },
      fragment: {
        module: fragmentModule,
        entryPoint: 'main',
        targets: [{ format: this.ctx.format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    this.cache.set(key, pipeline);
    return pipeline;
  }

  invalidateCache(): void {
    this.cache.clear();
  }
}
