import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useHudSettings = defineStore('hudSettings', () => {
  const showFps = ref(true);
  const showCoordinates = ref(true);
  const showCrosshair = ref(false);

  function toggleHud(): void {
    const next = !(showFps.value && showCoordinates.value);
    showFps.value = next;
    showCoordinates.value = next;
  }

  function toggleCrosshair(): void {
    showCrosshair.value = !showCrosshair.value;
  }

  return { showFps, showCoordinates, showCrosshair, toggleHud, toggleCrosshair };
});
