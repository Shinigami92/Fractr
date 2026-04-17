import { useEventListener } from '@vueuse/core';
import { computed } from 'vue';
import { useControlSettings } from '../stores/controlSettings';
import {
  COLOR_MODE_OPTIONS,
  type ColorMode,
  FRACTAL_CONFIGS,
  type FractalType,
  RENDER_MODE_OPTIONS,
  type RenderMode,
  useFractalParams,
} from '../stores/fractalParams';
import { useRadialMenu } from './useRadialMenu';

type RadialMenuId = 'color' | 'render' | 'fractal';

export interface UseRadialMenuControllerOptions {
  /** Called when the fractal type changes via radial (quick-tap or apply). */
  onResetCamera: () => void;
}

/**
 * App-level wiring for the press-and-hold radial menu: maps keybindings to
 * menu ids, exposes the currently-selected value for each id, and forwards
 * selections into the fractal store. Also tracks which physical key is
 * currently holding the menu so keydown/keyup stay consistent.
 */
export function useRadialMenuController(options: UseRadialMenuControllerOptions) {
  const fractal = useFractalParams();
  const controls = useControlSettings();

  const fractalOptions = computed(() =>
    Object.entries(FRACTAL_CONFIGS).map(([key, cfg]) => ({
      value: key,
      label: cfg.label,
      short: cfg.short,
    })),
  );

  const menu = useRadialMenu<RadialMenuId>({
    getOptions(id) {
      switch (id) {
        case 'color':
          return COLOR_MODE_OPTIONS;
        case 'render':
          return RENDER_MODE_OPTIONS;
        case 'fractal':
          return fractalOptions.value;
      }
    },
    onApply(id, value) {
      switch (id) {
        case 'color':
          fractal.colorMode = value as ColorMode;
          break;
        case 'render':
          fractal.renderMode = value as RenderMode;
          break;
        case 'fractal':
          fractal.setFractalType(value as FractalType);
          options.onResetCamera();
          break;
      }
    },
    onQuickTap(id, shiftKey) {
      switch (id) {
        case 'color':
          fractal.cycleColorMode(shiftKey);
          break;
        case 'render':
          fractal.cycleRenderMode(shiftKey);
          break;
        case 'fractal':
          fractal.cycleFractalType(shiftKey);
          options.onResetCamera();
          break;
      }
    },
  });

  const currentValue = computed(() => {
    switch (menu.activeId.value) {
      case 'color':
        return fractal.colorMode;
      case 'render':
        return fractal.renderMode;
      case 'fractal':
        return fractal.fractalType;
      default:
        return '';
    }
  });

  function idForKey(code: string): RadialMenuId | undefined {
    const bindings = controls.keybindings;
    if (code === bindings.cycleColorMode) return 'color';
    if (code === bindings.cycleRenderMode) return 'render';
    if (code === bindings.cycleFractalType) return 'fractal';
    return undefined;
  }

  let heldKey: string | null = null;

  /** Returns true if a hold was started. */
  function tryBeginHoldFromKey(code: string, repeat: boolean): boolean {
    const id = idForKey(code);
    if (!id || repeat || heldKey !== null) return false;
    heldKey = code;
    menu.beginHold(id);
    return true;
  }

  /** Returns true if a hold was ended by this key. */
  function tryEndHoldFromKey(code: string, shiftKey: boolean): boolean {
    if (code !== heldKey) return false;
    const id = idForKey(code);
    if (id) menu.endHold(id, shiftKey);
    heldKey = null;
    return true;
  }

  // Accumulate cursor deltas from pointer-lock so the sector selection tracks
  // the mouse while the menu is open.
  useEventListener(window, 'mousemove', menu.onMouseMove);

  return {
    activeId: menu.activeId,
    cursorX: menu.cursorX,
    cursorY: menu.cursorY,
    currentOptions: menu.currentOptions,
    selectedIndex: menu.selectedIndex,
    currentValue,
    tryBeginHoldFromKey,
    tryEndHoldFromKey,
  };
}

export type RadialMenuController = ReturnType<typeof useRadialMenuController>;
