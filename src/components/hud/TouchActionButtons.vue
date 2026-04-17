<script setup lang="ts">
import IconCircleHelp from '~icons/lucide/circle-help';
import IconPause from '~icons/lucide/pause';

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
      <IconCircleHelp class="h-[18px] w-[18px]" />
    </button>
    <button
      class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-sm transition-colors active:bg-white/20"
      @touchstart.stop.prevent="emit('pause')"
      @click.stop="emit('pause')"
    >
      <IconPause class="h-[18px] w-[18px]" fill="currentColor" />
    </button>
  </div>
</template>
