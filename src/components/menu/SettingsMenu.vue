<script setup lang="ts">
import { ref } from 'vue';
import { useAppState } from '../../stores/appState';
import { useControlSettings } from '../../stores/controlSettings';
import {
  COLOR_MODE_OPTIONS,
  FRACTAL_CONFIGS,
  type FractalType,
  RENDER_MODE_OPTIONS,
  useFractalParams,
} from '../../stores/fractalParams';
import { useGraphicsSettings } from '../../stores/graphicsSettings';
import { useHudSettings } from '../../stores/hudSettings';

const appState = useAppState();
const fractal = useFractalParams();
const graphics = useGraphicsSettings();
const controls = useControlSettings();
const hud = useHudSettings();

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
  <div class="fixed inset-0 z-20 flex flex-col items-center justify-center">
    <div class="absolute inset-0 bg-black/80" />

    <div class="relative z-10 flex w-full max-w-lg flex-col gap-6 p-8">
      <h2
        class="text-center text-2xl font-bold tracking-[0.15em] text-white/90"
        style="text-shadow: 0 0 20px rgba(124, 58, 237, 0.4)"
      >
        SETTINGS
      </h2>

      <!-- Tabs -->
      <div class="flex justify-center gap-1">
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
      <div v-if="activeTab === 'fractal'" :key="fractal.fractalType" class="flex flex-col gap-4">
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

      <!-- Graphics Tab -->
      <div v-if="activeTab === 'graphics'" class="flex flex-col gap-4">
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
            max="512"
            step="16"
            class="accent-accent"
          />
          <span class="text-right font-mono text-xs text-white/70">{{ graphics.maxRaySteps }}</span>
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

      <!-- Controls Tab -->
      <div v-if="activeTab === 'controls'" class="flex flex-col gap-4">
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
        <label class="flex flex-col gap-1">
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
        <div class="mt-2 text-xs text-white/30">
          <p>W/A/S/D — Move</p>
          <p>Q/E — Roll</p>
          <p>Shift+Q/E — Up/Down</p>
          <p>Mouse — Look</p>
          <p>Escape — Pause</p>
          <p>F3 — Toggle HUD</p>
          <p>H — Toggle Crosshair</p>
          <p>C — Cycle Color Mode</p>
          <p>V — Cycle Fractal Type</p>
          <p>I — Toggle Dynamic Iterations</p>
          <p>. / , — Increase/Decrease Max Iterations</p>
          <p>K / J — Increase/Decrease Bailout</p>
          <p>G — Toggle Animated Colors</p>
          <p>R — Cycle Render Mode</p>
          <p>F5 — Quick Save Location</p>
          <p>B — Saved Locations</p>
          <p>P — Copy Share URL</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-between pt-2">
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
