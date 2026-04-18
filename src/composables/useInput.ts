import { useEventListener } from '@vueuse/core';
import { onScopeDispose } from 'vue';

export interface UseInputReturn {
  isPressed: (code: string) => boolean;
}

const pressedKeys = new Set<string>();

/* oxlint-disable typescript/prefer-readonly-parameter-types -- DOM event types have mutating methods */
export function useInput(): UseInputReturn {
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
  /* oxlint-enable typescript/prefer-readonly-parameter-types */

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
