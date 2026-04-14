import { type Ref, ref } from 'vue';

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
      canvas.value?.requestPointerLock();
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

  function mount(): void {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onLockChange);
  }

  function unmount(): void {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('pointerlockchange', onLockChange);
  }

  return { isLocked, requestLock, exitLock, consumeMovement, mount, unmount };
}
