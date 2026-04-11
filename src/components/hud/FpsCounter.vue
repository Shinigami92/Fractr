<script setup lang="ts">
defineProps<{ fps: number }>();
</script>

<template>
  <div class="font-mono text-xs text-white/70">{{ fps }} FPS</div>
</template>
