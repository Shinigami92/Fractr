import { defineStore } from 'pinia';
import { ref } from 'vue';

export type FractalType = 'mandelbulb' | 'mandelbox' | 'menger';
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
  const FRACTAL_TYPES: FractalType[] = ['mandelbulb', 'mandelbox', 'menger'];

  const FRACTAL_DEFAULTS: Record<FractalType, { power: number; maxIterations: number; bailout: number }> = {
    mandelbulb: { power: 8, maxIterations: 20, bailout: 2 },
    mandelbox: { power: -1.5, maxIterations: 15, bailout: 100 },
    menger: { power: 3, maxIterations: 6, bailout: 100 },
  };

  function cycleColorMode(): void {
    const idx = COLOR_MODES.indexOf(colorMode.value);
    colorMode.value = COLOR_MODES[(idx + 1) % COLOR_MODES.length]!;
  }

  function cycleFractalType(): void {
    const idx = FRACTAL_TYPES.indexOf(fractalType.value);
    const next = FRACTAL_TYPES[(idx + 1) % FRACTAL_TYPES.length]!;
    setFractalType(next);
  }

  function setFractalType(type: FractalType): void {
    fractalType.value = type;
    const defaults = FRACTAL_DEFAULTS[type];
    power.value = defaults.power;
    maxIterations.value = defaults.maxIterations;
    bailout.value = defaults.bailout;
  }

  return {
    fractalType,
    power,
    maxIterations,
    bailout,
    colorMode,
    reset,
    cycleColorMode,
    cycleFractalType,
    setFractalType,
  };
});
