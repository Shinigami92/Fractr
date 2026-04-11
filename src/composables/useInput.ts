import { onMounted, onUnmounted } from 'vue';

const pressedKeys = new Set<string>();

export function useInput() {
  function onKeyDown(e: KeyboardEvent): void {
    pressedKeys.add(e.code);
  }

  function onKeyUp(e: KeyboardEvent): void {
    pressedKeys.delete(e.code);
  }

  function onBlur(): void {
    pressedKeys.clear();
  }

  function isPressed(code: string): boolean {
    return pressedKeys.has(code);
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    pressedKeys.clear();
  });

  return { isPressed };
}
