<script setup lang="ts">
import { useControlSettings } from '../../stores/controlSettings';

const controls = useControlSettings();

interface KeyEntry {
  key: string;
  label: string;
}

interface KeyGroup {
  title: string;
  entries: KeyEntry[];
}

// Maps a KeyboardEvent.code to a display string ("KeyW" → "W", "F5" → "F5")
function display(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Comma') return ',';
  if (code === 'Period') return '.';
  if (code === 'Space') return 'Space';
  return code;
}

const groups: KeyGroup[] = [
  {
    title: 'Movement',
    entries: [
      {
        key: `${display(controls.keybindings.moveForward)} ${display(controls.keybindings.moveLeft)} ${display(controls.keybindings.moveBackward)} ${display(controls.keybindings.moveRight)}`,
        label: 'Move',
      },
      { key: 'Mouse', label: 'Look' },
      {
        key: `${display(controls.keybindings.rollLeft)} / ${display(controls.keybindings.rollRight)}`,
        label: 'Roll',
      },
      {
        key: `Shift+${display(controls.keybindings.rollLeft)} / Shift+${display(controls.keybindings.rollRight)}`,
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
        key: `${display(controls.keybindings.cycleColorMode)} / Shift+${display(controls.keybindings.cycleColorMode)}`,
        label: 'Cycle color mode',
      },
      {
        key: `${display(controls.keybindings.cycleRenderMode)} / Shift+${display(controls.keybindings.cycleRenderMode)}`,
        label: 'Cycle render mode',
      },
      {
        key: `${display(controls.keybindings.cycleFractalType)} / Shift+${display(controls.keybindings.cycleFractalType)}`,
        label: 'Cycle fractal',
      },
      {
        key: `Hold ${display(controls.keybindings.cycleColorMode)} / ${display(controls.keybindings.cycleRenderMode)} / ${display(controls.keybindings.cycleFractalType)}`,
        label: 'Open radial menu',
      },
    ],
  },
  {
    title: 'Fractal Parameters',
    entries: [
      { key: display(controls.keybindings.toggleDynamicIterations), label: 'Toggle dynamic iterations' },
      {
        key: `${display(controls.keybindings.increaseIterations)} / ${display(controls.keybindings.decreaseIterations)}`,
        label: 'Iterations +/-',
      },
      {
        key: `${display(controls.keybindings.increaseBailout)} / ${display(controls.keybindings.decreaseBailout)}`,
        label: 'Bailout +/-',
      },
      { key: display(controls.keybindings.toggleAnimatedColors), label: 'Toggle animated colors' },
      { key: 'Scroll wheel', label: 'Adjust max iterations' },
    ],
  },
  {
    title: 'Saves & Sharing',
    entries: [
      { key: display(controls.keybindings.quickSave), label: 'Quick save location' },
      { key: display(controls.keybindings.screenshot), label: 'Screenshot to clipboard' },
      { key: display(controls.keybindings.openSaves), label: 'Browse saved locations' },
      { key: display(controls.keybindings.copyShareURL), label: 'Copy share URL' },
    ],
  },
  {
    title: 'UI',
    entries: [
      { key: 'F1', label: 'Toggle this overlay' },
      { key: display(controls.keybindings.toggleHud), label: 'Toggle HUD' },
      { key: display(controls.keybindings.toggleCrosshair), label: 'Toggle crosshair' },
      { key: 'Esc', label: 'Pause / back' },
      { key: 'Ctrl', label: 'Unlock cursor (no pause)' },
    ],
  },
];
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div
      class="relative grid max-h-[90vh] max-w-5xl grid-cols-1 gap-x-8 gap-y-6 overflow-auto p-8 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div v-for="group in groups" :key="group.title" class="flex flex-col gap-2">
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
      <div
        class="col-span-full pt-2 text-center text-xs text-white/40"
      >
        Press F1 or Esc to close
      </div>
    </div>
  </div>
</template>
