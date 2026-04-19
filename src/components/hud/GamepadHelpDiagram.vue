<script setup lang="ts">
/**
 * DRAFT controller-layout help diagram.
 *
 * Shows each gamepad binding as a labeled button on a schematic controller
 * with callout lines to action descriptions. Vendor-aware: labels on the
 * buttons match the user's hardware (A/B/X/Y vs ✕/○/□/△ vs B/A/Y/X).
 *
 * TODO: replace the rough SVG body + circles below with proper Kenney /
 * Xelu CC0 controller art (per `project_gamepad_prompts.md`). Keep the
 * BUTTON_POSITIONS map — the layout coordinates are what will anchor the
 * callout labels once the real artwork lands. The font-based glyph labels
 * should also be swapped for the vendor-specific button SVGs at that time.
 */
import { computed } from 'vue';
import { useGamepadInput } from '../../composables/useGamepadInput';
import type { ActionId } from '../../input/actions';
import { ACTION_IDS, ACTIONS } from '../../input/actions';
import { displayGamepadCode } from '../../input/gamepadVendor';
import { useControlSettings } from '../../stores/controlSettings';

const controls = useControlSettings();
const { vendor, connectedIndex } = useGamepadInput();

/**
 * Vendor used to render glyph labels. Falls back to Xbox when no pad is
 * connected so browsing the diagram still looks familiar (A/B/X/Y) rather
 * than raw "B0/B1/...".
 */
const displayVendor = computed(() =>
  connectedIndex.value == null ? ('xbox' as const) : vendor.value,
);

/**
 * Normalized (0..1) positions of each button on the schematic. Coordinates
 * roughly match an Xbox/DualSense layout: face buttons right, d-pad left,
 * shoulders up top, sticks bottom-center, menu buttons middle.
 *
 * Side: which edge the callout label attaches to. Determines leader-line
 * direction and label column (left callouts group on the left side, etc.).
 */
interface ButtonSlot {
  x: number;
  y: number;
  side: 'left' | 'right' | 'top' | 'bottom';
}

const BUTTON_POSITIONS: Record<string, ButtonSlot> = {
  // Face buttons (right cluster, diamond)
  Button0: { x: 0.78, y: 0.58, side: 'right' }, // bottom face
  Button1: { x: 0.86, y: 0.5, side: 'right' }, // right face
  Button2: { x: 0.7, y: 0.5, side: 'right' }, // left face
  Button3: { x: 0.78, y: 0.42, side: 'right' }, // top face
  // Shoulders
  Button4: { x: 0.25, y: 0.12, side: 'top' }, // LB/L1
  Button5: { x: 0.75, y: 0.12, side: 'top' }, // RB/R1
  // Triggers
  Button6: { x: 0.2, y: 0.02, side: 'top' }, // LT/L2
  Button7: { x: 0.8, y: 0.02, side: 'top' }, // RT/R2
  // Center cluster
  Button8: { x: 0.42, y: 0.44, side: 'top' }, // View/Select/Share
  Button9: { x: 0.58, y: 0.44, side: 'top' }, // Menu/Start/Options
  // Stick clicks (drawn on top of sticks)
  Button10: { x: 0.32, y: 0.68, side: 'bottom' }, // L3
  Button11: { x: 0.68, y: 0.68, side: 'bottom' }, // R3
  // D-pad (left cluster)
  Button12: { x: 0.22, y: 0.42, side: 'left' }, // up
  Button13: { x: 0.22, y: 0.58, side: 'left' }, // down
  Button14: { x: 0.14, y: 0.5, side: 'left' }, // left
  Button15: { x: 0.3, y: 0.5, side: 'left' }, // right
};

interface ButtonEntry {
  code: string;
  glyph: string;
  actionLabel: string;
  slot: ButtonSlot;
}

const buttonEntries = computed<ButtonEntry[]>(() => {
  const entries: ButtonEntry[] = [];
  for (const id of ACTION_IDS as ActionId[]) {
    const code = controls.getBinding(id, 'gamepad');
    if (code == null || code === '') continue;
    const slot = BUTTON_POSITIONS[code];
    if (slot == null) continue;
    entries.push({
      code,
      glyph: displayGamepadCode(code, displayVendor.value),
      actionLabel: ACTIONS[id].label,
      slot,
    });
  }
  return entries;
});

const vendorLabel = computed(() => {
  const v = displayVendor.value;
  if (v === 'playstation') return 'PlayStation';
  if (v === 'nintendo') return 'Nintendo';
  return 'Xbox';
});

// Group callouts by side for the outer label columns.
const leftCallouts = computed(() => buttonEntries.value.filter((e) => e.slot.side === 'left'));
const rightCallouts = computed(() => buttonEntries.value.filter((e) => e.slot.side === 'right'));
const topCallouts = computed(() => buttonEntries.value.filter((e) => e.slot.side === 'top'));
const bottomCallouts = computed(() => buttonEntries.value.filter((e) => e.slot.side === 'bottom'));
</script>

