<script setup lang="ts">
defineProps<{
  showHelp: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-help'): void;
  (e: 'pause'): void;
}>();
</script>

<template>
  <!--
    Touch-only action buttons: rendered outside GameHud's pointer-events-none
    container so mobile touch hit-testing isn't blocked by the parent.
  -->
  <div class="fixed top-3 right-3 z-20 flex gap-2">
    <button
      class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-sm transition-colors active:bg-white/20"
      :aria-pressed="showHelp"
      @touchstart.stop.prevent="emit('toggle-help')"
      @click.stop="emit('toggle-help')"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <text x="9" y="14" text-anchor="middle" font-size="14" font-weight="bold">?</text>
      </svg>
    </button>
    <button
      class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-sm transition-colors active:bg-white/20"
      @touchstart.stop.prevent="emit('pause')"
      @click.stop="emit('pause')"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <rect x="3" y="2" width="4" height="14" rx="1" />
        <rect x="11" y="2" width="4" height="14" rx="1" />
      </svg>
    </button>
  </div>
</template>
