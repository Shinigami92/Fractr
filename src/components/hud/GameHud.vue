<script setup lang="ts">
import { useHudSettings } from '../../stores/hudSettings';
import CoordinatesDisplay from './CoordinatesDisplay.vue';
import Crosshair from './Crosshair.vue';
import FpsCounter from './FpsCounter.vue';

defineProps<{
  fps: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
}>();

const hud = useHudSettings();
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-10">
    <div class="flex flex-col gap-0.5 p-3">
      <FpsCounter v-if="hud.showFps" :fps="fps" />
      <CoordinatesDisplay v-if="hud.showCoordinates" :x="cameraX" :y="cameraY" :z="cameraZ" />
    </div>
    <Crosshair v-if="hud.showCrosshair" />
  </div>
</template>
