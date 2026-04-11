import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGraphicsSettings = defineStore('graphicsSettings', () => {
  const resolutionScale = ref(1.0);
  const maxRaySteps = ref(256);

  function reset(): void {
    resolutionScale.value = 1.0;
    maxRaySteps.value = 256;
  }

  return { resolutionScale, maxRaySteps, reset };
});
