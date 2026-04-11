import { defineStore } from 'pinia';
import { ref } from 'vue';

export type AppMode = 'title' | 'loading' | 'playing' | 'paused' | 'settings';
export type SettingsSource = 'title' | 'pause';

export const useAppState = defineStore('appState', () => {
  const mode = ref<AppMode>('title');
  const settingsSource = ref<SettingsSource>('title');

  function startGame(): void {
    mode.value = 'loading';
  }

  function onLoaded(): void {
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

  function backToTitle(): void {
    mode.value = 'title';
  }

  return {
    mode,
    settingsSource,
    startGame,
    onLoaded,
    pause,
    resume,
    openSettings,
    closeSettings,
    backToTitle,
  };
});
