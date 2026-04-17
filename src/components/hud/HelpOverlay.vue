<script setup lang="ts">
import { computed } from 'vue';
import { useInputMode } from '../../composables/useInputMode';
import type { ActionCategory } from '../../input/actions';
import { ACTION_IDS, ACTIONS, displayKeyboardCode } from '../../input/actions';
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

/** Display title + order for each category when rendering the overlay. */
const CATEGORY_ORDER: ActionCategory[] = ['Movement', 'Modes', 'Fractal', 'Saves', 'UI'];
const CATEGORY_TITLES: Record<ActionCategory, string> = {
  Movement: 'Movement',
  Camera: 'Camera',
  Modes: 'Modes',
  Fractal: 'Fractal Parameters',
  Saves: 'Saves & Sharing',
  UI: 'UI',
};

/**
 * Supplementary entries that are intrinsic to the app shell (mouse, modifiers,
 * hardcoded UI hotkeys) and therefore not part of the rebindable action
 * registry. Merged in under the matching category.
 */
const EXTRA_ENTRIES: ReadonlyArray<KeyEntry & { category: ActionCategory }> = [
  { category: 'Movement', key: 'Mouse', label: 'Look' },
  { category: 'Movement', key: 'Shift', label: 'Sprint (2x)' },
  { category: 'Movement', key: 'Left click', label: 'Move forward' },
  { category: 'Movement', key: 'Right click', label: 'Move backward' },
  { category: 'Modes', key: 'Shift + cycle key', label: 'Reverse cycle direction' },
  { category: 'Modes', key: 'Hold cycle key', label: 'Open radial menu' },
  { category: 'Fractal', key: 'Scroll wheel', label: 'Adjust max iterations' },
  { category: 'UI', key: 'F1', label: 'Toggle this overlay' },
  { category: 'UI', key: 'Esc', label: 'Pause / back' },
  { category: 'UI', key: 'Ctrl', label: 'Unlock cursor (no pause)' },
];

const keyboardGroups = computed<KeyGroup[]>(() => {
  const byCategory = new Map<ActionCategory, KeyEntry[]>();
  const push = (cat: ActionCategory, entry: KeyEntry): void => {
    const list = byCategory.get(cat);
    if (list) list.push(entry);
    else byCategory.set(cat, [entry]);
  };

  for (const id of ACTION_IDS) {
    const action = ACTIONS[id];
    const code = controls.getBinding(id, 'keyboard');
    push(action.category, {
      key: code ? displayKeyboardCode(code) : '—',
      label: action.label,
    });
  }
  for (const extra of EXTRA_ENTRIES) {
    push(extra.category, { key: extra.key, label: extra.label });
  }

  return CATEGORY_ORDER.filter((cat) => byCategory.has(cat)).map((cat) => ({
    title: CATEGORY_TITLES[cat],
    entries: byCategory.get(cat) ?? [],
  }));
});

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
