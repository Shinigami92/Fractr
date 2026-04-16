<script setup lang="ts">
import { onMounted, onUnmounted, ref, reactive } from 'vue';
import {
  type SaveEntry,
  deleteSave,
  exportSaves,
  getAllSaves,
  getThumbnail,
  importSaves,
  validateImport,
} from '../../services/savesDB';
import { useAppState } from '../../stores/appState';
import { FRACTAL_CONFIGS, type FractalType } from '../../stores/fractalParams';

const emit = defineEmits<{
  load: [state: SaveEntry['state']];
  regenerateThumbnails: [saves: SaveEntry[]];
}>();

const appState = useAppState();
const saves = ref<SaveEntry[]>([]);
const thumbnailUrls = ref<Record<string, string>>({});
const filterFractal = ref<string>('');
const importInput = ref<HTMLInputElement | null>(null);

const filteredSaves = ref<SaveEntry[]>([]);
const regenerating = ref(false);

function updateFilter(): void {
  if (!filterFractal.value) {
    filteredSaves.value = saves.value;
  } else {
    filteredSaves.value = saves.value.filter((s) => s.state.fractalType === filterFractal.value);
  }
}

async function loadSaves(): Promise<void> {
  saves.value = await getAllSaves();
  updateFilter();
  // Load thumbnails sequentially
  const missing: SaveEntry[] = [];
  for (const save of saves.value) {
    const blob = await getThumbnail(save.stateHash);
    if (blob) {
      thumbnailUrls.value[save.stateHash] = URL.createObjectURL(blob);
    } else {
      missing.push(save);
    }
  }
  // Auto-regenerate missing thumbnails
  if (missing.length > 0) {
    regenerating.value = true;
    emit('regenerateThumbnails', missing);
  }
}

function onLoad(entry: SaveEntry): void {
  emit('load', entry.state);
}

async function onDelete(entry: SaveEntry): Promise<void> {
  await deleteSave(entry.stateHash);
  const url = thumbnailUrls.value[entry.stateHash];
  if (url) {
    URL.revokeObjectURL(url);
    delete thumbnailUrls.value[entry.stateHash];
  }
  await loadSaves();
}

function onExport(): void {
  const data = exportSaves(filteredSaves.value);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fractr-saves-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function onImportClick(): void {
  importInput.value?.click();
}

const importStatus = ref('');

async function onImportFile(e: Event): Promise<void> {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const parsed = JSON.parse(text);
    const entries = validateImport(parsed);
    const count = await importSaves(entries);
    importStatus.value = `Imported ${count} of ${entries.length} save(s)`;
    await loadSaves();
  } catch (err) {
    importStatus.value = err instanceof Error ? err.message : 'Invalid save file';
  }
  if (importInput.value) importInput.value.value = '';
  setTimeout(() => {
    importStatus.value = '';
  }, 4000);
}

// Called from parent after thumbnails are regenerated
async function refreshThumbnails(): Promise<void> {
  regenerating.value = false;
  for (const save of saves.value) {
    if (!thumbnailUrls.value[save.stateHash]) {
      const blob = await getThumbnail(save.stateHash);
      if (blob) {
        thumbnailUrls.value[save.stateHash] = URL.createObjectURL(blob);
      }
    }
  }
}

function setThumbnail(stateHash: string, blob: Blob): void {
  thumbnailUrls.value[stateHash] = URL.createObjectURL(blob);
}

defineExpose({ refreshThumbnails, setThumbnail });

