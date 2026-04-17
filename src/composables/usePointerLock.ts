import { useEventListener } from '@vueuse/core';
import type { Ref } from 'vue';
import { ref } from 'vue';

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
    try {
      void canvas.value?.requestPointerLock();
    } catch {
      // Pointer Lock API not available (e.g. mobile browsers)
    }
  }

  function exitLock(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
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
