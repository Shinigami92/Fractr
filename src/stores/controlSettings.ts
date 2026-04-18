import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ActionBindings, ActionId, InputMode } from '../input/actions';
import { ACTIONS } from '../input/actions';

type BindingOverrides = Partial<Record<ActionId, Partial<ActionBindings>>>;

export const useControlSettings = defineStore('controlSettings', () => {
  const cameraSpeed = ref(2.0);
  const mouseSensitivity = ref(0.002);
  /**
   * Per-action, per-input-mode binding overrides. Absent entries fall through
   * to `ACTIONS[id].defaultBindings[mode]`. Persisted via piniaPersist.
   */
  const overrides = ref<BindingOverrides>({});

  /** Effective binding for the given action + input mode, or undefined. */
  function getBinding(actionId: ActionId, mode: InputMode): string | undefined {
    return overrides.value[actionId]?.[mode] ?? ACTIONS[actionId].defaultBindings[mode];
  }

  /**
   * Set or clear an override for one action/mode. Pass `undefined` to revert
   * to the default. If `value` equals the default, the override is cleared
   * rather than stored — so setting a binding back to its default does not
   * leave an override record (and the "reset" affordance stays hidden).
   * Empty override objects are pruned so the store keeps a clean shape for
   * persistence.
   */
  function setBinding(actionId: ActionId, mode: InputMode, value: string | undefined): void {
    const defaults: ActionBindings = ACTIONS[actionId].defaultBindings;
    const normalized = value === defaults[mode] ? undefined : value;
    const current = overrides.value[actionId] ?? {};
    const next = { ...current };
    if (normalized == null) {
      delete next[mode];
    } else {
      next[mode] = normalized;
    }
    const pruned: BindingOverrides = { ...overrides.value };
    if (Object.keys(next).length === 0) {
      delete pruned[actionId];
    } else {
      pruned[actionId] = next;
    }
    overrides.value = pruned;
  }

  function reset(): void {
    cameraSpeed.value = 2.0;
    mouseSensitivity.value = 0.002;
    overrides.value = {};
  }

  return { cameraSpeed, mouseSensitivity, overrides, getBinding, setBinding, reset };
});

export type ControlSettingsStore = ReturnType<typeof useControlSettings>;
