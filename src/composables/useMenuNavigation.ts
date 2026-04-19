/* oxlint-disable typescript/prefer-readonly-parameter-types -- options wrap mutable Vue Refs */
import type { Ref } from 'vue';
import { nextTick, watch } from 'vue';
import { useAppState } from '../stores/appState';
import { useGamepadInput } from './useGamepadInput';
import { useInputMode } from './useInputMode';

/** Minimum left-stick magnitude to trigger a directional step. */
const STICK_TRIGGER_MAGNITUDE = 0.5;
/** Stick must drop below this magnitude before another step can fire. */
const STICK_RELEASE_MAGNITUDE = 0.3;

/** Weight applied to the off-axis distance in the nearest-neighbor score.
 *  >1 biases toward column/row alignment so "down" prefers the cell directly
 *  below over a closer-but-off-axis candidate. */
const PERP_WEIGHT = 2;

type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Fixed menu-navigation button mapping (not rebindable — these are
 * position-stable controller conventions).
 */
const BUTTON_CONFIRM = 'Button0';
const BUTTON_CANCEL = 'Button1';
const BUTTON_TAB_PREV = 'Button4';
const BUTTON_TAB_NEXT = 'Button5';
const BUTTON_DPAD_UP = 'Button12';
const BUTTON_DPAD_DOWN = 'Button13';
const BUTTON_DPAD_LEFT = 'Button14';
const BUTTON_DPAD_RIGHT = 'Button15';

/**
 * Custom event name used to signal tab switches from the menu-nav composable
 * to tab-bearing menu components (Settings). Components use
 * `useEventListener(window, MENU_TAB_CHANGE_EVENT, ...)` to react.
 */
export const MENU_TAB_CHANGE_EVENT = 'fractr:menu-tab-change';

export interface UseMenuNavigationOptions {
  showHelpOverlay: Ref<boolean>;
}

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function queryFocusables(): HTMLElement[] {
  // Buttons only — form controls (sliders, selects, checkboxes) are left to
  // mouse/keyboard in MVP so gamepad D-pad doesn't land inside a slider with
  // no way to adjust it.
  const els = document.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  return Array.from(els).filter((el) => isVisible(el));
}

function directionalScore(from: DOMRect, to: DOMRect, dir: Direction): number {
  const ax = (from.left + from.right) / 2;
  const ay = (from.top + from.bottom) / 2;
  const bx = (to.left + to.right) / 2;
  const by = (to.top + to.bottom) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  // Candidate must be in the correct half-plane. Small epsilon rejects items
  // that are almost aligned so "down" doesn't land on a sibling to the side.
  const EPS = 1;
  if (dir === 'up' && dy >= -EPS) return Infinity;
  if (dir === 'down' && dy <= EPS) return Infinity;
  if (dir === 'left' && dx >= -EPS) return Infinity;
  if (dir === 'right' && dx <= EPS) return Infinity;
  const vertical = dir === 'up' || dir === 'down';
  const primary = vertical ? Math.abs(dy) : Math.abs(dx);
  const perp = vertical ? Math.abs(dx) : Math.abs(dy);
  return primary + perp * PERP_WEIGHT;
}

function findNearest(
  current: HTMLElement,
  candidates: ReadonlyArray<HTMLElement>,
  dir: Direction,
): HTMLElement | null {
  const fromRect = current.getBoundingClientRect();
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    if (c === current) continue;
    const s = directionalScore(fromRect, c.getBoundingClientRect(), dir);
    if (s < bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

function moveFocus(dir: Direction): void {
  const focusables = queryFocusables();
  if (focusables.length === 0) return;
  const current = document.activeElement;
  // No current focus → focus the first visible item. Makes D-pad "prime" the
  // cursor when the user picks up the controller mid-menu.
  if (!(current instanceof HTMLElement) || !focusables.includes(current)) {
    focusables[0]?.focus();
    return;
  }
  const next = findNearest(current, focusables, dir);
  next?.focus();
}

function confirmFocused(): void {
  const current = document.activeElement;
  if (current instanceof HTMLElement) current.click();
}

function dispatchSyntheticEscape(): void {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }),
  );
}