function onBack(): void {
  appState.closeSaves();
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

const hoverPreview = reactive({ url: '', x: 0, y: 0, visible: false });

function onThumbEnter(stateHash: string, e: MouseEvent): void {
  const url = thumbnailUrls.value[stateHash];
  if (!url) return;
  hoverPreview.url = url;
  hoverPreview.x = e.clientX;
  hoverPreview.y = e.clientY;
  hoverPreview.visible = true;
}

function onThumbMove(e: MouseEvent): void {
  hoverPreview.x = e.clientX;
  hoverPreview.y = e.clientY;
}

function onThumbLeave(): void {
  hoverPreview.visible = false;
}

function formatNum(n: number, digits = 2): string {
  return n.toFixed(digits);
}

function fractalLabel(type: FractalType): string {
  return FRACTAL_CONFIGS[type]?.label ?? type;
}

onMounted(loadSaves);

onUnmounted(() => {
  for (const url of Object.values(thumbnailUrls.value)) {
    URL.revokeObjectURL(url);
  }
  thumbnailUrls.value = {};
});
</script>

<template>
  <div class="fixed inset-0 z-20 flex flex-col items-center backdrop-blur-sm">
    <div class="absolute inset-0 bg-black/80" />

    <div class="relative z-10 flex h-full w-full max-w-7xl flex-col gap-4 p-6">
      <div class="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h2
          class="text-2xl font-bold tracking-[0.15em] text-white/90"
          style="text-shadow: 0 0 20px rgba(124, 58, 237, 0.4)"
        >
          SAVED LOCATIONS
        </h2>
        <button
          class="cursor-pointer border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wider text-white/90 uppercase transition-all hover:border-accent-bright/40 hover:bg-accent/20 sm:order-last"
          @click="onBack"
        >
          Back
        </button>
        <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select
            v-model="filterFractal"
            class="border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white"
            @change="updateFilter"
          >
            <option value="">All Fractals</option>
            <option v-for="(cfg, key) in FRACTAL_CONFIGS" :key="key" :value="key">
              {{ cfg.label }}
            </option>
          </select>
          <button
            class="cursor-pointer border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-accent/20 hover:text-white"
            @click="onImportClick"
          >
            Import
          </button>
          <button
            class="cursor-pointer border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-accent/20 hover:text-white"
            @click="onExport"
          >
            Export
          </button>
          <span v-if="regenerating" class="px-2 py-1.5 text-xs text-white/40">
            Generating thumbnails...
          </span>
          <span v-if="importStatus" class="px-2 py-1.5 text-xs text-accent-bright">
            {{ importStatus }}
          </span>
        </div>
      </div>

      <input ref="importInput" type="file" accept=".json" class="hidden" @change="onImportFile" />

      <div class="min-h-0 flex-1 overflow-auto">
        <table v-if="filteredSaves.length > 0" class="w-full border-collapse text-xs">
          <thead class="sticky top-0 z-10 bg-surface-dim">
            <tr class="border-b border-white/10 text-left text-white/40">
              <th class="px-2 py-2">Thumb</th>
              <th class="px-2 py-2">Fractal</th>
              <th class="px-2 py-2">Color</th>
              <th class="px-2 py-2">Render</th>
              <th class="px-2 py-2">Power</th>
              <th class="px-2 py-2">Iter</th>
              <th class="px-2 py-2">Bail</th>
              <th class="px-2 py-2">X</th>
              <th class="px-2 py-2">Y</th>
              <th class="px-2 py-2">Z</th>
              <th class="px-2 py-2">Yaw</th>
              <th class="px-2 py-2">Pitch</th>
              <th class="px-2 py-2">Roll</th>
              <th class="px-2 py-2">Date</th>
              <th class="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="save in filteredSaves"
              :key="save.stateHash"
              class="border-b border-white/5 text-white/70 transition-colors hover:bg-white/5"
            >
              <td
                class="px-2 py-1.5"
                @mouseenter="onThumbEnter(save.stateHash, $event)"
                @mousemove="onThumbMove"
                @mouseleave="onThumbLeave"
              >
                <img
                  v-if="thumbnailUrls[save.stateHash]"
                  :src="thumbnailUrls[save.stateHash]"
                  class="h-8 w-14 rounded object-cover"
                />
                <div
                  v-else
                  class="flex h-8 w-14 items-center justify-center rounded bg-white/5 text-white/20"
                >
                  ?
                </div>
              </td>
              <td class="px-2 py-1.5 font-medium text-white/90">
                {{ fractalLabel(save.state.fractalType) }}
              </td>
              <td class="px-2 py-1.5">{{ save.state.colorMode }}</td>
              <td class="px-2 py-1.5">{{ save.state.renderMode }}</td>
              <td class="px-2 py-1.5 font-mono">{{ formatNum(save.state.power, 1) }}</td>
              <td class="px-2 py-1.5 font-mono">{{ save.state.maxIterations }}</td>
              <td class="px-2 py-1.5 font-mono">{{ formatNum(save.state.bailout, 1) }}</td>
              <td class="px-2 py-1.5 font-mono">{{ formatNum(save.state.x, 3) }}</td>
              <td class="px-2 py-1.5 font-mono">{{ formatNum(save.state.y, 3) }}</td>
              <td class="px-2 py-1.5 font-mono">{{ formatNum(save.state.z, 3) }}</td>
              <td class="px-2 py-1.5 font-mono">{{ formatNum(save.state.yaw, 2) }}</td>
              <td class="px-2 py-1.5 font-mono">{{ formatNum(save.state.pitch, 2) }}</td>
              <td class="px-2 py-1.5 font-mono">{{ formatNum(save.state.roll, 2) }}</td>
              <td class="whitespace-nowrap px-2 py-1.5 text-white/40">
                {{ formatDate(save.timestamp) }}
              </td>
              <td class="px-2 py-1.5">
                <div class="flex gap-1">
                  <button
                    class="cursor-pointer rounded bg-accent/20 px-2 py-0.5 text-accent-bright transition-colors hover:bg-accent/40"
                    @click="onLoad(save)"
                  >
                    Load
                  </button>
                  <button
                    class="cursor-pointer rounded bg-red-900/30 px-2 py-0.5 text-red-400 transition-colors hover:bg-red-900/50"
                    @click="onDelete(save)"
                  >
                    Del
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="flex h-full items-center justify-center text-white/30">
          No saved locations yet. Press F5 while exploring to save.
        </div>
      </div>
    </div>

    <!-- Thumbnail hover preview -->
    <div
      v-if="hoverPreview.visible"
      class="pointer-events-none fixed z-50 overflow-hidden rounded border border-white/20 shadow-xl"
      :style="{
        left: `${hoverPreview.x + 16}px`,
        top: `${hoverPreview.y - 100}px`,
      }"
    >
      <img :src="hoverPreview.url" class="h-45 w-80 object-cover" />
    </div>
  </div>
</template>
