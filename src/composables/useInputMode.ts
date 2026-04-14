import { computed, ref } from 'vue';

export type InputMode = 'pointer' | 'touch';

const inputMode = ref<InputMode>('pointer');
let mounted = false;

function onTouchStart(): void {
  inputMode.value = 'touch';
}

function onMouseMove(): void {
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