function dispatchTabChange(delta: number): void {
  window.dispatchEvent(new CustomEvent<number>(MENU_TAB_CHANGE_EVENT, { detail: delta }));
}

interface MenuNavGuards {
  canNavigate: () => boolean;
  canCancel: () => boolean;
  inSettings: () => boolean;
}

function handleButtonPress(code: string, guards: MenuNavGuards): void {
  if (code === BUTTON_CANCEL && guards.canCancel()) {
    dispatchSyntheticEscape();
    return;
  }
  if (!guards.canNavigate()) return;
  switch (code) {
    case BUTTON_CONFIRM:
      confirmFocused();
      return;
    case BUTTON_DPAD_UP:
      moveFocus('up');
      return;
    case BUTTON_DPAD_DOWN:
      moveFocus('down');
      return;
    case BUTTON_DPAD_LEFT:
      moveFocus('left');
      return;
    case BUTTON_DPAD_RIGHT:
      moveFocus('right');
      return;
    case BUTTON_TAB_PREV:
      if (guards.inSettings()) dispatchTabChange(-1);
      return;
    case BUTTON_TAB_NEXT:
      if (guards.inSettings()) dispatchTabChange(1);
      break;
    default:
      break;
  }
}

function stickDirection(x: number, y: number): Direction {
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'right' : 'left';
  return y > 0 ? 'down' : 'up';
}

/**
 * Gamepad-driven focus traversal for menu screens. Only active when
 * `appState.mode !== 'playing'` (gameplay already owns these buttons via
 * `useGamepadShortcuts`). Cancel (Button1) additionally fires while the help
 * overlay is open so the player can always close it.
 *
 * Bindings (fixed, not rebindable):
 * - D-pad / left stick: directional focus move (2D nearest-neighbor)
 * - Button0: confirm (click focused element)
 * - Button1: cancel (synthetic Escape → flows through existing handlers)
 * - Button4 / Button5: previous / next tab (Settings only)
 *
 * Auto-focuses the first menu item when entering a menu while gamepad is the
 * active input mode. If nothing is focused when a D-pad press arrives, the
 * first item is focused lazily instead — covers the "user switches to gamepad
 * mid-menu" case.
 */
export function useMenuNavigation(options: UseMenuNavigationOptions): void {
  const appState = useAppState();
  const gamepad = useGamepadInput();
  const { isGamepadActive } = useInputMode();

  const guards: MenuNavGuards = {
    canNavigate: () => appState.mode !== 'playing' && !options.showHelpOverlay.value,
    canCancel: () => appState.mode !== 'playing' || options.showHelpOverlay.value,
    inSettings: () => appState.mode === 'settings',
  };

  gamepad.onButtonPress((e) => {
    handleButtonPress(e.code, guards);
  });

  // Left stick → edge-triggered directional step with hysteresis. `stickArmed`
  // prevents re-firing while the stick is held past the trigger threshold.
  let stickArmed = true;
  watch(gamepad.leftStick, (s) => {
    if (!guards.canNavigate()) {
      stickArmed = true;
      return;
    }
    const mag = Math.hypot(s.x, s.y);
    if (mag < STICK_RELEASE_MAGNITUDE) {
      stickArmed = true;
      return;
    }
    if (!stickArmed || mag < STICK_TRIGGER_MAGNITUDE) return;
    stickArmed = false;
    moveFocus(stickDirection(s.x, s.y));
  });

  // Auto-focus first item when entering a menu via gamepad. Skipped for
  // mouse/keyboard users so we don't steal focus mid-click.
  watch(
    () => appState.mode,
    async (mode) => {
      if (mode === 'playing' || !isGamepadActive.value) return;
      await nextTick();
      const focusables = queryFocusables();
      focusables[0]?.focus();
    },
  );
}
