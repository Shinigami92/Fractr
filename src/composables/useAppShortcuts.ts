/* oxlint-disable typescript/prefer-readonly-parameter-types -- Vue Refs and DOM events have mutating internals */
import { useEventListener } from '@vueuse/core';
import type { Ref } from 'vue';
import { watch } from 'vue';
import type { ActionId } from '../input/actions';
import { ACTION_IDS } from '../input/actions';
import { useAppState } from '../stores/appState';
import { useControlSettings } from '../stores/controlSettings';
import { useFractalParams } from '../stores/fractalParams';
import { useGraphicsSettings } from '../stores/graphicsSettings';
import { useHudSettings } from '../stores/hudSettings';
import { useGamepadInput } from './useGamepadInput';
import type { UsePointerLockReturn } from './usePointerLock';
import type { UseRadialMenuControllerReturn } from './useRadialMenuController';
import type { UseSaveActionsReturn } from './useSaveActions';
import type { UseURLStateReturn } from './useURLState';

/** MouseEvent.button for the "browser forward" side button. */
const MOUSE_BUTTON_BROWSER_FORWARD = 4;

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
 * Global keyboard + mouse shortcut handling for the app:
 * - F1 toggles the help overlay; Escape backs out of menus.
 * - Ctrl unlocks the cursor without pausing.
 * - Most gameplay hotkeys (HUD toggle, iteration adjust, save, screenshot,
 *   share URL, cycle* radial holds) live here.
 * - Watches pointer-lock loss → auto-pause (except when intentionally
 *   unlocked via Ctrl, help overlay open, or in touch mode).
 *
 * Exposes `onCanvasClick` for the canvas element to restore pointer lock
 * after an intentional Ctrl-unlock.
 */
