<script setup lang="ts">
import { computed } from 'vue';
import { useInputMode } from '../../composables/useInputMode';
import type { ActionId } from '../../input/actions';
import { displayKeyboardCode } from '../../input/actions';
import { useControlSettings } from '../../stores/controlSettings';

const emit = defineEmits<{ close: [] }>();
const controls = useControlSettings();
const { isTouchActive } = useInputMode();

interface KeyEntry {
  key: string;
  label: string;
}

interface KeyGroup {
  title: string;
  entries: KeyEntry[];
}

function key(id: ActionId): string {
  const code = controls.getBinding(id, 'keyboard');
  return code ? displayKeyboardCode(code) : '?';
}

const keyboardGroups = computed<KeyGroup[]>(() => [
  {
    title: 'Movement',
    entries: [
      {
        key: `${key('moveForward')} ${key('moveLeft')} ${key('moveBackward')} ${key('moveRight')}`,
        label: 'Move',
      },
      { key: 'Mouse', label: 'Look' },
      {
        key: `${key('rollLeft')} / ${key('rollRight')}`,
        label: 'Roll',
      },
      {
        key: `Shift+${key('rollLeft')} / Shift+${key('rollRight')}`,
        label: 'Up / Down',
      },
      { key: 'Shift', label: 'Sprint (2x)' },
      { key: 'Left click', label: 'Move forward' },
      { key: 'Right click', label: 'Move backward' },
    ],
  },
  {
    title: 'Modes',
    entries: [
      {
        key: `${key('cycleColorMode')} / Shift+${key('cycleColorMode')}`,
        label: 'Cycle color mode',
      },
      {
        key: `${key('cycleRenderMode')} / Shift+${key('cycleRenderMode')}`,
        label: 'Cycle render mode',
      },
      {
        key: `${key('cycleFractalType')} / Shift+${key('cycleFractalType')}`,
        label: 'Cycle fractal',
      },
      {
        key: `Hold ${key('cycleColorMode')} / ${key('cycleRenderMode')} / ${key('cycleFractalType')}`,
        label: 'Open radial menu',
      },
    ],
  },
  {
    title: 'Fractal Parameters',
    entries: [
      { key: key('toggleDynamicIterations'), label: 'Toggle dynamic iterations' },
      {
        key: `${key('increaseIterations')} / ${key('decreaseIterations')}`,
        label: 'Iterations +/-',
      },
      {
        key: `${key('increaseBailout')} / ${key('decreaseBailout')}`,
        label: 'Bailout +/-',
      },
      { key: key('toggleAnimatedColors'), label: 'Toggle animated colors' },
      { key: 'Scroll wheel', label: 'Adjust max iterations' },
    ],
  },
  {
    title: 'Saves & Sharing',
    entries: [
      { key: key('quickSave'), label: 'Quick save location' },
      { key: key('screenshot'), label: 'Screenshot to clipboard' },
      { key: key('openSaves'), label: 'Browse saved locations' },
      { key: key('copyShareURL'), label: 'Copy share URL' },
    ],
  },
  {
    title: 'UI',
    entries: [
      { key: 'F1', label: 'Toggle this overlay' },
      { key: key('toggleHud'), label: 'Toggle HUD' },
      { key: key('toggleCrosshair'), label: 'Toggle crosshair' },
      { key: 'Esc', label: 'Pause / back' },
      { key: 'Ctrl', label: 'Unlock cursor (no pause)' },
    ],
  },
]);

const touchGroups: KeyGroup[] = [
  {
    title: 'Movement',
    entries: [
      { key: 'Left half drag', label: 'Move (analog)' },
      { key: 'Right half drag', label: 'Look around' },
    ],
  },
  {
    title: 'Actions',
    entries: [
      { key: 'Pause button', label: 'Open pause menu' },
      { key: '? button', label: 'Toggle this overlay' },
    ],
  },
  {
    title: 'Via Pause Menu',
    entries: [
      { key: 'Settings', label: 'Graphics, controls, keybindings' },
      { key: 'Saved Locations', label: 'Load, save, export' },
      { key: 'Resume', label: 'Back to exploring' },
    ],
  },
];

const activeGroups = computed(() => (isTouchActive.value ? touchGroups : keyboardGroups.value));
</script>

<template>
  <div
    :class="isTouchActive ? 'pointer-events-auto' : 'pointer-events-none'"
    class="fixed inset-0 z-30 flex items-center justify-center"
    @touchstart.prevent
  >
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div
      class="relative grid max-h-[90vh] max-w-5xl grid-cols-1 gap-x-8 gap-y-6 overflow-auto p-8 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div v-for="group in activeGroups" :key="group.title" class="flex flex-col gap-2">
        <h3
          class="border-b border-white/10 pb-1 text-xs font-medium tracking-[0.2em] text-accent-bright/80 uppercase"
        >
          {{ group.title }}
        </h3>
        <div class="flex flex-col gap-1.5">
          <div
            v-for="entry in group.entries"
            :key="entry.label"
            class="flex items-center justify-between gap-4 text-xs"
          >
            <span class="text-white/70">{{ entry.label }}</span>
            <kbd
              class="border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-white/90 whitespace-nowrap"
            >
              {{ entry.key }}
            </kbd>
          </div>
        </div>
      </div>
      <div class="col-span-full pt-2 text-center text-xs text-white/40">
        <button
          v-if="isTouchActive"
          class="pointer-events-auto cursor-pointer border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wider text-white/70 uppercase transition-colors active:bg-white/20"
          @touchstart.stop.prevent="emit('close')"
          @click.stop="emit('close')"
        >
          Close
        </button>
        <template v-else>Press F1 or Esc to close</template>
      </div>
    </div>
  </div>
</template>
