import { useEventListener, useMediaQuery } from '@vueuse/core';
import type { ComputedRef, Ref } from 'vue';
import { computed, ref, watch } from 'vue';
import { useGamepadInput } from './useGamepadInput';

export type InputMode = 'pointer' | 'touch' | 'gamepad';

export interface UseInputModeReturn {
  inputMode: Ref<InputMode>;
  isTouchActive: ComputedRef<boolean>;
  isGamepadActive: ComputedRef<boolean>;
}

// Detect initial mode: coarse primary pointer = touch device (phone/tablet),
// fine = desktop/laptop (even if it has a touchscreen, trackpad is primary).
const isCoarsePointer = useMediaQuery('(pointer: coarse)');
const inputMode = ref<InputMode>(isCoarsePointer.value ? 'touch' : 'pointer');
// Mobile browsers synthesize mousemove after touch events; ignore those.
let lastTouchTime = 0;
const TOUCH_COOLDOWN = 1000;

function onTouchStart(): void {
  lastTouchTime = performance.now();
  inputMode.value = 'touch';
}

function onMouseMove(): void {
  if (performance.now() - lastTouchTime < TOUCH_COOLDOWN) return;
  if (inputMode.value !== 'pointer') {
    inputMode.value = 'pointer';
  }
}

function onKeyDown(): void {
  if (inputMode.value !== 'pointer') {
    inputMode.value = 'pointer';
  }
}

/**
 * Install global input-mode detection listeners. Call once from the root
 * component (App.vue). Other consumers should call `useInputMode()` to
 * read the reactive mode without re-attaching listeners.
 *
 * Active input mode flips to match the last used device: mouse/keyboard →
 * 'pointer', touch → 'touch', any gamepad button/stick activity → 'gamepad'.
 */
export function installInputModeDetection(): void {
  useEventListener(window, 'touchstart', onTouchStart, { passive: true });
  useEventListener(window, 'mousemove', onMouseMove, { passive: true });
  useEventListener(window, 'keydown', onKeyDown, { passive: true });

  // Gamepad activity → flip to 'gamepad'. `isActive` is edge-triggered inside
  // useGamepadInput (already deadzoned), so this watcher only wakes when the
  // pad goes from idle to active and vice versa — not every rAF poll.
  const gamepad = useGamepadInput();
  watch(gamepad.isActive, (active) => {
    if (active && inputMode.value !== 'gamepad') {
      inputMode.value = 'gamepad';
    }
  });
}

export function useInputMode(): UseInputModeReturn {
  return {
    inputMode,
    isTouchActive: computed(() => inputMode.value === 'touch'),
    isGamepadActive: computed(() => inputMode.value === 'gamepad'),
  };
}
