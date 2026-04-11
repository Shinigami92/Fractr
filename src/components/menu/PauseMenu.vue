<script setup lang="ts">
import { useAppState } from '../../stores/appState';
import MenuButton from './MenuButton.vue';

const appState = useAppState();

function onResume(): void {
  appState.resume();
}

function onSettings(): void {
  appState.openSettings('pause');
}

function onBackToMenu(): void {
  appState.backToTitle();
}
</script>

<template>
  <div class="fixed inset-0 z-20 flex flex-col items-center justify-center">
    <div class="absolute inset-0 bg-black/70" />

    <div class="relative z-10 flex flex-col items-center gap-8">
      <h2
        class="text-3xl font-bold tracking-[0.15em] text-white/90"
        style="text-shadow: 0 0 20px rgba(124, 58, 237, 0.4)"
      >
        PAUSED
      </h2>

      <div class="flex flex-col gap-3">
        <MenuButton label="Resume" @click="onResume" />
        <MenuButton label="Settings" @click="onSettings" />
        <MenuButton label="Back to Menu" @click="onBackToMenu" />
      </div>
    </div>
  </div>
</template>
