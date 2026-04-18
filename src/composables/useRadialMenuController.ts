/* oxlint-disable typescript/prefer-readonly-parameter-types -- pinia store instances have mutable reactive state */
import { useEventListener } from '@vueuse/core';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';
import { useControlSettings } from '../stores/controlSettings';
import type { ColorMode, FractalType, RenderMode } from '../stores/fractalParams';
import {
  COLOR_MODE_OPTIONS,
  FRACTAL_CONFIGS,
  RENDER_MODE_OPTIONS,
  useFractalParams,
} from '../stores/fractalParams';
import type { RadialOption } from './useRadialMenu';
import { useRadialMenu } from './useRadialMenu';

type RadialMenuId = 'color' | 'render' | 'fractal';

export interface UseRadialMenuControllerOptions {
  /** Called when the fractal type changes via radial (quick-tap or apply). */
  onResetCamera: () => void;
}

export interface UseRadialMenuControllerReturn {
  activeId: Ref<RadialMenuId | null>;
  cursorX: Ref<number>;
  cursorY: Ref<number>;
  currentOptions: ComputedRef<ReadonlyArray<RadialOption>>;
  selectedIndex: ComputedRef<number>;
  currentValue: ComputedRef<string>;
  tryBeginHoldFromKey: (code: string, repeat: boolean) => boolean;
  tryEndHoldFromKey: (code: string, shiftKey: boolean) => boolean;
  triggerQuickTap: (id: RadialMenuId, shiftKey: boolean) => void;
}

/**
 * App-level wiring for the press-and-hold radial menu: maps keybindings to
 * menu ids, exposes the currently-selected value for each id, and forwards
 * selections into the fractal store. Also tracks which physical key is
 * currently holding the menu so keydown/keyup stay consistent.
 */
export function useRadialMenuController(
  options: UseRadialMenuControllerOptions,
): UseRadialMenuControllerReturn {
  const fractal = useFractalParams();
  const controls = useControlSettings();

  const fractalOptions = computed(() =>
    Object.entries(FRACTAL_CONFIGS).map(([key, cfg]) => ({
      value: key,
      label: cfg.label,
      short: cfg.short,
    })),
  );

  function triggerQuickTap(id: RadialMenuId, shiftKey: boolean): void {
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
      default:
        break;
    }
  }

  const menu = useRadialMenu<RadialMenuId>({
    getOptions(id) {
      switch (id) {
        case 'color':
          return COLOR_MODE_OPTIONS;
        case 'render':
          return RENDER_MODE_OPTIONS;
        case 'fractal':
          return fractalOptions.value;
        default:
          return [];
      }
    },
    onApply(id, value) {
      switch (id) {
        case 'color':
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- value originates from COLOR_MODE_OPTIONS passed into getOptions for this id.
          fractal.colorMode = value as ColorMode;
          break;
        case 'render':
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- value originates from RENDER_MODE_OPTIONS passed into getOptions for this id.
          fractal.renderMode = value as RenderMode;
          break;
        case 'fractal':
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- value originates from fractalOptions (keys of FRACTAL_CONFIGS) passed into getOptions for this id.
          fractal.setFractalType(value as FractalType);
          options.onResetCamera();
          break;
        default:
          break;
      }
    },
    onQuickTap: triggerQuickTap,
  });

  const currentValue = computed(() => {
    switch (menu.activeId.value) {
      case 'color':
        return fractal.colorMode;
      case 'render':
        return fractal.renderMode;
      case 'fractal':
        return fractal.fractalType;
      case null:
        return '';
      default:
        return '';
    }
  });

  function idForKey(code: string): RadialMenuId | undefined {
    if (code === controls.getBinding('cycleColorMode', 'keyboard')) return 'color';
    if (code === controls.getBinding('cycleRenderMode', 'keyboard')) return 'render';
    if (code === controls.getBinding('cycleFractalType', 'keyboard')) return 'fractal';
    return undefined;
  }

  let heldKey: string | null = null;

  /** Returns true if a hold was started. */
  function tryBeginHoldFromKey(code: string, repeat: boolean): boolean {
    const id = idForKey(code);
    if (!id || repeat || heldKey != null) return false;
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
    triggerQuickTap,
  };
}
