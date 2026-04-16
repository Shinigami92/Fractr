import { computed, type Ref, ref } from 'vue';
import { RADIAL_MENU_HOLD_DELAY_MS } from '../constants/game';
import { radialSelectedIndex } from '../utils/radialGeometry';

export interface RadialOption {
  readonly value: string;
  readonly short: string;
}

export interface UseRadialMenuOptions<Id extends string> {
  /** Resolve the options shown for a given menu id. */
  getOptions: (id: Id) => readonly RadialOption[];
  /** Called when the menu closes with a valid selection under the cursor. */
  onApply: (id: Id, value: string) => void;
  /** Called on a quick-tap that never triggered the menu to open. */
  onQuickTap: (id: Id, shiftKey: boolean) => void;
}

/**
 * State + behaviour for a press-and-hold radial menu.
 *
 * - `beginHold(id)` starts the hold timer; after RADIAL_MENU_HOLD_DELAY_MS
 *   the menu opens. Releasing before that counts as a quick-tap.
 * - `endHold(id, shiftKey)` closes the menu: applies the sector under the
 *   cursor when the menu is open, otherwise fires `onQuickTap`.
 * - `onMouseMove` accumulates movement deltas while the menu is open so the
 *   selected sector tracks the mouse even under pointer-lock.
 */
export function useRadialMenu<Id extends string>(options: UseRadialMenuOptions<Id>) {
  const activeId: Ref<Id | null> = ref(null);
  const cursorX = ref(0);
  const cursorY = ref(0);
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let heldId: Id | null = null;

  const currentOptions = computed(() => (activeId.value ? options.getOptions(activeId.value) : []));

  const selectedIndex = computed(() =>
    radialSelectedIndex(cursorX.value, cursorY.value, currentOptions.value.length),
  );

  function clearTimer(): void {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  function beginHold(id: Id): void {
    if (holdTimer || activeId.value) return;
    heldId = id;
    holdTimer = setTimeout(() => {
      holdTimer = null;
      activeId.value = id;
      cursorX.value = 0;
      cursorY.value = 0;
    }, RADIAL_MENU_HOLD_DELAY_MS);
  }

  function endHold(id: Id, shiftKey: boolean): void {
    if (heldId !== id) return;
    const wasOpen = activeId.value !== null;
    if (wasOpen) {
      const idx = selectedIndex.value;
      if (idx >= 0) {
        const sel = currentOptions.value[idx]!;
        options.onApply(id, sel.value);
      }
    } else {
      options.onQuickTap(id, shiftKey);
    }
    activeId.value = null;
    heldId = null;
    clearTimer();
  }

  function onMouseMove(e: MouseEvent): void {
    if (activeId.value) {
      cursorX.value += e.movementX;
      cursorY.value += e.movementY;
    }
  }

  return {
    activeId,
    cursorX,
    cursorY,
    currentOptions,
    selectedIndex,
    beginHold,
    endHold,
    onMouseMove,
  };
}
