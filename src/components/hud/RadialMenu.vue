<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  options: ReadonlyArray<{ readonly value: string; readonly short: string }>;
  selectedIndex: number;
  currentValue: string;
  cursorX: number;
  cursorY: number;
}>();

const TAU = Math.PI * 2;
const INNER_RADIUS = 45;

const outerRadius = computed(() => {
  const count = props.options.length;
  return Math.max(100, Math.ceil(42 / Math.sin(Math.PI / count)));
});

const viewSize = computed(() => outerRadius.value * 2 + 80);

// SVG path for the annular ring used as clip-path for backdrop blur
const blurRingPath = computed(() => {
  const cx = viewSize.value / 2;
  const cy = viewSize.value / 2;
  const or = outerRadius.value + 2;
  const ir = INNER_RADIUS - 2;
  // Outer circle clockwise, inner circle counter-clockwise (hole)
  return `M${cx + or},${cy} A${or},${or} 0 1 1 ${cx - or},${cy} A${or},${or} 0 1 1 ${cx + or},${cy}Z M${cx + ir},${cy} A${ir},${ir} 0 1 0 ${cx - ir},${cy} A${ir},${ir} 0 1 0 ${cx + ir},${cy}Z`;
});

const sectors = computed(() => {
  const count = props.options.length;
  const angleStep = TAU / count;
  const startOffset = -Math.PI / 2;
  const r = outerRadius.value;
  const ir = INNER_RADIUS;
  const labelR = ir + (r - ir) * 0.67;

  return props.options.map((opt, i) => {
    // Sector wedge with gap between segments
    const gap = 0.021;
    const a1 = startOffset + i * angleStep - angleStep / 2 + gap;
    const a2 = a1 + angleStep - gap * 2;
    const large = angleStep > Math.PI ? 1 : 0;

    const ox1 = Math.cos(a1) * r;
    const oy1 = Math.sin(a1) * r;
    const ox2 = Math.cos(a2) * r;
    const oy2 = Math.sin(a2) * r;
    const ix1 = Math.cos(a2) * ir;
    const iy1 = Math.sin(a2) * ir;
    const ix2 = Math.cos(a1) * ir;
    const iy2 = Math.sin(a1) * ir;

    const path = `M${ix2},${iy2} L${ox1},${oy1} A${r},${r} 0 ${large} 1 ${ox2},${oy2} L${ix1},${iy1} A${ir},${ir} 0 ${large} 0 ${ix2},${iy2}Z`;

    // Label position at midpoint of sector
    const midAngle = startOffset + i * angleStep;
    const lx = Math.cos(midAngle) * labelR;
    const ly = Math.sin(midAngle) * labelR;

    return { value: opt.value, short: opt.short, path, lx, ly, index: i };
  });
});
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/40" />

    <div class="relative" :style="{ width: `${viewSize}px`, height: `${viewSize}px` }">
      <!-- Backdrop blur ring -->
      <div
        class="absolute inset-0 backdrop-blur-md"
        :style="{
          clipPath: `path('${blurRingPath}')`,
        }"
      />

      <svg
        :width="viewSize"
        :height="viewSize"
        :viewBox="`${-viewSize / 2} ${-viewSize / 2} ${viewSize} ${viewSize}`"
        class="absolute inset-0"
      >
        <!-- Sector wedges -->
        <path
          v-for="sector in sectors"
          :key="sector.value"
          :d="sector.path"
          :fill="
            sector.index === selectedIndex
              ? 'rgba(124, 58, 237, 0.2)'
              : sector.value === currentValue
                ? 'rgba(124, 58, 237, 0.08)'
                : 'rgba(255, 255, 255, 0.05)'
          "
          :stroke="
            sector.index === selectedIndex
              ? 'rgba(167, 139, 250, 0.4)'
              : sector.value === currentValue
                ? 'rgba(167, 139, 250, 0.25)'
                : 'rgba(255, 255, 255, 0.1)'
          "
          stroke-width="1"
          class="transition-colors"
          style="transition-duration: 100ms"
        />

        <!-- Cursor direction line -->
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

        <!-- Center dot -->
        <circle cx="0" cy="0" r="4" fill="white" opacity="0.3" />

        <!-- Labels on sectors -->
        <text
          v-for="sector in sectors"
          :key="`label-${sector.value}`"
          :x="sector.lx"
          :y="sector.ly"
          text-anchor="middle"
          dominant-baseline="central"
          :fill="
            sector.index === selectedIndex
              ? 'white'
              : sector.value === currentValue
                ? 'rgba(167, 139, 250, 0.9)'
                : 'rgba(255, 255, 255, 0.55)'
          "
          :font-size="sector.index === selectedIndex ? '12' : '10'"
          :font-weight="
            sector.index === selectedIndex || sector.value === currentValue ? 'bold' : 'normal'
          "
          font-family="system-ui, sans-serif"
          class="select-none"
        >
          {{ sector.short }}
        </text>
      </svg>
    </div>
  </div>
</template>
