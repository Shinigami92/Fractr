import type { PiniaPlugin } from 'pinia';

/**
 * Bump this when any store's shape changes (added/removed/renamed fields).
 * On mismatch, all persisted settings are discarded and reset to defaults.
 */
const SETTINGS_VERSION = 1;
const VERSION_KEY = 'fractr:settings-version';

const PERSISTED_STORES = new Set([
  'fractalParams',
  'graphicsSettings',
  'controlSettings',
  'hudSettings',
]);

function isVersionCompatible(): boolean {
  const stored = localStorage.getItem(VERSION_KEY);
  return stored === String(SETTINGS_VERSION);
}

function writeVersion(): void {
  localStorage.setItem(VERSION_KEY, String(SETTINGS_VERSION));
}

function clearAllSettings(): void {
  for (const id of PERSISTED_STORES) {
    localStorage.removeItem(`fractr:${id}`);
  }
}

export const piniaPersistPlugin: PiniaPlugin = ({ store }) => {
  if (!PERSISTED_STORES.has(store.$id)) return;

  const key = `fractr:${store.$id}`;

  // On first store init: check version compatibility
  if (!isVersionCompatible()) {
    clearAllSettings();
    writeVersion();
  }

  // Restore state from localStorage
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      store.$patch(JSON.parse(saved));
    } catch {
      localStorage.removeItem(key);
    }
  }

  // Persist on every change
  store.$subscribe(
    () => {
      localStorage.setItem(key, JSON.stringify(store.$state));
    },
    { detached: true },
  );
};
