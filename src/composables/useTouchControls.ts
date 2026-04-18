/* oxlint-disable typescript/prefer-readonly-parameter-types -- Vue Ref and TouchEvent have mutating internals */
import { useEventListener } from '@vueuse/core';
import type { Ref } from 'vue';
import { ref } from 'vue';

export interface TouchState {
  active: boolean;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
}

export interface UseTouchControlsOptions {
  canvas: Ref<HTMLCanvasElement | null>;
}

export interface UseTouchControlsReturn {
  leftTouch: Ref<TouchState | null>;
  rightTouch: Ref<TouchState | null>;
  getMovementVector: () => { x: number; y: number };
  consumeLookDelta: () => { dx: number; dy: number };
}

const DEAD_ZONE = 0.05;
const MAX_RADIUS = 80;

function screenMidX(): number {
  return window.innerWidth / 2;
}

function touchStateFromClientXY(clientX: number, clientY: number): TouchState {
  return {
    active: true,
    originX: clientX,
    originY: clientY,
    currentX: clientX,
    currentY: clientY,
  };
}

function joystickVector(lt: TouchState): { x: number; y: number } {
  let dx = (lt.currentX - lt.originX) / MAX_RADIUS;
  let dy = (lt.currentY - lt.originY) / MAX_RADIUS;
  // Clamp to unit circle
  const mag = Math.hypot(dx, dy);
  if (mag > 1) {
    dx /= mag;
    dy /= mag;
  }
  if (Math.abs(dx) < DEAD_ZONE) dx = 0;
  if (Math.abs(dy) < DEAD_ZONE) dy = 0;
  return { x: dx, y: dy };
}

interface TouchControlsState {
  leftTouch: Ref<TouchState | null>;
  rightTouch: Ref<TouchState | null>;
  leftId: number | null;
  rightId: number | null;
  lookDx: number;
  lookDy: number;
  rightPrevX: number;
  rightPrevY: number;
}

/* oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- state holder is intentionally mutated across handlers */
function handleTouchStart(state: TouchControlsState, e: TouchEvent): void {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const isLeft = touch.clientX < screenMidX();
    if (isLeft && state.leftId == null) {
      state.leftId = touch.identifier;
      state.leftTouch.value = touchStateFromClientXY(touch.clientX, touch.clientY);
    } else if (!isLeft && state.rightId == null) {
      state.rightId = touch.identifier;
      state.rightPrevX = touch.clientX;
      state.rightPrevY = touch.clientY;
      state.rightTouch.value = touchStateFromClientXY(touch.clientX, touch.clientY);
    }
  }
}

/* oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- state holder is intentionally mutated across handlers */
function handleTouchMove(state: TouchControlsState, e: TouchEvent): void {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    if (touch.identifier === state.leftId && state.leftTouch.value) {
      state.leftTouch.value = {
        ...state.leftTouch.value,
        currentX: touch.clientX,
        currentY: touch.clientY,
      };
    } else if (touch.identifier === state.rightId) {
      state.lookDx += touch.clientX - state.rightPrevX;
      state.lookDy += touch.clientY - state.rightPrevY;
      state.rightPrevX = touch.clientX;
      state.rightPrevY = touch.clientY;
      if (state.rightTouch.value) {
        state.rightTouch.value = {
          ...state.rightTouch.value,
          currentX: touch.clientX,
          currentY: touch.clientY,
        };
      }
    }
  }
}

/* oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- state holder is intentionally mutated across handlers */
function handleTouchEnd(state: TouchControlsState, e: TouchEvent): void {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    if (touch.identifier === state.leftId) {
      state.leftId = null;
      state.leftTouch.value = null;
    } else if (touch.identifier === state.rightId) {
      state.rightId = null;
      state.rightTouch.value = null;
    }
  }
}

function registerTouchListeners(
  canvas: Ref<HTMLCanvasElement | null>,
  state: TouchControlsState,
): void {
  useEventListener(
    canvas,
    'touchstart',
    (e) => {
      handleTouchStart(state, e);
    },
    { passive: false },
  );
  useEventListener(
    canvas,
    'touchmove',
    (e) => {
      handleTouchMove(state, e);
    },
    { passive: false },
  );
  useEventListener(
    canvas,
    'touchend',
    (e) => {
      handleTouchEnd(state, e);
    },
    { passive: false },
  );
  useEventListener(
    canvas,
    'touchcancel',
    (e) => {
      handleTouchEnd(state, e);
    },
    { passive: false },
  );
}

export function useTouchControls(options: UseTouchControlsOptions): UseTouchControlsReturn {
  const state: TouchControlsState = {
    leftTouch: ref<TouchState | null>(null),
    rightTouch: ref<TouchState | null>(null),
    leftId: null,
    rightId: null,
    lookDx: 0,
    lookDy: 0,
    rightPrevX: 0,
    rightPrevY: 0,
  };

  registerTouchListeners(options.canvas, state);

  return {
    leftTouch: state.leftTouch,
    rightTouch: state.rightTouch,
    getMovementVector: () =>
      state.leftTouch.value ? joystickVector(state.leftTouch.value) : { x: 0, y: 0 },
    consumeLookDelta: () => {
      const dx = state.lookDx;
      const dy = state.lookDy;
      state.lookDx = 0;
      state.lookDy = 0;
      return { dx, dy };
    },
  };
}
