<script setup lang="ts">
import { useAppState } from '../../stores/appState';
import MenuButton from './MenuButton.vue';

const appState = useAppState();

function onStart(): void {
  appState.startGame();
}

function onSettings(): void {
  appState.openSettings('title');
}
</script>

<template>
  <div class="fixed inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
    <div class="absolute inset-0 bg-black/60" />

    <div class="relative z-10 flex flex-col items-center gap-10">
      <div class="flex flex-col items-center gap-2">
        <h1
          class="text-6xl font-bold tracking-[0.2em] text-white"
          style="
            text-shadow:
              0 0 40px rgba(124, 58, 237, 0.5),
              0 0 80px rgba(6, 182, 212, 0.3);
          "
        >
          FRACTR
        </h1>
        <p class="text-sm tracking-widest text-white/40">EXPLORE THE INFINITE</p>
      </div>

      <div class="flex flex-col gap-3">
        <MenuButton label="Start" @click="onStart" />
        <MenuButton label="Settings" @click="onSettings" />
      </div>

      <p class="text-xs text-white/20">WebGPU Required</p>
    </div>
  </div>
</template>
