<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <div class="flex flex-col items-center gap-4 text-center">
      <p class="text-xl text-red-400">WebGPU Not Available</p>
      <p class="text-sm text-white/50">{{ message }}</p>
    </div>
  </div>
</template>
