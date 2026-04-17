import { useEventListener, useMediaQuery } from '@vueuse/core';
import { computed, ref } from 'vue';

export type InputMode = 'pointer' | 'touch';

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
 */
export function installInputModeDetection(): void {
  useEventListener(window, 'touchstart', onTouchStart, { passive: true });
  useEventListener(window, 'mousemove', onMouseMove, { passive: true });
  useEventListener(window, 'keydown', onKeyDown, { passive: true });
}

export function useInputMode() {
  return {
    inputMode,
    isTouchActive: computed(() => inputMode.value === 'touch'),
  };
}
