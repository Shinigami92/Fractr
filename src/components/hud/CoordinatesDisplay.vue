<script setup lang="ts">
defineProps<{ x: number; y: number; z: number }>();
</script>

<template>
  <div class="font-mono text-xs text-white/70">
    X: {{ x.toFixed(2) }} Y: {{ y.toFixed(2) }} Z: {{ z.toFixed(2) }}
  </div>
</template>
