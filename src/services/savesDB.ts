import type { ColorMode, FractalType, RenderMode } from '../stores/fractalParams';

export interface SavedState {
  readonly fractalType: FractalType;
  readonly power: number;
  readonly maxIterations: number;
  readonly bailout: number;
  readonly colorMode: ColorMode;
  readonly renderMode: RenderMode;
  readonly dynamicIterations: boolean;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly roll: number;
}

export interface SaveEntry {
  readonly stateHash: string;
  readonly timestamp: number;
  readonly state: SavedState;
}

const DB_NAME = 'fractr-saves';
const DB_VERSION = 1;
const SAVES_STORE = 'saves';
const THUMBS_STORE = 'thumbnails';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SAVES_STORE)) {
        const store = db.createObjectStore(SAVES_STORE, { keyPath: 'stateHash' });
        store.createIndex('fractalType', 'state.fractalType', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(THUMBS_STORE)) {
        db.createObjectStore(THUMBS_STORE, { keyPath: 'stateHash' });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.addEventListener('error', () => {
      reject(request.error ?? new Error('IndexedDB open failed'));
    });
  });
}

function hashState(state: SavedState): string {
  // Deterministic hash: round floats to avoid precision noise
  const key = [
    state.fractalType,
    state.colorMode,
    state.renderMode,
    state.power.toFixed(4),
    state.maxIterations,
    state.bailout.toFixed(4),
    state.dynamicIterations ? '1' : '0',
    state.x.toFixed(6),
    state.y.toFixed(6),
    state.z.toFixed(6),
    state.yaw.toFixed(6),
    state.pitch.toFixed(6),
    state.roll.toFixed(6),
  ].join('|');

  // Simple string hash (djb2). Bitwise `| 0` and `>>> 0` here are load-bearing:
  // they force 32-bit integer wraparound, which is the hash's defining behavior.
  // `Math.trunc` does not produce the same result, so the prefer-math-trunc and
  // prefer-code-point suggestions don't apply cleanly here.
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    // oxlint-disable-next-line unicorn/prefer-math-trunc, unicorn/prefer-code-point -- 32-bit djb2 hash; see block comment above
    hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  }
  // oxlint-disable-next-line unicorn/prefer-math-trunc -- 32-bit unsigned cast for djb2 hash; see block comment above
  return (hash >>> 0).toString(36);
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Blob is a DOM type with mutating methods
export async function saveState(state: SavedState, thumbnail?: Blob): Promise<boolean> {
  const db = await openDB();
  const stateHash = hashState(state);

  return new Promise((resolve) => {
    const tx = db.transaction([SAVES_STORE, THUMBS_STORE], 'readwrite');
    const savesStore = tx.objectStore(SAVES_STORE);

    // Check for duplicate
    const getReq = savesStore.get(stateHash);
    getReq.onsuccess = () => {
      if (getReq.result != null) {
        // Duplicate — skip silently
        resolve(false);
        return;
      }

      const entry: SaveEntry = {
        stateHash,
        timestamp: Date.now(),
        state,
      };
      savesStore.put(entry);

      if (thumbnail) {
        const thumbsStore = tx.objectStore(THUMBS_STORE);
        thumbsStore.put({ stateHash, blob: thumbnail });
      }

      resolve(true);
    };

    tx.addEventListener('error', () => {
      resolve(false);
    });
  });
}

export async function getAllSaves(): Promise<SaveEntry[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(SAVES_STORE, 'readonly');
    const store = tx.objectStore(SAVES_STORE);
    const request = store.index('timestamp').openCursor(null, 'prev'); // newest first
    const results: SaveEntry[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- IDB cursor.value is typed `any`; shape is validated via validateImport on reads from untrusted sources.
        results.push(cursor.value as SaveEntry);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.addEventListener('error', () => {
      resolve([]);
    });
  });
}

export async function getThumbnail(stateHash: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(THUMBS_STORE, 'readonly');
    const store = tx.objectStore(THUMBS_STORE);
    const request = store.get(stateHash);
    request.onsuccess = () => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- IDB request.result is `any`; thumbnail store is only written via saveThumbnail with this shape.
      const result = request.result as { stateHash: string; blob: Blob } | undefined;
      resolve(result?.blob ?? null);
    };
    request.addEventListener('error', () => {
      resolve(null);
    });
  });
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Blob is a DOM type with mutating methods
export async function saveThumbnail(stateHash: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(THUMBS_STORE, 'readwrite');
    const store = tx.objectStore(THUMBS_STORE);
    store.put({ stateHash, blob });
    tx.oncomplete = () => {
      resolve();
    };
    tx.addEventListener('error', () => {
      resolve();
    });
  });
}

export async function deleteSave(stateHash: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction([SAVES_STORE, THUMBS_STORE], 'readwrite');
    tx.objectStore(SAVES_STORE).delete(stateHash);
    tx.objectStore(THUMBS_STORE).delete(stateHash);
    tx.oncomplete = () => {
      resolve();
    };
    tx.addEventListener('error', () => {
      resolve();
    });
  });
}

function isValidSaveEntry(entry: unknown): entry is SaveEntry {
  if (entry == null || typeof entry !== 'object') return false;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- narrowing `object` to `Record<string, unknown>` for field-by-field validation below.
  const e = entry as Record<string, unknown>;
  if (typeof e.stateHash !== 'string' || typeof e.timestamp !== 'number') return false;
  const s = e.state;
  if (s == null || typeof s !== 'object') return false;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- same pattern: narrowing nested state object for field-by-field validation.
  const state = s as Record<string, unknown>;
  return (
    typeof state.fractalType === 'string' &&
    typeof state.power === 'number' &&
    typeof state.maxIterations === 'number' &&
    typeof state.bailout === 'number' &&
    typeof state.colorMode === 'string' &&
    typeof state.x === 'number' &&
    typeof state.y === 'number' &&
    typeof state.z === 'number' &&
    typeof state.yaw === 'number' &&
    typeof state.pitch === 'number'
  );
}

export function validateImport(data: unknown): SaveEntry[] {
  if (!Array.isArray(data)) throw new Error('Expected an array of saves');
  const valid: SaveEntry[] = [];
  for (const item of data) {
    if (isValidSaveEntry(item)) {
      valid.push(item);
    }
  }
  if (valid.length === 0) throw new Error('No valid saves found in file');
  return valid;
}

export async function importSaves(entries: readonly SaveEntry[]): Promise<number> {
  const db = await openDB();

  const results = await Promise.all(
    entries.map(
      (entry) =>
        new Promise<boolean>((resolve) => {
          const tx = db.transaction(SAVES_STORE, 'readwrite');
          const store = tx.objectStore(SAVES_STORE);
          const getReq = store.get(entry.stateHash);
          getReq.onsuccess = () => {
            if (getReq.result != null) {
              resolve(false);
              return;
            }
            store.put(entry);
            resolve(true);
          };
          tx.addEventListener('error', () => {
            resolve(false);
          });
        }),
    ),
  );

  return results.filter(Boolean).length;
}

export function exportSaves(entries: readonly SaveEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export { hashState };
