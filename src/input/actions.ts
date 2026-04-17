/**
 * Central action registry. Single source of truth for every user-triggerable
 * action in the app, used by input handlers, the help overlay, and (later) the
 * rebinding UI.
 *
 * An "action" is a game-logic intent ("move forward", "quick save") independent
 * of which physical input triggered it. A "binding" is the physical trigger
 * for one input mode. Users override default bindings in
 * `controlSettings.overrides`; the effective binding is
 * `override ?? defaultBindings[mode]`.
 *
 * Gamepad + touch binding strings are placeholders for future work — only the
 * keyboard column is populated right now.
 */
import { getKeycapLabel } from './keyboardLayout';

export type InputMode = 'keyboard' | 'gamepad' | 'touch';

export interface ActionBindings {
  /** KeyboardEvent.code, e.g. 'KeyW', 'F5', or 'Mouse0' for mouse buttons. */
  keyboard?: string;
  /** Placeholder, e.g. 'LeftStickUp', 'ButtonA'. Unused until gamepad lands. */
  gamepad?: string;
  /** Placeholder, e.g. 'leftJoystickUp', 'tapButton:save'. Unused until touch lands. */
  touch?: string;
}

export type ActionCategory = 'Movement' | 'Camera' | 'Modes' | 'Fractal' | 'Saves' | 'UI';

export interface ActionDefinition {
  id: string;
  category: ActionCategory;
  label: string;
  defaultBindings: ActionBindings;
  /** If false, the rebinding UI must hide this action. Defaults to true. */
  rebindable?: boolean;
}

const ACTIONS_RAW = {
  // Movement
  moveForward: {
    id: 'moveForward',
    category: 'Movement',
    label: 'Move forward',
    defaultBindings: { keyboard: 'KeyW' },
  },
  moveBackward: {
    id: 'moveBackward',
    category: 'Movement',
    label: 'Move backward',
    defaultBindings: { keyboard: 'KeyS' },
  },
  moveLeft: {
    id: 'moveLeft',
    category: 'Movement',
    label: 'Strafe left',
    defaultBindings: { keyboard: 'KeyA' },
  },
  moveRight: {
    id: 'moveRight',
    category: 'Movement',
    label: 'Strafe right',
    defaultBindings: { keyboard: 'KeyD' },
  },
  rollLeft: {
    id: 'rollLeft',
    category: 'Movement',
    label: 'Roll left (Shift: move down)',
    defaultBindings: { keyboard: 'KeyQ', gamepad: 'Button4' },
  },
  rollRight: {
    id: 'rollRight',
    category: 'Movement',
    label: 'Roll right (Shift: move up)',
    defaultBindings: { keyboard: 'KeyE', gamepad: 'Button5' },
  },

  // Modes (press to cycle, hold to open radial menu)
  cycleColorMode: {
    id: 'cycleColorMode',
    category: 'Modes',
    label: 'Cycle color mode (hold: radial)',
    defaultBindings: { keyboard: 'KeyC', gamepad: 'Button0' },
  },
  cycleRenderMode: {
    id: 'cycleRenderMode',
    category: 'Modes',
    label: 'Cycle render mode (hold: radial)',
    defaultBindings: { keyboard: 'KeyR', gamepad: 'Button1' },
  },
  cycleFractalType: {
    id: 'cycleFractalType',
    category: 'Modes',
    label: 'Cycle fractal (hold: radial)',
    defaultBindings: { keyboard: 'KeyV', gamepad: 'Button3' },
  },

  // Fractal parameters
  toggleDynamicIterations: {
    id: 'toggleDynamicIterations',
    category: 'Fractal',
    label: 'Toggle dynamic iterations',
    defaultBindings: { keyboard: 'KeyI', gamepad: 'Button2' },
  },
  increaseIterations: {
    id: 'increaseIterations',
    category: 'Fractal',
    label: 'Iterations +',
    defaultBindings: { keyboard: 'Period', gamepad: 'Button12' },
  },
  decreaseIterations: {
    id: 'decreaseIterations',
    category: 'Fractal',
    label: 'Iterations -',
    defaultBindings: { keyboard: 'Comma', gamepad: 'Button13' },
  },
  increaseBailout: {
    id: 'increaseBailout',
    category: 'Fractal',
    label: 'Bailout +',
    defaultBindings: { keyboard: 'KeyK', gamepad: 'Button15' },
  },
  decreaseBailout: {
    id: 'decreaseBailout',
    category: 'Fractal',
    label: 'Bailout -',
    defaultBindings: { keyboard: 'KeyJ', gamepad: 'Button14' },
  },
  toggleAnimatedColors: {
    id: 'toggleAnimatedColors',
    category: 'Fractal',
    label: 'Toggle animated colors',
    defaultBindings: { keyboard: 'KeyG', gamepad: 'Button11' },
  },

  // Saves & sharing
  quickSave: {
    id: 'quickSave',
    category: 'Saves',
    label: 'Quick save location',
    defaultBindings: { keyboard: 'F5', gamepad: 'Button6' },
  },
  screenshot: {
    id: 'screenshot',
    category: 'Saves',
    label: 'Screenshot to clipboard',
    defaultBindings: { keyboard: 'F6', gamepad: 'Button7' },
  },
  openSaves: {
    id: 'openSaves',
    category: 'Saves',
    label: 'Browse saved locations',
    defaultBindings: { keyboard: 'KeyB' },
  },
  copyShareURL: {
    id: 'copyShareURL',
    category: 'Saves',
    label: 'Copy share URL',
    defaultBindings: { keyboard: 'KeyP' },
  },

  // UI
  togglePause: {
    id: 'togglePause',
    category: 'UI',
    label: 'Pause / resume',
    defaultBindings: { gamepad: 'Button9' },
  },
  toggleHud: {
    id: 'toggleHud',
    category: 'UI',
    label: 'Toggle HUD',
    defaultBindings: { keyboard: 'F3', gamepad: 'Button8' },
  },
  toggleCrosshair: {
    id: 'toggleCrosshair',
    category: 'UI',
    label: 'Toggle crosshair',
    defaultBindings: { keyboard: 'KeyH', gamepad: 'Button10' },
  },
} as const satisfies Record<string, ActionDefinition>;

