import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGraphicsSettings = defineStore('graphicsSettings', () => {
  const resolutionScale = ref(1.0);
  const maxRaySteps = ref(480);
  const adaptiveQuality = ref(true);
  const targetFps = ref(60);
  const dynamicIterations = ref(true);
  const animatedColors = ref(false);

  function reset(): void {
    resolutionScale.value = 1.0;
    maxRaySteps.value = 480;
    adaptiveQuality.value = true;
    targetFps.value = 60;
    dynamicIterations.value = true;
    animatedColors.value = false;
  }

  return {
    resolutionScale,
    maxRaySteps,
    adaptiveQuality,
    targetFps,
    dynamicIterations,
    animatedColors,
    reset,
  };
});

export type GraphicsSettingsStore = ReturnType<typeof useGraphicsSettings>;
