import { ref } from 'vue';

export interface TouchState {
  active: boolean;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
}

const DEAD_ZONE = 0.05;
const MAX_RADIUS = 80;

export function useTouchControls() {
  const leftTouch = ref<TouchState | null>(null);
  const rightTouch = ref<TouchState | null>(null);

  // Track which Touch.identifier belongs to which side
  let leftId: number | null = null;
  let rightId: number | null = null;

  // Accumulated look delta (consumed each frame like usePointerLock)
  let lookDx = 0;
  let lookDy = 0;
  // Previous position for right-touch delta calculation
  let rightPrevX = 0;
  let rightPrevY = 0;

  let canvas: HTMLCanvasElement | null = null;

  function screenMidX(): number {
    return window.innerWidth / 2;
  }

  function onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const isLeft = touch.clientX < screenMidX();

      if (isLeft && leftId === null) {
        leftId = touch.identifier;
        leftTouch.value = {
          active: true,
          originX: touch.clientX,
          originY: touch.clientY,
          currentX: touch.clientX,
          currentY: touch.clientY,
        };
      } else if (!isLeft && rightId === null) {
        rightId = touch.identifier;
        rightPrevX = touch.clientX;
        rightPrevY = touch.clientY;
        rightTouch.value = {
          active: true,
          originX: touch.clientX,
          originY: touch.clientY,
          currentX: touch.clientX,
          currentY: touch.clientY,
        };
      }
    }
  }

  function onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === leftId && leftTouch.value) {
        leftTouch.value = {
          ...leftTouch.value,
          currentX: touch.clientX,
          currentY: touch.clientY,
        };
      } else if (touch.identifier === rightId) {
        lookDx += touch.clientX - rightPrevX;
        lookDy += touch.clientY - rightPrevY;
        rightPrevX = touch.clientX;
        rightPrevY = touch.clientY;
        if (rightTouch.value) {
          rightTouch.value = {
            ...rightTouch.value,
            currentX: touch.clientX,
            currentY: touch.clientY,
          };
        }
      }
    }
  }

  function onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === leftId) {
        leftId = null;
        leftTouch.value = null;
      } else if (touch.identifier === rightId) {
        rightId = null;
        rightTouch.value = null;
      }
    }
  }

  /** Current movement joystick deflection, [-1, 1] per axis. */
  function getMovementVector(): { x: number; y: number } {
    if (!leftTouch.value) return { x: 0, y: 0 };
    const lt = leftTouch.value;
    let dx = (lt.currentX - lt.originX) / MAX_RADIUS;
    let dy = (lt.currentY - lt.originY) / MAX_RADIUS;
    // Clamp to unit circle
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    // Dead zone
    if (Math.abs(dx) < DEAD_ZONE) dx = 0;
    if (Math.abs(dy) < DEAD_ZONE) dy = 0;
    return { x: dx, y: dy };
  }

  /** Accumulated look delta since last consume. */
  function consumeLookDelta(): { dx: number; dy: number } {
    const dx = lookDx;
    const dy = lookDy;
    lookDx = 0;
    lookDy = 0;
    return { dx, dy };
  }

  function mount(el: HTMLCanvasElement): void {
    canvas = el;
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });
  }

  function unmount(): void {
    if (!canvas) return;
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('touchcancel', onTouchEnd);
    canvas = null;
  }

  return {
    leftTouch,
    rightTouch,
    getMovementVector,
    consumeLookDelta,
    mount,
    unmount,
  };
}
