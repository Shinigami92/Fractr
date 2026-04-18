import { ref } from 'vue';

/**
 * Reactive map from `KeyboardEvent.code` → the label printed on the user's
 * physical keycap for their current layout. `null` until resolved, or if the
 * browser does not support the Keyboard API (Firefox, Safari).
 *
 * Use this only for *display*. Bindings are always stored as `code` values so
 * they remain layout-stable.
 */
const layoutMap = ref<Map<string, string> | null>(null);

interface KeyboardApi {
  getLayoutMap(): Promise<Map<string, string>>;
  addEventListener?(type: 'layoutchange', listener: () => void): void;
}

function getKeyboardApi(): KeyboardApi | undefined {
  const api = (navigator as Navigator & { keyboard?: KeyboardApi }).keyboard;
  return api && typeof api.getLayoutMap === 'function' ? api : undefined;
}

let initialized = false;

/**
 * Resolve the current keyboard layout map and subscribe to `layoutchange`.
 * Safe to call multiple times (idempotent — important for Vite HMR so we
 * don't stack `layoutchange` listeners on every hot reload); no-ops on
 * unsupported browsers.
 */
export async function initKeyboardLayout(): Promise<void> {
  if (initialized) return;
  const keyboard = getKeyboardApi();
  if (!keyboard) return;
  initialized = true;
  try {
    layoutMap.value = await keyboard.getLayoutMap();
    keyboard.addEventListener?.('layoutchange', () => {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Keyboard API returns a Map with mutating methods
      void keyboard.getLayoutMap().then((map) => {
        layoutMap.value = map;
      });
    });
  } catch {
    // Keyboard API is best-effort: permissions or browser quirks may reject
    // the promise. Fall through to the code-slicing fallback.
  }
}

/** Layout-aware keycap label for a code, or `undefined` if not available. */
export function getKeycapLabel(code: string): string | undefined {
  return layoutMap.value?.get(code);
}
