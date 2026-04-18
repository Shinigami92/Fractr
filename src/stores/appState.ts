import { defineStore } from 'pinia';
import { ref } from 'vue';

export type AppMode = 'title' | 'select' | 'playing' | 'paused' | 'settings' | 'saves';
export type SettingsSource = 'title' | 'pause';

export const useAppState = defineStore('appState', () => {
  const mode = ref<AppMode>('title');
  const settingsSource = ref<SettingsSource>('title');
  let savesReturnMode: AppMode = 'title';

  return {
    mode,
    settingsSource,
    openSelect: () => {
      mode.value = 'select';
    },
    openSaves: () => {
      savesReturnMode = mode.value === 'playing' ? 'paused' : mode.value;
      mode.value = 'saves';
    },
    closeSaves: () => {
      mode.value = savesReturnMode;
    },
    startGame: () => {
      mode.value = 'playing';
    },
    pause: () => {
      mode.value = 'paused';
    },
    resume: () => {
      mode.value = 'playing';
    },
    openSettings: (from: SettingsSource) => {
      settingsSource.value = from;
      mode.value = 'settings';
    },
    closeSettings: () => {
      mode.value = settingsSource.value === 'pause' ? 'paused' : 'title';
    },
    backToTitle: () => {
      mode.value = 'title';
    },
  };
});

export type AppStateStore = ReturnType<typeof useAppState>;
