import { onMounted, onUnmounted } from 'vue';

const pressedKeys = new Set<string>();

export function useInput() {
  function onKeyDown(e: KeyboardEvent): void {
    pressedKeys.add(e.code);
  }

  function onKeyUp(e: KeyboardEvent): void {
    pressedKeys.delete(e.code);
  }

  function onMouseDown(e: MouseEvent): void {
    pressedKeys.add(`Mouse${e.button}`);
  }

  function onMouseUp(e: MouseEvent): void {
    pressedKeys.delete(`Mouse${e.button}`);
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
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onBlur);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('blur', onBlur);
    pressedKeys.clear();
  });

  return { isPressed };
}
