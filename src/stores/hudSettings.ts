import { useToggle } from '@vueuse/core';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useHudSettings = defineStore('hudSettings', () => {
  const showFps = ref(true);
  const showCoordinates = ref(true);
  const [showCrosshair, toggleCrosshair] = useToggle(false);

  function toggleHud(): void {
    const next = !(showFps.value && showCoordinates.value);
    showFps.value = next;
    showCoordinates.value = next;
  }

  return { showFps, showCoordinates, showCrosshair, toggleHud, toggleCrosshair };
});
