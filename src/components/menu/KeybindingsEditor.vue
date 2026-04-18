<script setup lang="ts">
import { useEventListener } from '@vueuse/core';
import { computed, ref } from 'vue';
import type { ActionCategory, ActionId } from '../../input/actions';
import {
  ACTION_IDS,
  ACTIONS,
  displayKeyboardCode,
  RESERVED_KEYBOARD_CODES,
} from '../../input/actions';
import { useControlSettings } from '../../stores/controlSettings';

const controls = useControlSettings();

const REBINDABLE_IDS = ACTION_IDS.filter((id) => ACTIONS[id].rebindable !== false);

/** Display order of categories in the editor. */
const CATEGORY_ORDER: ActionCategory[] = ['Movement', 'Camera', 'Modes', 'Fractal', 'Saves', 'UI'];

/** Id of the action whose binding is currently being captured, or null. */
const capturing = ref<ActionId | null>(null);
/** Transient hint shown when the user tries to bind a reserved key. */
const rejectMessage = ref<string | null>(null);

interface Group {
  category: ActionCategory;
  ids: ActionId[];
}

const groups = computed<Group[]>(() => {
  const byCategory = new Map<ActionCategory, ActionId[]>();
  for (const id of REBINDABLE_IDS) {
    const cat = ACTIONS[id].category;
    const existing = byCategory.get(cat);
    if (existing) existing.push(id);
    else byCategory.set(cat, [id]);
  }
  return CATEGORY_ORDER.filter((cat) => byCategory.has(cat)).map((category) => ({
    category,
    ids: byCategory.get(category) ?? [],
  }));
});

function isOverridden(id: ActionId): boolean {
  return controls.overrides[id]?.keyboard != null;
}

function bindingDisplay(id: ActionId): string {
  const code = controls.getBinding(id, 'keyboard');
  return code ? displayKeyboardCode(code) : '—';
}

function startCapture(id: ActionId): void {
  capturing.value = id;
  rejectMessage.value = null;
}

function cancelCapture(): void {
  capturing.value = null;
  rejectMessage.value = null;
}

function resetBinding(id: ActionId): void {
  controls.setBinding(id, 'keyboard', undefined);
}

/**
 * Apply a captured key to the given action. If another action already uses
 * this key, swap bindings so both actions remain bound rather than leaving
 * the conflicting action silently broken.
 */
function applyBinding(id: ActionId, code: string): void {
  const conflict = REBINDABLE_IDS.find(
    (other) => other !== id && controls.getBinding(other, 'keyboard') === code,
  );
  if (conflict) {
    const previous = controls.getBinding(id, 'keyboard');
    controls.setBinding(conflict, 'keyboard', previous);
  }
  controls.setBinding(id, 'keyboard', code);
}

// Capture-phase keydown listener: only consumes events while a capture is
// active, so the rest of the app's key handling stays untouched.
useEventListener(
  window,
  'keydown',
  (e: KeyboardEvent) => {
    const id = capturing.value;
    if (!id) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.code === 'Escape') {
      cancelCapture();
      return;
    }
    // Ignore standalone modifier presses so users don't accidentally bind Shift
    // alone when they meant Shift+Something (modifier combos aren't supported
    // yet — only plain KeyboardEvent.code values).
    if (
      e.code === 'ShiftLeft' ||
      e.code === 'ShiftRight' ||
      e.code === 'AltLeft' ||
      e.code === 'AltRight' ||
      e.code === 'MetaLeft' ||
      e.code === 'MetaRight'
    ) {
      return;
    }
    // Reject keys reserved by the app shell (F1, Ctrl, etc.) — keep capture
    // active so the user can pick a different key.
    if (RESERVED_KEYBOARD_CODES.has(e.code)) {
      rejectMessage.value = `${displayKeyboardCode(e.code)} is reserved`;
      return;
    }
    applyBinding(id, e.code);
    capturing.value = null;
    rejectMessage.value = null;
  },
  { capture: true },
);
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium tracking-wider text-white/70 uppercase">Keybindings</span>
      <span v-if="capturing && rejectMessage" class="text-xs text-red-400">
        {{ rejectMessage }} — pick another
      </span>
      <span v-else-if="capturing" class="text-xs text-accent-bright">
        Press a key… (Esc to cancel)
      </span>
    </div>
    <div v-for="group in groups" :key="group.category" class="flex flex-col gap-1">
      <h4 class="text-[10px] font-medium tracking-[0.2em] text-white/40 uppercase">
        {{ group.category }}
      </h4>
      <div
        v-for="id in group.ids"
        :key="id"
        class="flex items-center justify-between gap-2 py-1 text-xs"
      >
        <span class="truncate text-white/70">{{ ACTIONS[id].label }}</span>
        <div class="flex items-center gap-1">
          <button
            class="min-w-18 cursor-pointer border px-2 py-1 font-mono transition-colors"
            :class="
              capturing === id
                ? 'border-accent-bright bg-accent/30 text-white'
                : 'border-white/10 bg-white/5 text-white/90 hover:border-accent-bright/40 hover:bg-accent/10'
            "
            @click="capturing === id ? cancelCapture() : startCapture(id)"
          >
            {{ capturing === id ? '…' : bindingDisplay(id) }}
          </button>
          <button
            class="cursor-pointer px-1.5 py-1 text-[10px] text-white/30 transition-colors hover:text-white/70 disabled:invisible"
            :disabled="!isOverridden(id)"
            title="Reset to default"
            @click="resetBinding(id)"
          >
            ↺
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