export type ActionId = keyof typeof ACTIONS_RAW;

/**
 * Widened view of the registry so indexed access returns `ActionDefinition`
 * instead of each entry's literal-typed shape. This keeps optional fields
 * (`rebindable`) visible and lets `defaultBindings` be keyed by `InputMode`.
 */
export const ACTIONS: Readonly<Record<ActionId, ActionDefinition>> = ACTIONS_RAW;

export const ACTION_IDS = Object.keys(ACTIONS_RAW) as ActionId[];

/**
 * KeyboardEvent.code values that cannot be assigned to user actions because
 * they are wired directly into the app shell (see useAppShortcuts.ts). The
 * rebind UI rejects capture attempts on these; the help overlay shows them
 * under "UI" as fixed bindings.
 */
export const RESERVED_KEYBOARD_CODES: ReadonlySet<string> = new Set([
  'F1', // Toggle help overlay
  'Escape', // Pause / back
  'ControlLeft', // Unlock cursor (no pause)
  'ControlRight',
]);

/**
 * Human-readable label for a KeyboardEvent.code ("KeyW" → "W", "F5" → "F5").
 *
 * When the browser exposes `navigator.keyboard.getLayoutMap()`, we prefer the
 * label printed on the user's physical keycap — so German QWERTZ users see
 * "Y"/"Z" matching their keyboard rather than the US-layout positions. Falls
 * back to code-slicing for writing-system keys the layout map doesn't cover
 * and for browsers without the API (Firefox, Safari).
 */
export function displayKeyboardCode(code: string): string {
  const layoutLabel = getKeycapLabel(code);
  if (layoutLabel) {
    if (/^[a-z]$/.test(layoutLabel)) return layoutLabel.toUpperCase();
    if (layoutLabel.length === 1) return layoutLabel;
  }
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Comma') return ',';
  if (code === 'Period') return '.';
  if (code === 'Space') return 'Space';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code === 'Slash') return '/';
  if (code === 'Backslash') return '\\';
  if (code === 'Semicolon') return ';';
  if (code === 'Quote') return "'";
  if (code === 'Backquote') return '`';
  if (code === 'Minus') return '-';
  if (code === 'Equal') return '=';
  if (code === 'BracketLeft') return '[';
  if (code === 'BracketRight') return ']';
  return code;
}
