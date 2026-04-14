import { computed, ref } from 'vue';

export type InputMode = 'pointer' | 'touch';

// Detect initial mode: coarse primary pointer = touch device (phone/tablet),
// fine = desktop/laptop (even if it has a touchscreen, trackpad is primary).
const initialMode: InputMode =
  typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
    ? 'touch'
    : 'pointer';
const inputMode = ref<InputMode>(initialMode);
let mounted = false;
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

export function useInputMode() {
  function mount(): void {
    if (mounted) return;
    mounted = true;
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });
  }

  function unmount(): void {
    mounted = false;
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('keydown', onKeyDown);
  }

  return {
    inputMode,
    isTouchActive: computed(() => inputMode.value === 'touch'),
    mount,
    unmount,
  };
}
