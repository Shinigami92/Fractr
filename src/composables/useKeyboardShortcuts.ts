/* oxlint-disable typescript/prefer-readonly-parameter-types -- Vue Refs and DOM events have mutating internals */
import { useEventListener } from '@vueuse/core';
import type { Ref } from 'vue';
import { useAppState } from '../stores/appState';
import { useControlSettings } from '../stores/controlSettings';
import { useFractalParams } from '../stores/fractalParams';
import { useGraphicsSettings } from '../stores/graphicsSettings';
import { useHudSettings } from '../stores/hudSettings';
import type { UsePointerLockReturn } from './usePointerLock';
import type { UseRadialMenuControllerReturn } from './useRadialMenuController';
import type { UseSaveActionsReturn } from './useSaveActions';
import type { UseURLStateReturn } from './useURLState';

/** MouseEvent.button for the "browser forward" side button. */
const MOUSE_BUTTON_BROWSER_FORWARD = 4;

export interface CursorFlag {
  cursorUnlocked: boolean;
}

export interface UseKeyboardShortcutsOptions {
  pointerLock: UsePointerLockReturn;
  radial: UseRadialMenuControllerReturn;
  saveActions: UseSaveActionsReturn;
  urlState: UseURLStateReturn;
  notify: (text: string, duration?: number) => void;
  showHelpOverlay: Ref<boolean>;
}

interface KeyboardContext {
  appState: ReturnType<typeof useAppState>;
  fractal: ReturnType<typeof useFractalParams>;
  controls: ReturnType<typeof useControlSettings>;
  graphics: ReturnType<typeof useGraphicsSettings>;
  hudSettings: ReturnType<typeof useHudSettings>;
  options: UseKeyboardShortcutsOptions;
  cursorFlag: CursorFlag;
}

function handleEscapeKey(ctx: KeyboardContext): void {
  const { appState, options } = ctx;
  if (options.showHelpOverlay.value) {
    options.showHelpOverlay.value = false;
    return;
  }
  if (appState.mode === 'select') appState.backToTitle();
  else if (appState.mode === 'paused') appState.resume();
  else if (appState.mode === 'settings') appState.closeSettings();
  else if (appState.mode === 'saves') appState.closeSaves();
  // 'playing' → pointer lock exit triggers pause via watcher above
}

function handlePlayingKeyDown(ctx: KeyboardContext, e: KeyboardEvent): void {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const { fractal, controls, graphics, hudSettings, appState, options } = ctx;
  const kb: (id: Parameters<typeof controls.getBinding>[0]) => string | undefined = (id) =>
    controls.getBinding(id, 'keyboard');
  if (e.code === kb('toggleHud')) {
    e.preventDefault();
    hudSettings.toggleHud();
  }
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
    ctx.cursorFlag.cursorUnlocked = true;
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

function handleKeyDown(ctx: KeyboardContext, e: KeyboardEvent): void {
  const { appState, options } = ctx;
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
    ctx.cursorFlag.cursorUnlocked = true;
    options.pointerLock.exitLock();
    return;
  }

  if (e.code === 'Escape') handleEscapeKey(ctx);
  if (appState.mode === 'playing') handlePlayingKeyDown(ctx, e);
}

/**
 * Window keyboard, mouse, wheel, and contextmenu listeners that drive
 * gameplay shortcuts (HUD toggles, iteration adjust, save/screenshot,
 * share URL, radial menu hold). Mouse-button-5 toggles dynamic iterations;
 * wheel adjusts iterations during gameplay. Owned by `useAppShortcuts`.
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions,
  cursorFlag: CursorFlag,
): void {
  const ctx: KeyboardContext = {
    appState: useAppState(),
    fractal: useFractalParams(),
    controls: useControlSettings(),
    graphics: useGraphicsSettings(),
    hudSettings: useHudSettings(),
    options,
    cursorFlag,
  };

  useEventListener(window, 'keydown', (e) => {
    handleKeyDown(ctx, e);
  });
  useEventListener(window, 'keyup', (e) => {
    if (ctx.appState.mode !== 'playing' || e.ctrlKey || e.metaKey || e.altKey) return;
    options.radial.tryEndHoldFromKey(e.code, e.shiftKey);
  });
  useEventListener(window, 'mousedown', (e) => {
    if (ctx.appState.mode !== 'playing') return;
    // Mouse button 5 (browser forward) = toggle dynamic iterations
    if (e.button === MOUSE_BUTTON_BROWSER_FORWARD) {
      e.preventDefault();
      ctx.graphics.dynamicIterations = !ctx.graphics.dynamicIterations;
    }
  });
  useEventListener(window, 'contextmenu', (e) => {
    if (ctx.appState.mode === 'playing') e.preventDefault();
  });
  useEventListener(
    window,
    'wheel',
    (e) => {
      if (ctx.appState.mode !== 'playing') return;
      e.preventDefault();
      ctx.fractal.adjustIterations(e.deltaY < 0 ? 1 : -1);
    },
    { passive: false },
  );
}
