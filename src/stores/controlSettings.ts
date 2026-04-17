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
    const defaults: ActionBindings = ACTIONS[actionId].defaultBindings;
    return overrides.value[actionId]?.[mode] ?? defaults[mode];
  }

  /**
   * Set or clear an override for one action/mode. Pass `undefined` to revert
   * to the default. Empty override objects are pruned so the store keeps a
   * clean shape for persistence.
   */
  function setBinding(actionId: ActionId, mode: InputMode, value: string | undefined): void {
    const current = overrides.value[actionId] ?? {};
    const next = { ...current };
    if (value === undefined) {
      delete next[mode];
    } else {
      next[mode] = value;
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
