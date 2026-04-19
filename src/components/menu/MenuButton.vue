<script setup lang="ts">
defineProps<{ label: string }>();
defineEmits<{ click: [] }>();
</script>

<template>
  <button
    class="w-64 cursor-pointer border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium tracking-wider text-white/90 uppercase transition-all duration-200 hover:border-accent-bright/40 hover:bg-accent/20 hover:text-white focus-visible:border-accent-bright focus-visible:bg-accent/30 focus-visible:text-white focus-visible:outline-none"
    @click="$emit('click')"
  >
    {{ label }}
  </button>
</template>
