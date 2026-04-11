import { defineStore } from 'pinia';
import { ref } from 'vue';

export type FractalType = 'mandelbulb';
export type ColorMode = 'distance' | 'orbit_trap' | 'iteration';

export const useFractalParams = defineStore('fractalParams', () => {
  const fractalType = ref<FractalType>('mandelbulb');
  const power = ref(8);
  const maxIterations = ref(20);
  const bailout = ref(2);
  const colorMode = ref<ColorMode>('distance');

  function reset(): void {
    fractalType.value = 'mandelbulb';
    power.value = 8;
    maxIterations.value = 20;
    bailout.value = 2;
    colorMode.value = 'distance';
  }

  const COLOR_MODES: ColorMode[] = ['distance', 'orbit_trap', 'iteration'];

  function cycleColorMode(): void {
    const idx = COLOR_MODES.indexOf(colorMode.value);
    colorMode.value = COLOR_MODES[(idx + 1) % COLOR_MODES.length]!;
  }

  return { fractalType, power, maxIterations, bailout, colorMode, reset, cycleColorMode };
});
