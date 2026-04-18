/* oxlint-disable typescript/prefer-readonly-parameter-types -- composable returns wrap mutable Vue Refs */
import type { ActionId } from '../input/actions';
import { ACTION_IDS } from '../input/actions';
import { useAppState } from '../stores/appState';
import { useControlSettings } from '../stores/controlSettings';
import { useFractalParams } from '../stores/fractalParams';
import { useGraphicsSettings } from '../stores/graphicsSettings';
import { useHudSettings } from '../stores/hudSettings';
import { useGamepadInput } from './useGamepadInput';
import type { CursorFlag } from './useKeyboardShortcuts';
import type { UsePointerLockReturn } from './usePointerLock';
import type { UseRadialMenuControllerReturn } from './useRadialMenuController';
import type { UseSaveActionsReturn } from './useSaveActions';
import type { UseURLStateReturn } from './useURLState';

export interface UseGamepadShortcutsOptions {
  pointerLock: UsePointerLockReturn;
  radial: UseRadialMenuControllerReturn;
  saveActions: UseSaveActionsReturn;
  urlState: UseURLStateReturn;
  notify: (text: string, duration?: number) => void;
}

interface GamepadStores {
  appState: ReturnType<typeof useAppState>;
  fractal: ReturnType<typeof useFractalParams>;
  controls: ReturnType<typeof useControlSettings>;
  graphics: ReturnType<typeof useGraphicsSettings>;
  hudSettings: ReturnType<typeof useHudSettings>;
}

/* oxlint-disable-next-line eslint/max-lines-per-function -- flat table of per-action dispatchers is clearer as one list than split across helpers */
function buildActionHandlers(
  stores: GamepadStores,
  options: UseGamepadShortcutsOptions,
  cursorFlag: CursorFlag,
): Partial<Record<ActionId, () => void>> {
  const { fractal, graphics, hudSettings, appState } = stores;
  return {
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
      cursorFlag.cursorUnlocked = true;
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
}

/**
 * Gamepad button dispatch: fire the matching action handler on rising-edge
 * press. Held/continuous inputs (movement, roll) are polled from the gameplay
 * loop instead. Cycle actions quick-tap only — no hold-to-radial on gamepad
 * yet. Owned by `useAppShortcuts`.
 */
export function useGamepadShortcuts(
  options: UseGamepadShortcutsOptions,
  cursorFlag: CursorFlag,
): void {
  const stores: GamepadStores = {
    appState: useAppState(),
    fractal: useFractalParams(),
    controls: useControlSettings(),
    graphics: useGraphicsSettings(),
    hudSettings: useHudSettings(),
  };
  const actionHandlers = buildActionHandlers(stores, options, cursorFlag);
  const gamepad = useGamepadInput();

  gamepad.onButtonPress((e) => {
    // togglePause works in playing/paused alike — handle before the
    // playing-only gate so gamepad users can resume without touching keyboard.
    if (e.code === stores.controls.getBinding('togglePause', 'gamepad')) {
      if (stores.appState.mode === 'playing') stores.appState.pause();
      else if (stores.appState.mode === 'paused') stores.appState.resume();
      return;
    }
    if (stores.appState.mode !== 'playing') return;
    for (const id of ACTION_IDS) {
      if (stores.controls.getBinding(id, 'gamepad') === e.code) {
        actionHandlers[id]?.();
        break;
      }
    }
  });
}
