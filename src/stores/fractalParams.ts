import { acceptHMRUpdate, defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ColorMode } from '../engine/colorModes';
import { COLOR_MODES } from '../engine/colorModes';
import type { FractalType } from '../engine/fractals/configs';
import { FRACTAL_CONFIGS, FRACTAL_TYPES } from '../engine/fractals/configs';
import type { RenderMode } from '../engine/renderModes';
import { RENDER_MODES } from '../engine/renderModes';

/** Returns the next value in a cyclic list (wraps at both ends). */
function nextInCycle<T>(list: ReadonlyArray<T>, current: T, reverse: boolean): T {
  const idx = list.indexOf(current);
  const delta = reverse ? list.length - 1 : 1;
  return list[(idx + delta) % list.length]!;
}

/* oxlint-disable-next-line eslint/max-lines-per-function -- pinia setup-store factory listing all refs + actions; no meaningful split */
export const useFractalParams = defineStore('fractalParams', () => {
  const fractalType = ref<FractalType>('mandelbulb');
  const power = ref(8);
  const maxIterations = ref(20);
  const bailout = ref(2);
  const colorMode = ref<ColorMode>('glow');
  const renderMode = ref<RenderMode>('ray');

  const config = computed(() => FRACTAL_CONFIGS[fractalType.value]);

  function setFractalType(type: FractalType): void {
    fractalType.value = type;
    const cfg = FRACTAL_CONFIGS[type];
    power.value = cfg.power?.default ?? 0;
    maxIterations.value = cfg.maxIterations.default;
    bailout.value = cfg.bailout?.default ?? 0;
  }

  function adjustIterations(delta: number): void {
    const cfg = FRACTAL_CONFIGS[fractalType.value].maxIterations;
    maxIterations.value = Math.max(cfg.min, Math.min(cfg.max, maxIterations.value + delta));
  }

  function adjustBailout(delta: number): void {
    const cfg = FRACTAL_CONFIGS[fractalType.value].bailout;
    if (!cfg) return;
    bailout.value = Math.max(cfg.min, Math.min(cfg.max, bailout.value + delta));
  }

  return {
    fractalType,
    power,
    maxIterations,
    bailout,
    colorMode,
    renderMode,
    config,
    reset: () => {
      setFractalType('mandelbulb');
      colorMode.value = 'glow';
      renderMode.value = 'ray';
    },
    cycleColorMode: (reverse = false) => {
      colorMode.value = nextInCycle(COLOR_MODES, colorMode.value, reverse);
    },
    cycleRenderMode: (reverse = false) => {
      renderMode.value = nextInCycle(RENDER_MODES, renderMode.value, reverse);
    },
    cycleFractalType: (reverse = false) => {
      setFractalType(nextInCycle(FRACTAL_TYPES, fractalType.value, reverse));
    },
    setFractalType,
    adjustIterations,
    adjustBailout,
  };
});

export type FractalParamsStore = ReturnType<typeof useFractalParams>;

if (import.meta.hot) {
  const hmrHandler = acceptHMRUpdate(useFractalParams, import.meta.hot);
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Vite HMR mod type is not readonly
  import.meta.hot.accept((mod) => {
    hmrHandler(mod);
  });
}
