<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const emit = defineEmits<{
  ready: [canvas: HTMLCanvasElement];
  resize: [width: number, height: number];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let observer: ResizeObserver | null = null;

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(width * dpr);
      const h = Math.floor(height * dpr);
      canvas.width = w;
      canvas.height = h;
      emit('resize', w, h);
    }
  });
  observer.observe(canvas);

  emit('ready', canvas);
});

onUnmounted(() => {
  observer?.disconnect();
});

defineExpose({ canvas: canvasRef });
</script>

<template>
  <canvas ref="canvasRef" class="fixed inset-0 h-full w-full" />
</template>
