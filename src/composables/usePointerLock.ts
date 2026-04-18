/* oxlint-disable typescript/prefer-readonly-parameter-types -- Vue Ref has mutable .value; DOM events have mutating methods */
import { useEventListener } from '@vueuse/core';
import type { Ref } from 'vue';
import { ref } from 'vue';

function exitLock(): void {
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}

export function usePointerLock(canvas: Ref<HTMLCanvasElement | null>) {
  const isLocked = ref(false);
  let accumulatedX = 0;
  let accumulatedY = 0;

  function onMouseMove(e: MouseEvent): void {
    if (isLocked.value) {
      accumulatedX += e.movementX;
      accumulatedY += e.movementY;
    }
  }

  function onLockChange(): void {
    isLocked.value = document.pointerLockElement === canvas.value;
  }

  function requestLock(): void {
    const el = canvas.value;
    if (!el) return;
    try {
      // Modern Chromium returns a Promise that rejects with NotAllowedError
      // when there's no user gesture (e.g. HMR remount while mode='playing').
      // Older signatures return void. Swallow both forms — the canvas click
      // handler will retry on the next user click.
      const result: unknown = el.requestPointerLock();
      if (result instanceof Promise) {
        result.catch(() => {
          /* benign: no user gesture, or API unavailable */
        });
      }
    } catch {
      // Pointer Lock API not available (e.g. mobile browsers)
    }
  }

  function consumeMovement(): { dx: number; dy: number } {
    const dx = accumulatedX;
    const dy = accumulatedY;
    accumulatedX = 0;
    accumulatedY = 0;
    return { dx, dy };
  }

  useEventListener(document, 'mousemove', onMouseMove);
  useEventListener(document, 'pointerlockchange', onLockChange);

  return { isLocked, requestLock, exitLock, consumeMovement };
}
