import { useEventListener } from '@vueuse/core';
import { onScopeDispose, ref } from 'vue';
import type { GamepadVendor } from '../input/gamepadVendor';
import { detectGamepadVendor } from '../input/gamepadVendor';

/**
 * Gamepad state polling. Module-level singleton because only one gamepad is
 * active at a time and state is global to the app. Components call
 * `useGamepadInput()` to get access; listener registrations auto-unsubscribe
 * on scope dispose.
 *
 * The Gamepad API has no "button pressed" event — we must poll. Polling runs
 * via rAF while a gamepad is connected and stops on disconnect.
 */

/** Deadzone applied to analog stick axes to ignore resting-position drift. */
const STICK_DEADZONE = 0.15;

interface StickVector {
  x: number;
  y: number;
}

export interface GamepadButtonEvent {
  /** 'Button0'..'ButtonN', mapping to the W3C standard gamepad layout. */
  readonly code: string;
}

type ButtonListener = (event: GamepadButtonEvent) => void;

const connectedIndex = ref<number | null>(null);
const vendor = ref<GamepadVendor>('generic');
const pressedButtons = ref<ReadonlySet<string>>(new Set());
const leftStick = ref<StickVector>({ x: 0, y: 0 });
const rightStick = ref<StickVector>({ x: 0, y: 0 });

const buttonListeners = new Set<ButtonListener>();
let pollHandle: number | null = null;
let previousButtons: Set<string> = new Set();

function applyDeadzone(value: number): number {
  return Math.abs(value) < STICK_DEADZONE ? 0 : value;
}

function resetState(): void {
  pressedButtons.value = new Set();
  previousButtons = new Set();
  leftStick.value = { x: 0, y: 0 };
  rightStick.value = { x: 0, y: 0 };
}

function pollGamepads(): void {
  const idx = connectedIndex.value;
  if (idx == null) {
    pollHandle = null;
    return;
  }
  const gp = navigator.getGamepads()[idx];
  if (!gp) {
    pollHandle = requestAnimationFrame(pollGamepads);
    return;
  }

  const current = new Set<string>();
  for (let i = 0; i < gp.buttons.length; i++) {
    const button = gp.buttons[i];
    if (button?.pressed === true) {
      const code = `Button${i}`;
      current.add(code);
      if (!previousButtons.has(code)) {
        for (const listener of buttonListeners) {
          listener({ code });
        }
      }
    }
  }
  pressedButtons.value = current;
  previousButtons = current;

  const axes = gp.axes;
  const l = {
    x: applyDeadzone(axes[0] ?? 0),
    y: applyDeadzone(axes[1] ?? 0),
  };
  const r = {
    x: applyDeadzone(axes[2] ?? 0),
    y: applyDeadzone(axes[3] ?? 0),
  };
  leftStick.value = l;
  rightStick.value = r;

  pollHandle = requestAnimationFrame(pollGamepads);
}

function startPolling(): void {
  if (pollHandle != null) return;
  pollHandle = requestAnimationFrame(pollGamepads);
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Gamepad is a DOM type with mutating internals
function attachGamepad(gamepad: Gamepad): void {
  if (connectedIndex.value != null) return;
  connectedIndex.value = gamepad.index;
  vendor.value = detectGamepadVendor(gamepad.id);
  startPolling();
}

function detachGamepad(index: number): void {
  if (connectedIndex.value !== index) return;
  connectedIndex.value = null;
  vendor.value = 'generic';
  resetState();
  if (pollHandle != null) {
    cancelAnimationFrame(pollHandle);
    pollHandle = null;
  }
}

let initialized = false;

export function useGamepadInput() {
  // Register global connect/disconnect listeners once. Further
  // useGamepadInput() calls just surface the same reactive refs.
  if (!initialized) {
    initialized = true;
    window.addEventListener(
      'gamepadconnected',
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event
      (e) => {
        attachGamepad(e.gamepad);
      },
    );
    window.addEventListener(
      'gamepaddisconnected',
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event
      (e) => {
        detachGamepad(e.gamepad.index);
      },
    );
    // On some browsers the `gamepadconnected` event only fires after the user
    // presses a button; pick up any gamepad that was already present at load.
    for (const gp of navigator.getGamepads()) {
      if (gp) {
        attachGamepad(gp);
        break;
      }
    }
  }

  // Scope-bound listener cleanup using VueUse pattern (onScopeDispose).
  useEventListener(window, 'blur', () => {
    resetState();
  });

  function onButtonPress(listener: ButtonListener): void {
    buttonListeners.add(listener);
    onScopeDispose(() => {
      buttonListeners.delete(listener);
    });
  }

  return {
    connectedIndex,
    vendor,
    pressedButtons,
    leftStick,
    rightStick,
    onButtonPress,
  };
}
