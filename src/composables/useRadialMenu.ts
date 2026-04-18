/* oxlint-disable typescript/prefer-readonly-parameter-types -- Vue Refs and DOM events have mutating internals */
import { useTimeoutFn } from '@vueuse/core';
import type { ComputedRef, Ref } from 'vue';
import { computed, ref } from 'vue';
import { radialSelectedIndex } from '../utils/radialGeometry';

/** Hold duration in milliseconds before a radial menu opens. */
const RADIAL_MENU_HOLD_DELAY_MS = 200;

export interface RadialOption {
  readonly value: string;
  readonly short: string;
}

export interface UseRadialMenuOptions<Id extends string> {
  /** Resolve the options shown for a given menu id. */
  getOptions: (id: Id) => ReadonlyArray<RadialOption>;
  /** Called when the menu closes with a valid selection under the cursor. */
  onApply: (id: Id, value: string) => void;
  /** Called on a quick-tap that never triggered the menu to open. */
  onQuickTap: (id: Id, shiftKey: boolean) => void;
}

export interface UseRadialMenuReturn<Id extends string> {
  activeId: Ref<Id | null>;
  cursorX: Ref<number>;
  cursorY: Ref<number>;
  currentOptions: ComputedRef<ReadonlyArray<RadialOption>>;
  selectedIndex: ComputedRef<number>;
  beginHold: (id: Id) => void;
  endHold: (id: Id, shiftKey: boolean) => void;
  onMouseMove: (e: MouseEvent) => void;
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
export function useRadialMenu<Id extends string>(
  options: UseRadialMenuOptions<Id>,
): UseRadialMenuReturn<Id> {
  const activeId: Ref<Id | null> = ref(null);
  const cursorX = ref(0);
  const cursorY = ref(0);
  let heldId: Id | null = null;

  const currentOptions = computed(() =>
    activeId.value == null ? [] : options.getOptions(activeId.value),
  );

  const selectedIndex = computed(() =>
    radialSelectedIndex(cursorX.value, cursorY.value, currentOptions.value.length),
  );

  const {
    start: startHoldTimer,
    stop: stopHoldTimer,
    isPending: isHoldPending,
  } = useTimeoutFn(
    () => {
      if (heldId == null) return;
      activeId.value = heldId;
      cursorX.value = 0;
      cursorY.value = 0;
    },
    RADIAL_MENU_HOLD_DELAY_MS,
    { immediate: false },
  );

  function beginHold(id: Id): void {
    if (isHoldPending.value || activeId.value != null) return;
    heldId = id;
    startHoldTimer();
  }

  function endHold(id: Id, shiftKey: boolean): void {
    if (heldId !== id) return;
    const wasOpen = activeId.value != null;
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
    stopHoldTimer();
  }

  function onMouseMove(e: MouseEvent): void {
    if (activeId.value != null) {
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
