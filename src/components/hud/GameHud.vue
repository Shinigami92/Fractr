<script setup lang="ts">
import { FRACTAL_CONFIGS, useFractalParams } from '../../stores/fractalParams';
import { useHudSettings } from '../../stores/hudSettings';
import Crosshair from './Crosshair.vue';

const props = defineProps<{
  fps: number;
  camera: { x: number; y: number; z: number; yaw: number; pitch: number };
}>();

const hud = useHudSettings();
const fractal = useFractalParams();

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
      <div v-if="hud.showFps">{{ props.fps }} FPS</div>
      <template v-if="hud.showCoordinates">
        <div>
          X: {{ props.camera.x.toFixed(3) }} Y: {{ props.camera.y.toFixed(3) }} Z:
          {{ props.camera.z.toFixed(3) }}
        </div>
        <div>Yaw: {{ toDeg(props.camera.yaw) }}° Pitch: {{ toDeg(props.camera.pitch) }}°</div>
        <div class="mt-1 text-white/40">
          {{ FRACTAL_CONFIGS[fractal.fractalType].label }}
          · {{ fractal.colorMode.replace('_', ' ') }}
        </div>
        <div class="text-white/40">
          <template v-if="fractal.config.power">
            {{ fractal.config.power.label }}: {{ fractal.power.toFixed(1) }}
          </template>
          Iter: {{ fractal.maxIterations }}
          <template v-if="fractal.config.bailout">
            Bail: {{ fractal.bailout.toFixed(1) }}
          </template>
        </div>
      </template>
    </div>
    <Crosshair v-if="hud.showCrosshair" />
  </div>
</template>
