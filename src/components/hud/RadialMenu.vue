<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  options: { value: string; label: string }[];
  selectedIndex: number;
  cursorX: number;
  cursorY: number;
}>();

const TAU = Math.PI * 2;

// Dynamic radius: ensure labels don't overlap
// Min spacing ~50px between adjacent items on the circle
const radius = computed(() => {
  const count = props.options.length;
  return Math.max(100, Math.ceil(50 / Math.sin(Math.PI / count)));
});

const viewSize = computed(() => radius.value * 2 + 120);

const sectors = computed(() => {
  const count = props.options.length;
  const angleStep = TAU / count;
  const startAngle = -Math.PI / 2;
  const r = radius.value;

  return props.options.map((opt, i) => {
    const angle = startAngle + i * angleStep;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    return { ...opt, x, y, index: i };
  });
});

const sectorPath = computed(() => {
  const count = props.options.length;
  if (props.selectedIndex < 0) return '';
  const angleStep = TAU / count;
  const startAngle = -Math.PI / 2 + props.selectedIndex * angleStep - angleStep / 2;
  const endAngle = startAngle + angleStep;
  const r = radius.value + 40;
  const ir = 40;
  const x1 = Math.cos(startAngle) * r;
  const y1 = Math.sin(startAngle) * r;
  const x2 = Math.cos(endAngle) * r;
  const y2 = Math.sin(endAngle) * r;
  const ix1 = Math.cos(endAngle) * ir;
  const iy1 = Math.sin(endAngle) * ir;
  const ix2 = Math.cos(startAngle) * ir;
  const iy2 = Math.sin(startAngle) * ir;
  const large = angleStep > Math.PI ? 1 : 0;
  return `M${ix2},${iy2} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${ix1},${iy1} A${ir},${ir} 0 ${large} 0 ${ix2},${iy2}Z`;
});
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/40" />

    <div class="relative" :style="{ width: `${viewSize}px`, height: `${viewSize}px` }">
      <!-- Sector highlight -->
      <svg
        :width="viewSize"
        :height="viewSize"
        :viewBox="`${-viewSize / 2} ${-viewSize / 2} ${viewSize} ${viewSize}`"
        class="absolute inset-0"
      >
        <path v-if="sectorPath" :d="sectorPath" fill="rgba(124, 58, 237, 0.2)" />
        <line
          v-if="cursorX !== 0 || cursorY !== 0"
          x1="0"
          y1="0"
          :x2="cursorX"
          :y2="cursorY"
          stroke="white"
          stroke-opacity="0.25"
          stroke-width="1.5"
        />
        <circle cx="0" cy="0" r="4" fill="white" opacity="0.3" />
      </svg>

      <!-- Option tiles -->
      <div
        v-for="sector in sectors"
        :key="sector.value"
        class="absolute left-1/2 top-1/2 select-none transition-all duration-100"
        :style="{
          transform: `translate(calc(-50% + ${sector.x}px), calc(-50% + ${sector.y}px))`,
          zIndex: sector.index === selectedIndex ? 10 : 1,
        }"
      >
        <div
          class="whitespace-nowrap rounded px-2.5 py-1 text-center text-[11px] tracking-wide backdrop-blur-md transition-all duration-100"
          :class="
            sector.index === selectedIndex
              ? 'border border-accent-bright/50 bg-accent/20 font-bold text-white'
              : 'border border-white/10 bg-white/5 text-white/60'
          "
        >
          {{ sector.label }}
        </div>
      </div>
    </div>
  </div>
</template>
