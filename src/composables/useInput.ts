import { useEventListener } from '@vueuse/core';
import { onScopeDispose } from 'vue';

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

  useEventListener(window, 'keydown', onKeyDown);
  useEventListener(window, 'keyup', onKeyUp);
  useEventListener(window, 'mousedown', onMouseDown);
  useEventListener(window, 'mouseup', onMouseUp);
  useEventListener(window, 'blur', onBlur);

  onScopeDispose(() => {
    pressedKeys.clear();
  });

  return { isPressed };
}