export function useAppShortcuts(options: UseAppShortcutsOptions): UseAppShortcutsReturn {
  const appState = useAppState();
  const fractal = useFractalParams();
  const controls = useControlSettings();
  const graphics = useGraphicsSettings();
  const hudSettings = useHudSettings();

  let cursorUnlocked = false;

  // Pointer lock loss → pause (unless intentionally unlocked via Ctrl)
  watch(
    () => options.pointerLock.isLocked.value,
    (locked) => {
      if (
        !locked &&
        appState.mode === 'playing' &&
        !cursorUnlocked &&
        !options.showHelpOverlay.value &&
        !options.isTouchActive.value
      ) {
        appState.pause();
      }
    },
  );

  function onKeyDown(e: KeyboardEvent): void {
    // F1 toggles the help overlay during gameplay (closing also allowed if open)
    if (e.code === 'F1') {
      e.preventDefault();
      if (appState.mode === 'playing' || options.showHelpOverlay.value) {
        options.showHelpOverlay.value = !options.showHelpOverlay.value;
      }
      return;
    }

    // Ctrl to unlock cursor without pausing
    if (
      (e.code === 'ControlLeft' || e.code === 'ControlRight') &&
      appState.mode === 'playing' &&
      options.pointerLock.isLocked.value
    ) {
      cursorUnlocked = true;
      options.pointerLock.exitLock();
      return;
    }

    if (e.code === 'Escape') {
      if (options.showHelpOverlay.value) {
        options.showHelpOverlay.value = false;
        return;
      }
      if (appState.mode === 'select') {
        appState.backToTitle();
      } else if (appState.mode === 'paused') {
        appState.resume();
      } else if (appState.mode === 'settings') {
        appState.closeSettings();
      } else if (appState.mode === 'saves') {
        appState.closeSaves();
      }
      // 'playing' → pointer lock exit triggers pause via watcher above
    }

    if (appState.mode === 'playing' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const kb: (id: Parameters<typeof controls.getBinding>[0]) => string | undefined = (id) =>
        controls.getBinding(id, 'keyboard');
      if (e.code === kb('toggleHud')) hudSettings.toggleHud();
      if (e.code === kb('toggleCrosshair')) hudSettings.toggleCrosshair();
      if (e.code === kb('toggleDynamicIterations')) {
        graphics.dynamicIterations = !graphics.dynamicIterations;
      }
      if (e.code === kb('increaseIterations')) fractal.adjustIterations(1);
      if (e.code === kb('decreaseIterations')) fractal.adjustIterations(-1);
      if (e.code === kb('increaseBailout')) fractal.adjustBailout(1);
      if (e.code === kb('decreaseBailout')) fractal.adjustBailout(-1);
      if (e.code === kb('toggleAnimatedColors')) {
        graphics.animatedColors = !graphics.animatedColors;
      }
      if (e.code === kb('quickSave')) {
        e.preventDefault();
        void options.saveActions.quickSave();
      }
      if (e.code === kb('screenshot')) {
        e.preventDefault();
        void options.saveActions.takeScreenshot();
      }
      if (e.code === kb('openSaves')) {
        cursorUnlocked = true;
        options.pointerLock.exitLock();
        appState.openSaves();
      }
      if (e.code === kb('copyShareURL')) {
        void navigator.clipboard.writeText(options.urlState.buildCurrentShareURL());
        options.notify('Share URL copied to clipboard');
      }

      // Radial menu hold detection for cycle keys
      options.radial.tryBeginHoldFromKey(e.code, e.repeat);
    }
  }

  function onKeyUp(e: KeyboardEvent): void {
    if (appState.mode !== 'playing' || e.ctrlKey || e.metaKey || e.altKey) return;
    options.radial.tryEndHoldFromKey(e.code, e.shiftKey);
  }

  function onMouseDown(e: MouseEvent): void {
    if (appState.mode !== 'playing') return;
    // Mouse button 5 (browser forward) = toggle dynamic iterations
    if (e.button === MOUSE_BUTTON_BROWSER_FORWARD) {
      e.preventDefault();
      graphics.dynamicIterations = !graphics.dynamicIterations;
    }
  }

  function onContextMenu(e: MouseEvent): void {
    if (appState.mode === 'playing') {
      e.preventDefault();
    }
  }

  function onWheel(e: WheelEvent): void {
    if (appState.mode !== 'playing') return;
    e.preventDefault();
    fractal.adjustIterations(e.deltaY < 0 ? 1 : -1);
  }

  function onCanvasClick(): void {
    if (
      appState.mode === 'playing' &&
      !options.pointerLock.isLocked.value &&
      !options.isTouchActive.value
    ) {
      cursorUnlocked = false;
      options.pointerLock.requestLock();
    }
  }

  useEventListener(window, 'keydown', onKeyDown);
  useEventListener(window, 'keyup', onKeyUp);
  useEventListener(window, 'mousedown', onMouseDown);
  useEventListener(window, 'contextmenu', onContextMenu);
  useEventListener(window, 'wheel', onWheel, { passive: false });

  // Gamepad button dispatch: fire the matching action handler on rising-edge
  // press. Held/continuous inputs (movement, roll) are polled from the
  // gameplay loop instead. Cycle actions quick-tap only — no hold-to-radial
  // on gamepad yet.
  const actionHandlers: Partial<Record<ActionId, () => void>> = {
    toggleHud: () => {
      hudSettings.toggleHud();
    },
    toggleCrosshair: () => {
      hudSettings.toggleCrosshair();
    },
    toggleDynamicIterations: () => {
      graphics.dynamicIterations = !graphics.dynamicIterations;
    },
    toggleAnimatedColors: () => {
      graphics.animatedColors = !graphics.animatedColors;
    },
    increaseIterations: () => {
      fractal.adjustIterations(1);
    },
    decreaseIterations: () => {
      fractal.adjustIterations(-1);
    },
    increaseBailout: () => {
      fractal.adjustBailout(1);
    },
    decreaseBailout: () => {
      fractal.adjustBailout(-1);
    },
    quickSave: () => {
      void options.saveActions.quickSave();
    },
    screenshot: () => {
      void options.saveActions.takeScreenshot();
    },
    openSaves: () => {
      cursorUnlocked = true;
      options.pointerLock.exitLock();
      appState.openSaves();
    },
    copyShareURL: () => {
      void navigator.clipboard.writeText(options.urlState.buildCurrentShareURL());
      options.notify('Share URL copied to clipboard');
    },
    cycleColorMode: () => {
      options.radial.triggerQuickTap('color', false);
    },
    cycleRenderMode: () => {
      options.radial.triggerQuickTap('render', false);
    },
    cycleFractalType: () => {
      options.radial.triggerQuickTap('fractal', false);
    },
  };

  const gamepad = useGamepadInput();
  gamepad.onButtonPress((e) => {
    // togglePause works in playing/paused alike — handle before the
    // playing-only gate so gamepad users can resume without touching keyboard.
    if (e.code === controls.getBinding('togglePause', 'gamepad')) {
      if (appState.mode === 'playing') appState.pause();
      else if (appState.mode === 'paused') appState.resume();
      return;
    }
    if (appState.mode !== 'playing') return;
    for (const id of ACTION_IDS) {
      if (controls.getBinding(id, 'gamepad') === e.code) {
        actionHandlers[id]?.();
        break;
      }
    }
  });

  return { onCanvasClick };
}
