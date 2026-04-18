<script setup lang="ts">
import { ref } from 'vue';
import type { FractalType } from '../../engine/fractals/configs';
import { FRACTAL_CONFIGS } from '../../engine/fractals/configs';
import { useAppState } from '../../stores/appState';
import { useFractalParams } from '../../stores/fractalParams';

const appState = useAppState();
const fractal = useFractalParams();

const fractalEntries = Object.entries(FRACTAL_CONFIGS) as Array<
  [FractalType, (typeof FRACTAL_CONFIGS)[FractalType]]
>;

const imgErrors = ref(new Set<string>());

function selectFractal(type: FractalType): void {
  fractal.setFractalType(type);
  appState.startGame();
}

function onBack(): void {
  appState.backToTitle();
}

function onImgError(key: string): void {
  imgErrors.value.add(key);
}
</script>

<template>
  <div class="fixed inset-0 z-20 flex flex-col items-center backdrop-blur-sm">
    <div class="absolute inset-0 bg-black/70" />

    <div class="relative z-10 flex h-full w-full max-w-5xl flex-col items-center gap-4 p-6">
      <h2
        class="shrink-0 text-3xl font-bold tracking-[0.15em] text-white/90"
        style="text-shadow: 0 0 20px rgba(124, 58, 237, 0.4)"
      >
        SELECT FRACTAL
      </h2>

      <div class="min-h-0 w-full flex-1 overflow-y-auto">
        <div class="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          <button
            v-for="[key, cfg] in fractalEntries"
            :key="key"
            class="group flex cursor-pointer flex-col overflow-hidden border border-white/10 bg-white/5 transition-all duration-200 hover:border-accent-bright/40 hover:bg-accent/10"
            @click="selectFractal(key)"
          >
            <div class="relative aspect-video w-full overflow-hidden bg-surface-dim">
              <img
                v-if="!imgErrors.has(key)"
                :src="`previews/${key}.webp`"
                :alt="cfg.label"
                class="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                loading="lazy"
                @error="onImgError(key)"
              />
              <div
                v-else
                class="flex h-full items-center justify-center text-lg font-bold text-white/10"
              >
                ?
              </div>
            </div>
            <div
              class="px-2 py-1.5 text-center text-[10px] font-medium tracking-wider text-white/70 uppercase group-hover:text-white"
            >
              {{ cfg.label }}
            </div>
          </button>
        </div>
      </div>

      <button
        class="shrink-0 cursor-pointer border border-white/10 bg-white/5 px-6 py-2 text-xs font-medium tracking-wider text-white/90 uppercase transition-all hover:border-accent-bright/40 hover:bg-accent/20"
        @click="onBack"
      >
        Back
      </button>
    </div>
  </div>
</template>
