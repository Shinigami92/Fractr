// WGSL source imports
import colorAoSrc from '../../shaders/coloring/ao.wgsl?raw';
import colorCurvatureSrc from '../../shaders/coloring/curvature.wgsl?raw';
import colorDistanceSrc from '../../shaders/coloring/distance.wgsl?raw';
import colorGlowSrc from '../../shaders/coloring/glow.wgsl?raw';
import colorIterationSrc from '../../shaders/coloring/iteration.wgsl?raw';
import colorNormalSrc from '../../shaders/coloring/normal.wgsl?raw';
import colorOrbitTrapSrc from '../../shaders/coloring/orbit_trap.wgsl?raw';
import colorStripeSrc from '../../shaders/coloring/stripe.wgsl?raw';
import raySrc from '../../shaders/common/ray.wgsl?raw';
import uniformsSrc from '../../shaders/common/uniforms.wgsl?raw';
import conemarcherSrc from '../../shaders/conemarcher.wgsl?raw';
import fullscreenSrc from '../../shaders/fullscreen.wgsl?raw';
import raymarcherSrc from '../../shaders/raymarcher.wgsl?raw';
import apollonianSrc from '../../shaders/sdf/apollonian.wgsl?raw';
import juliabulbSrc from '../../shaders/sdf/juliabulb.wgsl?raw';
import kleinianSrc from '../../shaders/sdf/kleinian.wgsl?raw';
import koch3dSrc from '../../shaders/sdf/koch3d.wgsl?raw';
import mandelboxSrc from '../../shaders/sdf/mandelbox.wgsl?raw';
import mandelbulbSrc from '../../shaders/sdf/mandelbulb.wgsl?raw';
import mengerSrc from '../../shaders/sdf/menger.wgsl?raw';
import quatjuliaSrc from '../../shaders/sdf/quatjulia.wgsl?raw';
import sierpinskiSrc from '../../shaders/sdf/sierpinski.wgsl?raw';
import type { ColorMode, FractalType, RenderMode } from '../../stores/fractalParams';

const MARCHER_SOURCES: Record<RenderMode, string> = {
  ray: raymarcherSrc,
  cone: conemarcherSrc,
};
import type { WebGPUContext } from './WebGPUContext';

const SDF_SOURCES: Record<FractalType, string> = {
  mandelbulb: mandelbulbSrc,
  mandelbox: mandelboxSrc,
  menger: mengerSrc,
  sierpinski: sierpinskiSrc,
  quatjulia: quatjuliaSrc,
  kleinian: kleinianSrc,
  koch3d: koch3dSrc,
  apollonian: apollonianSrc,
  juliabulb: juliabulbSrc,
};

const COLOR_SOURCES: Record<ColorMode, string> = {
  distance: colorDistanceSrc,
  orbit_trap: colorOrbitTrapSrc,
  iteration: colorIterationSrc,
  ao: colorAoSrc,
  normal: colorNormalSrc,
  curvature: colorCurvatureSrc,
  glow: colorGlowSrc,
  stripe: colorStripeSrc,
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

  getOrCreatePipeline(
    fractalType: FractalType,
    colorMode: ColorMode,
    renderMode: RenderMode,
  ): GPURenderPipeline {
    const key = `${fractalType}:${colorMode}:${renderMode}`;
    let pipeline = this.cache.get(key);
    if (pipeline) return pipeline;

    // Assemble fragment shader from modules
    const fragmentSource = [
      uniformsSrc,
      raySrc,
      SDF_SOURCES[fractalType],
      COLOR_SOURCES[colorMode],
      MARCHER_SOURCES[renderMode],
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
