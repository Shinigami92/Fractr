<script setup lang="ts">
defineProps<{
  visible: boolean;
  text: string;
}>();
</script>

<template>
  <Transition name="fade">
    <div
      v-if="visible"
      class="pointer-events-none fixed bottom-8 left-1/2 z-30 -translate-x-1/2 border border-white/10 bg-surface-dim/90 px-4 py-2 font-mono text-sm text-accent-bright"
    >
      {{ text }}
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
