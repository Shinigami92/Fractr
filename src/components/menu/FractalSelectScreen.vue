<script setup lang="ts">
import { useAppState } from '../../stores/appState';
import { FRACTAL_CONFIGS, type FractalType, useFractalParams } from '../../stores/fractalParams';

const appState = useAppState();
const fractal = useFractalParams();

const fractalEntries = Object.entries(FRACTAL_CONFIGS) as [
  FractalType,
  (typeof FRACTAL_CONFIGS)[FractalType],
][];

function selectFractal(type: FractalType): void {
  fractal.setFractalType(type);
  appState.startGame();
}

function onBack(): void {
  appState.backToTitle();
}
</script>

<template>
  <div class="fixed inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
    <div class="absolute inset-0 bg-black/70" />

    <div class="relative z-10 flex w-full max-w-4xl flex-col items-center gap-6 p-8">
      <h2
        class="text-3xl font-bold tracking-[0.15em] text-white/90"
        style="text-shadow: 0 0 20px rgba(124, 58, 237, 0.4)"
      >
        SELECT FRACTAL
      </h2>

      <div class="grid w-full grid-cols-3 gap-3">
        <button
          v-for="[key, cfg] in fractalEntries"
          :key="key"
          class="group flex cursor-pointer flex-col overflow-hidden border border-white/10 bg-white/5 transition-all duration-200 hover:border-accent-bright/40 hover:bg-accent/10"
          @click="selectFractal(key)"
        >
          <div class="relative aspect-video w-full overflow-hidden bg-surface-dim">
            <img
              :src="`previews/${key}.png`"
              :alt="cfg.label"
              class="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
              loading="lazy"
            />
          </div>
          <div
            class="px-3 py-2 text-center text-xs font-medium tracking-wider text-white/70 uppercase group-hover:text-white"
          >
            {{ cfg.label }}
          </div>
        </button>
      </div>

      <button
        class="cursor-pointer border border-white/10 bg-white/5 px-6 py-2 text-xs font-medium tracking-wider text-white/90 uppercase transition-all hover:border-accent-bright/40 hover:bg-accent/20"
        @click="onBack"
      >
        Back
      </button>
    </div>
  </div>
</template>
