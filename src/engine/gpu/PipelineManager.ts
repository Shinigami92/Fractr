// WGSL source imports
import colorAoSrc from '../../shaders/coloring/ao.wgsl?raw';
import colorChromaticSrc from '../../shaders/coloring/chromatic.wgsl?raw';
import colorCurvatureSrc from '../../shaders/coloring/curvature.wgsl?raw';
import colorDepthSrc from '../../shaders/coloring/depth.wgsl?raw';
import colorDistanceSrc from '../../shaders/coloring/distance.wgsl?raw';
import colorFresnelSrc from '../../shaders/coloring/fresnel.wgsl?raw';
import colorGlowSrc from '../../shaders/coloring/glow.wgsl?raw';
import colorIterationSrc from '../../shaders/coloring/iteration.wgsl?raw';
import colorNormalSrc from '../../shaders/coloring/normal.wgsl?raw';
import colorOrbitTrapSrc from '../../shaders/coloring/orbit_trap.wgsl?raw';
import colorStripeSrc from '../../shaders/coloring/stripe.wgsl?raw';
import colorTemperatureSrc from '../../shaders/coloring/temperature.wgsl?raw';
import colorTriplanarSrc from '../../shaders/coloring/triplanar.wgsl?raw';
import raySrc from '../../shaders/common/ray.wgsl?raw';
import uniformsSrc from '../../shaders/common/uniforms.wgsl?raw';
import fullscreenSrc from '../../shaders/fullscreen.wgsl?raw';
import aoRenderSrc from '../../shaders/renderers/ao_render.wgsl?raw';
import bidirSrc from '../../shaders/renderers/bidir.wgsl?raw';
import celSrc from '../../shaders/renderers/cel.wgsl?raw';
import conemarcherSrc from '../../shaders/renderers/conemarcher.wgsl?raw';
import dofSrc from '../../shaders/renderers/dof.wgsl?raw';
import duallightingSrc from '../../shaders/renderers/duallighting.wgsl?raw';
import fogSrc from '../../shaders/renderers/fog.wgsl?raw';
import multibounceSrc from '../../shaders/renderers/multibounce.wgsl?raw';
import pathtraceSrc from '../../shaders/renderers/pathtrace.wgsl?raw';
import radiositySrc from '../../shaders/renderers/radiosity.wgsl?raw';
import raymarcherSrc from '../../shaders/renderers/raymarcher.wgsl?raw';
import reflectionSrc from '../../shaders/renderers/reflection.wgsl?raw';
import softshadowSrc from '../../shaders/renderers/softshadow.wgsl?raw';
import sssSrc from '../../shaders/renderers/sss.wgsl?raw';
import volumeSrc from '../../shaders/renderers/volume.wgsl?raw';
import whittedSrc from '../../shaders/renderers/whitted.wgsl?raw';
import wireframeSrc from '../../shaders/renderers/wireframe.wgsl?raw';
import apollonianSrc from '../../shaders/sdf/apollonian.wgsl?raw';
import bristorbrotSrc from '../../shaders/sdf/bristorbrot.wgsl?raw';
import burningshipSrc from '../../shaders/sdf/burningship.wgsl?raw';
import cantordustSrc from '../../shaders/sdf/cantordust.wgsl?raw';
import cospower2Src from '../../shaders/sdf/cospower2.wgsl?raw';
import gyroidSrc from '../../shaders/sdf/gyroid.wgsl?raw';
import juliabulbSrc from '../../shaders/sdf/juliabulb.wgsl?raw';
import kaleidoboxSrc from '../../shaders/sdf/kaleidobox.wgsl?raw';
import kleinianSrc from '../../shaders/sdf/kleinian.wgsl?raw';
import koch3dSrc from '../../shaders/sdf/koch3d.wgsl?raw';
import mandelboxSrc from '../../shaders/sdf/mandelbox.wgsl?raw';
import mandelbulbSrc from '../../shaders/sdf/mandelbulb.wgsl?raw';
import mengerSrc from '../../shaders/sdf/menger.wgsl?raw';
import octahedronSrc from '../../shaders/sdf/octahedron.wgsl?raw';
import quatjuliaSrc from '../../shaders/sdf/quatjulia.wgsl?raw';
import sierpinskiSrc from '../../shaders/sdf/sierpinski.wgsl?raw';
import spudsvilleSrc from '../../shaders/sdf/spudsville.wgsl?raw';
import tricornSrc from '../../shaders/sdf/tricorn.wgsl?raw';
import xenodreambuieSrc from '../../shaders/sdf/xenodreambuie.wgsl?raw';
import type { ColorMode, FractalType, RenderMode } from '../../stores/fractalParams';
import type { WebGPUContext } from './WebGPUContext';

const MARCHER_SOURCES: Record<RenderMode, string> = {
  ray: raymarcherSrc,
  cone: conemarcherSrc,
  pathtrace: pathtraceSrc,
  volume: volumeSrc,
  softshadow: softshadowSrc,
  reflection: reflectionSrc,
  dof: dofSrc,
  ao_render: aoRenderSrc,
  sss: sssSrc,
  cel: celSrc,
  wireframe: wireframeSrc,
  duallighting: duallightingSrc,
  fog: fogSrc,
  multibounce: multibounceSrc,
  radiosity: radiositySrc,
  bidir: bidirSrc,
  whitted: whittedSrc,
};

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
  octahedron: octahedronSrc,
  cantordust: cantordustSrc,
  burningship: burningshipSrc,
  tricorn: tricornSrc,
  cospower2: cospower2Src,
  kaleidobox: kaleidoboxSrc,
  spudsville: spudsvilleSrc,
  bristorbrot: bristorbrotSrc,
  xenodreambuie: xenodreambuieSrc,
  gyroid: gyroidSrc,
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
  fresnel: colorFresnelSrc,
  depth: colorDepthSrc,
  triplanar: colorTriplanarSrc,
  temperature: colorTemperatureSrc,
  chromatic: colorChromaticSrc,
};

export class PipelineManager {
  private readonly ctx: WebGPUContext;
  private readonly cache = new Map<string, GPURenderPipeline>();
  readonly bindGroupLayout: GPUBindGroupLayout;

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- WebGPUContext wraps mutable GPU handles
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
    return this.buildPipeline(key, fractalType, colorMode, renderMode, this.ctx.format, undefined);
  }

  getOrCreateAccumPipeline(
    fractalType: FractalType,
    colorMode: ColorMode,
    renderMode: RenderMode,
  ): GPURenderPipeline {
    const key = `accum:${fractalType}:${colorMode}:${renderMode}`;
    return this.buildPipeline(key, fractalType, colorMode, renderMode, 'rgba16float', {
      color: {
        srcFactor: 'constant' as GPUBlendFactor,
        dstFactor: 'one-minus-constant' as GPUBlendFactor,
        operation: 'add',
      },
      alpha: {
        srcFactor: 'one',
        dstFactor: 'zero',
        operation: 'add',
      },
    });
  }

  private buildPipeline(
    key: string,
    fractalType: FractalType,
    colorMode: ColorMode,
    renderMode: RenderMode,
    format: GPUTextureFormat,
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- GPUBlendState is a deeply-nested GPU descriptor
    blend: GPUBlendState | undefined,
  ): GPURenderPipeline {
    let pipeline = this.cache.get(key);
    if (pipeline) return pipeline;

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
        targets: [{ format, blend }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    this.cache.set(key, pipeline);
    return pipeline;
  }
}
