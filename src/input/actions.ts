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

export const ACTIONS = {
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
    defaultBindings: { keyboard: 'KeyQ' },
  },
  rollRight: {
    id: 'rollRight',
    category: 'Movement',
    label: 'Roll right (Shift: move up)',
    defaultBindings: { keyboard: 'KeyE' },
  },

  // Modes (press to cycle, hold to open radial menu)
  cycleColorMode: {
    id: 'cycleColorMode',
    category: 'Modes',
    label: 'Cycle color mode (hold: radial)',
    defaultBindings: { keyboard: 'KeyC' },
  },
  cycleRenderMode: {
    id: 'cycleRenderMode',
    category: 'Modes',
    label: 'Cycle render mode (hold: radial)',
    defaultBindings: { keyboard: 'KeyR' },
  },
  cycleFractalType: {
    id: 'cycleFractalType',
    category: 'Modes',
    label: 'Cycle fractal (hold: radial)',
    defaultBindings: { keyboard: 'KeyV' },
  },

  // Fractal parameters
  toggleDynamicIterations: {
    id: 'toggleDynamicIterations',
    category: 'Fractal',
    label: 'Toggle dynamic iterations',
    defaultBindings: { keyboard: 'KeyI' },
  },
  increaseIterations: {
    id: 'increaseIterations',
    category: 'Fractal',
    label: 'Iterations +',
    defaultBindings: { keyboard: 'Period' },
  },
  decreaseIterations: {
    id: 'decreaseIterations',
    category: 'Fractal',
    label: 'Iterations -',
    defaultBindings: { keyboard: 'Comma' },
  },
  increaseBailout: {
    id: 'increaseBailout',
    category: 'Fractal',
    label: 'Bailout +',
    defaultBindings: { keyboard: 'KeyK' },
  },
  decreaseBailout: {
    id: 'decreaseBailout',
    category: 'Fractal',
    label: 'Bailout -',
    defaultBindings: { keyboard: 'KeyJ' },
  },
  toggleAnimatedColors: {
    id: 'toggleAnimatedColors',
    category: 'Fractal',
    label: 'Toggle animated colors',
    defaultBindings: { keyboard: 'KeyG' },
  },

  // Saves & sharing
  quickSave: {
    id: 'quickSave',
    category: 'Saves',
    label: 'Quick save location',
    defaultBindings: { keyboard: 'F5' },
  },
  screenshot: {
    id: 'screenshot',
    category: 'Saves',
    label: 'Screenshot to clipboard',
    defaultBindings: { keyboard: 'F6' },
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
  toggleHud: {
    id: 'toggleHud',
    category: 'UI',
    label: 'Toggle HUD',
    defaultBindings: { keyboard: 'F3' },
  },
  toggleCrosshair: {
    id: 'toggleCrosshair',
    category: 'UI',
    label: 'Toggle crosshair',
    defaultBindings: { keyboard: 'KeyH' },
  },
} as const satisfies Record<string, ActionDefinition>;

export type ActionId = keyof typeof ACTIONS;

export const ACTION_IDS = Object.keys(ACTIONS) as ActionId[];
