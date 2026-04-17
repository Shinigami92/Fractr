import { useEventListener } from '@vueuse/core';
import type { Ref } from 'vue';
import { watch } from 'vue';
import { useAppState } from '../stores/appState';
import { useControlSettings } from '../stores/controlSettings';
import { useFractalParams } from '../stores/fractalParams';
import { useGraphicsSettings } from '../stores/graphicsSettings';
import { useHudSettings } from '../stores/hudSettings';
import type { usePointerLock } from './usePointerLock';
import type { RadialMenuController } from './useRadialMenuController';
import type { useSaveActions } from './useSaveActions';
import type { URLStateController } from './useURLState';

/** MouseEvent.button for the "browser forward" side button. */
const MOUSE_BUTTON_BROWSER_FORWARD = 4;

export interface UseAppShortcutsDeps {
  pointerLock: ReturnType<typeof usePointerLock>;
  radial: RadialMenuController;
  saveActions: ReturnType<typeof useSaveActions>;
  urlState: URLStateController;
  notify: (text: string, duration?: number) => void;
  isTouchActive: Ref<boolean>;
  showHelpOverlay: Ref<boolean>;
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
export function useAppShortcuts(deps: UseAppShortcutsDeps) {
  const appState = useAppState();
  const fractal = useFractalParams();
  const controls = useControlSettings();
  const graphics = useGraphicsSettings();
  const hudSettings = useHudSettings();

  let cursorUnlocked = false;

  // Pointer lock loss → pause (unless intentionally unlocked via Ctrl)
  watch(
    () => deps.pointerLock.isLocked.value,
    (locked) => {
      if (
        !locked &&
        appState.mode === 'playing' &&
        !cursorUnlocked &&
        !deps.showHelpOverlay.value &&
        !deps.isTouchActive.value
      ) {
        appState.pause();
      }
    },
  );

  function onKeyDown(e: KeyboardEvent): void {
    // F1 toggles the help overlay during gameplay (closing also allowed if open)
    if (e.code === 'F1') {
      e.preventDefault();
      if (appState.mode === 'playing' || deps.showHelpOverlay.value) {
        deps.showHelpOverlay.value = !deps.showHelpOverlay.value;
      }
      return;
    }

    // Ctrl to unlock cursor without pausing
    if (
      (e.code === 'ControlLeft' || e.code === 'ControlRight') &&
      appState.mode === 'playing' &&
      deps.pointerLock.isLocked.value
    ) {
      cursorUnlocked = true;
      deps.pointerLock.exitLock();
      return;
    }

    if (e.code === 'Escape') {
      if (deps.showHelpOverlay.value) {
        deps.showHelpOverlay.value = false;
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
      const b = controls.keybindings;
      if (e.code === b.toggleHud) hudSettings.toggleHud();
      if (e.code === b.toggleCrosshair) hudSettings.toggleCrosshair();
      if (e.code === b.toggleDynamicIterations) {
        graphics.dynamicIterations = !graphics.dynamicIterations;
      }
      if (e.code === b.increaseIterations) fractal.adjustIterations(1);
      if (e.code === b.decreaseIterations) fractal.adjustIterations(-1);
      if (e.code === b.increaseBailout) fractal.adjustBailout(1);
      if (e.code === b.decreaseBailout) fractal.adjustBailout(-1);
      if (e.code === b.toggleAnimatedColors) {
        graphics.animatedColors = !graphics.animatedColors;
      }
      if (e.code === b.quickSave) {
        e.preventDefault();
        void deps.saveActions.quickSave();
      }
      if (e.code === b.screenshot) {
        e.preventDefault();
        void deps.saveActions.takeScreenshot();
      }
      if (e.code === b.openSaves) {
        cursorUnlocked = true;
        deps.pointerLock.exitLock();
        appState.openSaves();
      }
      if (e.code === b.copyShareURL) {
        void navigator.clipboard.writeText(deps.urlState.buildCurrentShareURL());
        deps.notify('Share URL copied to clipboard');
      }

      // Radial menu hold detection for cycle keys
      deps.radial.tryBeginHoldFromKey(e.code, e.repeat);
    }
  }

  function onKeyUp(e: KeyboardEvent): void {
    if (appState.mode !== 'playing' || e.ctrlKey || e.metaKey || e.altKey) return;
    deps.radial.tryEndHoldFromKey(e.code, e.shiftKey);
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
      !deps.pointerLock.isLocked.value &&
      !deps.isTouchActive.value
    ) {
      cursorUnlocked = false;
      deps.pointerLock.requestLock();
    }
  }

  useEventListener(window, 'keydown', onKeyDown);
  useEventListener(window, 'keyup', onKeyUp);
  useEventListener(window, 'mousedown', onMouseDown);
  useEventListener(window, 'contextmenu', onContextMenu);
  useEventListener(window, 'wheel', onWheel, { passive: false });

  return { onCanvasClick };
}
