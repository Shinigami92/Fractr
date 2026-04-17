import { useTimeoutFn } from '@vueuse/core';
import { ref } from 'vue';

/**
 * Transient on-screen notification state. `show(text, duration?)` displays
 * the toast and hides it after `duration` ms (default 2000).
 */
export function useNotification() {
  const text = ref('');
  const visible = ref(false);
  const durationMs = ref(2000);

  const { start: startHide } = useTimeoutFn(
    () => {
      visible.value = false;
    },
    durationMs,
    { immediate: false },
  );

  function show(nextText: string, duration = 2000): void {
    text.value = nextText;
    visible.value = true;
    durationMs.value = duration;
    startHide();
  }

  return { text, visible, show };
}
