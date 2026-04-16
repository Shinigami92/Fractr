import { defineStore } from 'pinia';
import { ref } from 'vue';

export type AppMode = 'title' | 'select' | 'playing' | 'paused' | 'settings' | 'saves';
export type SettingsSource = 'title' | 'pause';

export const useAppState = defineStore('appState', () => {
  const mode = ref<AppMode>('title');
  const settingsSource = ref<SettingsSource>('title');

  function openSelect(): void {
    mode.value = 'select';
  }

  function startGame(): void {
    mode.value = 'playing';
  }

  function pause(): void {
    mode.value = 'paused';
  }

  function resume(): void {
    mode.value = 'playing';
  }

  function openSettings(from: SettingsSource): void {
    settingsSource.value = from;
    mode.value = 'settings';
  }

  function closeSettings(): void {
    mode.value = settingsSource.value === 'pause' ? 'paused' : 'title';
  }

  let savesReturnMode: AppMode = 'title';

  function openSaves(): void {
    savesReturnMode = mode.value === 'playing' ? 'paused' : mode.value;
    mode.value = 'saves';
  }

  function closeSaves(): void {
    mode.value = savesReturnMode;
  }

  function backToTitle(): void {
    mode.value = 'title';
  }

  return {
    mode,
    settingsSource,
    openSelect,
    openSaves,
    closeSaves,
    startGame,
    pause,
    resume,
    openSettings,
    closeSettings,
    backToTitle,
  };
});
