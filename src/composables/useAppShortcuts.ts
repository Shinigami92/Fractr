/* oxlint-disable typescript/prefer-readonly-parameter-types -- Vue Refs and composable returns wrap mutating internals */
import type { Ref } from 'vue';
import { watch } from 'vue';
import { useAppState } from '../stores/appState';
import { useGamepadShortcuts } from './useGamepadShortcuts';
import type { CursorFlag } from './useKeyboardShortcuts';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import type { UsePointerLockReturn } from './usePointerLock';
import type { UseRadialMenuControllerReturn } from './useRadialMenuController';
import type { UseSaveActionsReturn } from './useSaveActions';
import type { UseURLStateReturn } from './useURLState';

export interface UseAppShortcutsOptions {
  pointerLock: UsePointerLockReturn;
  radial: UseRadialMenuControllerReturn;
  saveActions: UseSaveActionsReturn;
  urlState: UseURLStateReturn;
  notify: (text: string, duration?: number) => void;
  isTouchActive: Ref<boolean>;
  showHelpOverlay: Ref<boolean>;
}

export interface UseAppShortcutsReturn {
  onCanvasClick: () => void;
}

/**
 * Global keyboard + mouse + gamepad shortcut handling for the app:
 * - F1 toggles the help overlay; Escape backs out of menus.
 * - Ctrl unlocks the cursor without pausing.
 * - Most gameplay hotkeys (HUD toggle, iteration adjust, save, screenshot,
 *   share URL, cycle* radial holds) live in `useKeyboardShortcuts`.
 * - Gamepad button → action dispatch lives in `useGamepadShortcuts`.
 * - Watches pointer-lock loss → auto-pause (except when intentionally
 *   unlocked via Ctrl, help overlay open, or in touch mode).
 *
 * Exposes `onCanvasClick` for the canvas element to restore pointer lock
 * after an intentional Ctrl-unlock.
 */
export function useAppShortcuts(options: UseAppShortcutsOptions): UseAppShortcutsReturn {
  const appState = useAppState();
  const cursorFlag: CursorFlag = { cursorUnlocked: false };

  // Pointer lock loss → pause (unless intentionally unlocked via Ctrl)
  watch(
    () => options.pointerLock.isLocked.value,
    (locked) => {
      if (
        !locked &&
        appState.mode === 'playing' &&
        !cursorFlag.cursorUnlocked &&
        !options.showHelpOverlay.value &&
        !options.isTouchActive.value
      ) {
        appState.pause();
      }
    },
  );

  function onCanvasClick(): void {
    if (
      appState.mode === 'playing' &&
      !options.pointerLock.isLocked.value &&
      !options.isTouchActive.value
    ) {
      cursorFlag.cursorUnlocked = false;
      options.pointerLock.requestLock();
    }
  }

  useKeyboardShortcuts(options, cursorFlag);
  useGamepadShortcuts(options, cursorFlag);

  return { onCanvasClick };
}