<template>
  <div class="flex max-h-[90vh] w-full max-w-4xl flex-col gap-4 overflow-auto p-6">
    <div class="text-center text-xs tracking-[0.2em] text-white/50 uppercase">
      Controller Layout · {{ vendorLabel }}
    </div>

    <!-- Top shoulder/trigger callouts -->
    <div class="flex justify-between gap-2 text-xs text-white/80">
      <div class="flex flex-col gap-1">
        <div
          v-for="entry in topCallouts.slice(0, Math.ceil(topCallouts.length / 2))"
          :key="entry.code"
          class="flex items-center gap-2"
        >
          <kbd class="border border-accent-bright/30 bg-accent/10 px-1.5 py-0.5 font-mono">
            {{ entry.glyph }}
          </kbd>
          <span class="text-white/70">{{ entry.actionLabel }}</span>
        </div>
      </div>
      <div class="flex flex-col gap-1 text-right">
        <div
          v-for="entry in topCallouts.slice(Math.ceil(topCallouts.length / 2))"
          :key="entry.code"
          class="flex items-center justify-end gap-2"
        >
          <span class="text-white/70">{{ entry.actionLabel }}</span>
          <kbd class="border border-accent-bright/30 bg-accent/10 px-1.5 py-0.5 font-mono">
            {{ entry.glyph }}
          </kbd>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      <!-- Left callouts -->
      <div class="flex flex-col gap-2 text-right text-xs">
        <div
          v-for="entry in leftCallouts"
          :key="entry.code"
          class="flex items-center justify-end gap-2"
        >
          <span class="text-white/70">{{ entry.actionLabel }}</span>
          <kbd class="border border-accent-bright/30 bg-accent/10 px-1.5 py-0.5 font-mono">
            {{ entry.glyph }}
          </kbd>
        </div>
      </div>

      <!-- Schematic controller body. TODO: swap for Kenney/Xelu SVG art. -->
      <svg
        viewBox="0 0 400 250"
        class="h-auto w-[min(420px,60vw)] text-white/60"
        role="img"
        aria-label="Schematic gamepad"
      >
        <!-- Body -->
        <path
          d="M 80 120 Q 40 80 60 60 Q 100 40 160 60 L 240 60 Q 300 40 340 60 Q 360 80 320 120 Q 340 180 280 200 Q 240 210 200 190 Q 160 210 120 200 Q 60 180 80 120 Z"
          fill="currentColor"
          fill-opacity="0.08"
          stroke="currentColor"
          stroke-opacity="0.4"
          stroke-width="1.5"
        />
        <!-- Sticks -->
        <circle
          cx="128"
          cy="170"
          r="18"
          fill="currentColor"
          fill-opacity="0.1"
          stroke="currentColor"
          stroke-opacity="0.4"
        />
        <circle
          cx="272"
          cy="170"
          r="18"
          fill="currentColor"
          fill-opacity="0.1"
          stroke="currentColor"
          stroke-opacity="0.4"
        />
        <!-- Face-button well -->
        <circle
          cx="312"
          cy="125"
          r="32"
          fill="currentColor"
          fill-opacity="0.04"
          stroke="currentColor"
          stroke-opacity="0.2"
        />
        <!-- D-pad cross -->
        <rect
          x="80"
          y="115"
          width="32"
          height="20"
          fill="currentColor"
          fill-opacity="0.08"
          stroke="currentColor"
          stroke-opacity="0.3"
        />
        <rect
          x="86"
          y="105"
          width="20"
          height="40"
          fill="currentColor"
          fill-opacity="0.08"
          stroke="currentColor"
          stroke-opacity="0.3"
        />
        <!-- Individual button glyphs -->
        <g v-for="entry in buttonEntries" :key="entry.code">
          <circle
            :cx="entry.slot.x * 400"
            :cy="entry.slot.y * 250"
            r="13"
            fill="rgb(var(--color-accent-bright) / 0.15)"
            stroke="rgb(var(--color-accent-bright) / 0.5)"
            stroke-width="1"
          />
          <text
            :x="entry.slot.x * 400"
            :y="entry.slot.y * 250 + 4"
            text-anchor="middle"
            class="fill-white font-mono"
            font-size="11"
          >
            {{ entry.glyph }}
          </text>
        </g>
      </svg>

      <!-- Right callouts -->
      <div class="flex flex-col gap-2 text-xs">
        <div v-for="entry in rightCallouts" :key="entry.code" class="flex items-center gap-2">
          <kbd class="border border-accent-bright/30 bg-accent/10 px-1.5 py-0.5 font-mono">
            {{ entry.glyph }}
          </kbd>
          <span class="text-white/70">{{ entry.actionLabel }}</span>
        </div>
      </div>
    </div>

    <!-- Bottom stick-click callouts -->
    <div class="flex justify-center gap-6 text-xs">
      <div v-for="entry in bottomCallouts" :key="entry.code" class="flex items-center gap-2">
        <kbd class="border border-accent-bright/30 bg-accent/10 px-1.5 py-0.5 font-mono">
          {{ entry.glyph }}
        </kbd>
        <span class="text-white/70">{{ entry.actionLabel }}</span>
      </div>
    </div>

    <!-- Sticks (analog) — not in the registry, documented statically. -->
    <div class="grid grid-cols-2 gap-4 border-t border-white/10 pt-3 text-xs text-white/60">
      <div class="flex items-center gap-2">
        <kbd class="border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono">LS</kbd>
        <span>Move (forward / strafe)</span>
      </div>
      <div class="flex items-center gap-2">
        <kbd class="border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono">RS</kbd>
        <span>Look around</span>
      </div>
    </div>
  </div>
</template>
