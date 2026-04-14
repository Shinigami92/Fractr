<script setup lang="ts">
import {
  COLOR_MODE_OPTIONS,
  FRACTAL_CONFIGS,
  type RenderMode,
  useFractalParams,
} from '../../stores/fractalParams';
import { useGraphicsSettings } from '../../stores/graphicsSettings';
import { useHudSettings } from '../../stores/hudSettings';
import Crosshair from './Crosshair.vue';

const emit = defineEmits<{
  pause: [];
}>();

const RENDER_MODE_LABELS: Record<RenderMode, string> = {
  ray: 'ray march',
  cone: 'cone march',
  pathtrace: 'path trace',
  volume: 'volume',
  softshadow: 'soft shadows',
  reflection: 'reflections',
  dof: 'depth of field',
  ao_render: 'ambient occlusion',
  sss: 'subsurface scattering',
  cel: 'cel shading',
  wireframe: 'wireframe',
  duallighting: 'dual lighting',
  fog: 'volumetric fog',
  multibounce: 'multi-bounce GI',
  radiosity: 'radiosity',
  bidir: 'bidirectional',
  whitted: 'whitted ray trace',
};

const props = defineProps<{
  fps: number;
  camera: { x: number; y: number; z: number; yaw: number; pitch: number; roll: number };
  effectiveIterations: number;
  sampleCount: number;
}>();

const hud = useHudSettings();
const fractal = useFractalParams();
const graphics = useGraphicsSettings();

function toDeg(rad: number): string {
  return ((rad * 180) / Math.PI).toFixed(1);
}
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-10">
    <div
      v-if="hud.showFps || hud.showCoordinates"
      class="flex flex-col gap-0.5 p-3 font-mono text-xs text-white/70"
    >
      <div v-if="hud.showFps">{{ props.fps }} FPS · {{ props.sampleCount }} samples</div>
      <template v-if="hud.showCoordinates">
        <div>
          X: {{ props.camera.x.toFixed(3) }} Y: {{ props.camera.y.toFixed(3) }} Z:
          {{ props.camera.z.toFixed(3) }}
        </div>
        <div>
          Yaw: {{ toDeg(props.camera.yaw) }}° Pitch: {{ toDeg(props.camera.pitch) }}° Roll:
          {{ toDeg(props.camera.roll) }}°
        </div>
        <div class="mt-1 text-white/40">
          {{ FRACTAL_CONFIGS[fractal.fractalType].label }}
          · {{ COLOR_MODE_OPTIONS.find((o) => o.value === fractal.colorMode)?.label }}
          <span v-if="graphics.animatedColors" class="text-cyan/60">[anim]</span>
          · {{ RENDER_MODE_LABELS[fractal.renderMode] }}
        </div>
        <div class="text-white/40">
          <template v-if="fractal.config.power">
            {{ fractal.config.power.label }}: {{ fractal.power.toFixed(1) }}
          </template>
          Iter: {{ props.effectiveIterations }}/{{ fractal.maxIterations }}
          <span v-if="graphics.dynamicIterations" class="text-cyan/60">[dyn]</span>
          <span v-else class="text-white/20">[fixed]</span>
          <template v-if="fractal.config.bailout">
            Bail: {{ fractal.bailout.toFixed(1) }}
          </template>
        </div>
      </template>
    </div>
    <Crosshair v-if="hud.showCrosshair" />
    <div
      v-if="hud.showFps || hud.showCoordinates"
      class="fixed bottom-3 left-3 font-mono text-xs text-white/40"
    >
      <kbd class="border border-white/10 bg-white/5 px-1.5 py-0.5 text-white/60">F1</kbd>
      <span class="ml-2">controls</span>
    </div>
    <button
      class="pointer-events-auto fixed top-3 right-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-sm transition-colors active:bg-white/20"
      @click.stop="emit('pause')"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <rect x="3" y="2" width="4" height="14" rx="1" />
        <rect x="11" y="2" width="4" height="14" rx="1" />
      </svg>
    </button>
  </div>
</template>
