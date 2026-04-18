<script setup lang="ts">
import { ref } from 'vue';
import { useInputMode } from '../../composables/useInputMode';
import { COLOR_MODE_OPTIONS } from '../../engine/colorModes';
import type { FractalType } from '../../engine/fractals/configs';
import { FRACTAL_CONFIGS } from '../../engine/fractals/configs';
import { RENDER_MODE_OPTIONS } from '../../engine/renderModes';
import { useAppState } from '../../stores/appState';
import { useControlSettings } from '../../stores/controlSettings';
import { useFractalParams } from '../../stores/fractalParams';
import { useGraphicsSettings } from '../../stores/graphicsSettings';
import { useHudSettings } from '../../stores/hudSettings';
import KeybindingsEditor from './KeybindingsEditor.vue';

const appState = useAppState();
const fractal = useFractalParams();
const graphics = useGraphicsSettings();
const controls = useControlSettings();
const hud = useHudSettings();
const { isTouchActive } = useInputMode();

type Tab = 'fractal' | 'graphics' | 'controls';
const activeTab = ref<Tab>('fractal');

function onBack(): void {
  appState.closeSettings();
}

function resetAll(): void {
  fractal.reset();
  graphics.reset();
  controls.reset();
}
</script>

<template>
  <div class="fixed inset-0 z-20 flex flex-col items-center sm:justify-center">
    <div class="absolute inset-0 bg-black/80" />

    <div
      class="relative z-10 flex h-full w-full max-w-lg flex-col gap-4 p-4 landscape:gap-2 landscape:p-3 sm:h-auto sm:max-h-[85vh] sm:gap-6 sm:p-8"
    >
      <h2
        class="shrink-0 text-center text-2xl font-bold tracking-[0.15em] text-white/90 landscape:text-lg"
        style="text-shadow: 0 0 20px rgba(124, 58, 237, 0.4)"
      >
        SETTINGS
      </h2>

      <!-- Tabs -->
      <div class="flex shrink-0 justify-center gap-1">
        <button
          v-for="tab in ['fractal', 'graphics', 'controls'] as const"
          :key="tab"
          class="cursor-pointer px-4 py-2 text-xs font-medium tracking-wider uppercase transition-colors"
          :class="
            activeTab === tab
              ? 'border-b-2 border-accent-bright text-white'
              : 'text-white/50 hover:text-white/80'
          "
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>

      <!-- Fractal Tab -->
      <div
        v-if="activeTab === 'fractal'"
        :key="fractal.fractalType"
        class="min-h-0 flex-1 overflow-y-auto"
      >
        <div class="flex flex-col gap-4">
          <label class="flex flex-col gap-1">
            <span class="text-xs text-white/50">Fractal Type</span>
            <select
              :value="fractal.fractalType"
              class="border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
              @change="
                fractal.setFractalType(($event.target as HTMLSelectElement).value as FractalType)
              "
            >
              <option v-for="(cfg, key) in FRACTAL_CONFIGS" :key="key" :value="key">
                {{ cfg.label }}
              </option>
            </select>
          </label>
          <label v-if="fractal.config.power" class="flex flex-col gap-1">
            <span class="text-xs text-white/50">{{ fractal.config.power.label }}</span>
            <input
              v-model.number="fractal.power"
              type="range"
              :min="fractal.config.power.min"
              :max="fractal.config.power.max"
              :step="fractal.config.power.step"
              class="accent-accent"
            />
            <span class="text-right font-mono text-xs text-white/70">{{
              fractal.power.toFixed(1)
            }}</span>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs text-white/50">{{ fractal.config.maxIterations.label }}</span>
            <input
              v-model.number="fractal.maxIterations"
              type="range"
              :min="fractal.config.maxIterations.min"
              :max="fractal.config.maxIterations.max"
              :step="fractal.config.maxIterations.step"
              class="accent-accent"
            />
            <span class="text-right font-mono text-xs text-white/70">{{
              fractal.maxIterations
            }}</span>
          </label>
          <label v-if="fractal.config.bailout" class="flex flex-col gap-1">
            <span class="text-xs text-white/50">{{ fractal.config.bailout.label }}</span>
            <input
              v-model.number="fractal.bailout"
              type="range"
              :min="fractal.config.bailout.min"
              :max="fractal.config.bailout.max"
              :step="fractal.config.bailout.step"
              class="accent-accent"
            />
            <span class="text-right font-mono text-xs text-white/70">{{
              fractal.bailout.toFixed(1)
            }}</span>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs text-white/50">Color Mode</span>
            <select
              v-model="fractal.colorMode"
              class="border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
            >
              <option v-for="opt in COLOR_MODE_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <!-- Graphics Tab -->
      <div v-if="activeTab === 'graphics'" class="min-h-0 flex-1 overflow-y-auto">
        <div class="flex flex-col gap-4">
          <label class="flex flex-col gap-1">
            <span class="text-xs text-white/50">Render Mode</span>
            <select
              v-model="fractal.renderMode"
              class="border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
            >
              <option v-for="opt in RENDER_MODE_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs text-white/50">Resolution Scale</span>
            <input
              v-model.number="graphics.resolutionScale"
              type="range"
              min="0.25"
              max="1"
              step="0.05"
              class="accent-accent"
            />
            <span class="text-right font-mono text-xs text-white/70"
              >{{ (graphics.resolutionScale * 100).toFixed(0) }}%</span
            >
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs text-white/50">Max Ray Steps</span>
            <input
              v-model.number="graphics.maxRaySteps"
              type="range"
              min="64"
              max="1024"
              step="16"
              class="accent-accent"
            />
            <span class="text-right font-mono text-xs text-white/70">{{
              graphics.maxRaySteps
            }}</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="graphics.adaptiveQuality" type="checkbox" class="accent-accent" />
            <span class="text-xs text-white/50">Adaptive Quality (auto-adjust for target FPS)</span>
          </label>
          <label v-if="graphics.adaptiveQuality" class="flex flex-col gap-1">
            <span class="text-xs text-white/50">Target FPS</span>
            <input
              v-model.number="graphics.targetFps"
              type="range"
              min="30"
              max="144"
              step="1"
              class="accent-accent"
            />
            <span class="text-right font-mono text-xs text-white/70">{{ graphics.targetFps }}</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="graphics.dynamicIterations" type="checkbox" class="accent-accent" />
            <span class="text-xs text-white/50">Dynamic Iterations (more detail when close)</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="graphics.animatedColors" type="checkbox" class="accent-accent" />
            <span class="text-xs text-white/50">Animated Colors</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="hud.showFps" type="checkbox" class="accent-accent" />
            <span class="text-xs text-white/50">Show FPS</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="hud.showCoordinates" type="checkbox" class="accent-accent" />
            <span class="text-xs text-white/50">Show Coordinates</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="hud.showCrosshair" type="checkbox" class="accent-accent" />
            <span class="text-xs text-white/50">Show Crosshair</span>
          </label>
        </div>
      </div>

      <!-- Controls Tab -->
      <div v-if="activeTab === 'controls'" class="min-h-0 flex-1 overflow-y-auto">
        <div class="flex flex-col gap-4">
          <label class="flex flex-col gap-1">
            <span class="text-xs text-white/50">Camera Speed</span>
            <input
              v-model.number="controls.cameraSpeed"
              type="range"
              min="0.5"
              max="10"
              step="0.1"
              class="accent-accent"
            />
            <span class="text-right font-mono text-xs text-white/70">{{
              controls.cameraSpeed.toFixed(1)
            }}</span>
          </label>
          <label v-if="!isTouchActive" class="flex flex-col gap-1">
            <span class="text-xs text-white/50">Mouse Sensitivity</span>
            <input
              v-model.number="controls.mouseSensitivity"
              type="range"
              min="0.0005"
              max="0.005"
              step="0.0001"
              class="accent-accent"
            />
            <span class="text-right font-mono text-xs text-white/70">{{
              controls.mouseSensitivity.toFixed(4)
            }}</span>
          </label>
          <p class="mt-2 text-xs text-white/30">
            {{
              isTouchActive
                ? 'Tap ? in-game for the full control reference.'
                : 'Press F1 in-game for the full control reference.'
            }}
          </p>
          <KeybindingsEditor v-if="!isTouchActive" class="mt-4" />
        </div>
      </div>

      <!-- Footer -->
      <div class="flex shrink-0 justify-between pt-2">
        <button
          class="cursor-pointer px-4 py-2 text-xs text-white/40 transition-colors hover:text-white/70"
          @click="resetAll"
        >
          Reset Defaults
        </button>
        <button
          class="cursor-pointer border border-white/10 bg-white/5 px-6 py-2 text-xs font-medium tracking-wider text-white/90 uppercase transition-all hover:border-accent-bright/40 hover:bg-accent/20"
          @click="onBack"
        >
          Back
        </button>
      </div>
    </div>
  </div>
</template>
