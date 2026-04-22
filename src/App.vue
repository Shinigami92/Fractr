<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import GpuErrorScreen from './components/GpuErrorScreen.vue';
import GameHud from './components/hud/GameHud.vue';
import HelpOverlay from './components/hud/HelpOverlay.vue';
import RadialMenu from './components/hud/RadialMenu.vue';
import ShareToast from './components/hud/ShareToast.vue';
import TouchActionButtons from './components/hud/TouchActionButtons.vue';
import FractalSelectScreen from './components/menu/FractalSelectScreen.vue';
import PauseMenu from './components/menu/PauseMenu.vue';
import SavesBrowser from './components/menu/SavesBrowser.vue';
import SettingsMenu from './components/menu/SettingsMenu.vue';
import TitleScreen from './components/menu/TitleScreen.vue';
import WebGPUCanvas from './components/WebGPUCanvas.vue';
import { useAdaptiveQuality } from './composables/useAdaptiveQuality';
import { useAppShortcuts } from './composables/useAppShortcuts';
import { useGameplayLoop } from './composables/useGameplayLoop';
import { useInput } from './composables/useInput';
import { installInputModeDetection, useInputMode } from './composables/useInputMode';
import { useMenuNavigation } from './composables/useMenuNavigation';
import { useNotification } from './composables/useNotification';
import { usePointerLock } from './composables/usePointerLock';
import { usePreviewLoop } from './composables/usePreviewLoop';
import { useRadialMenuController } from './composables/useRadialMenuController';
import { useRendererLifecycle } from './composables/useRendererLifecycle';
import { useSaveActions } from './composables/useSaveActions';
import { useSceneState } from './composables/useSceneState';
import { useTouchControls } from './composables/useTouchControls';
import { useURLState } from './composables/useURLState';
import type { Renderer } from './engine/Renderer';
import { useAppState } from './stores/appState';

const appState = useAppState();

// Core reactive refs owned by the root component so composables can share them.
const canvasRef = ref<HTMLCanvasElement | null>(null);
const rendererRef = shallowRef<Renderer | null>(null);
const savesBrowserRef = ref<InstanceType<typeof SavesBrowser> | null>(null);
const showHelpOverlay = ref(false);

// Start time for renderer `time` uniform. Set to `performance.now()` once the
// renderer is constructed (inside useRendererLifecycle.onCanvasReady).
const startTime = ref(performance.now());
const getTimeSeconds: () => number = () => (performance.now() - startTime.value) / 1000;

// Transient toast notifications (share URL copied, save, screenshot, …).
const { text: toastText, visible: toastVisible, show: notify } = useNotification();

// Scene state: owns the FPSCamera instance + state snapshot helpers.
const scene = useSceneState();
const { cameraPos } = scene;

// URL state: read on boot, restore fractal + camera pose, expose share helpers.
const urlState = useURLState({ scene });
const { previewMode } = urlState;

// Input primitives.
const input = useInput();
const pointerLock = usePointerLock({ canvas: canvasRef });
const touchControls = useTouchControls({ canvas: canvasRef });
installInputModeDetection();
const { isTouchActive, isGamepadActive } = useInputMode();

// Radial menu (press-and-hold cycle). `scene.resetCamera` fires when the
// fractal type changes via this UI so the view snaps to a sensible default.
const radial = useRadialMenuController({ onResetCamera: scene.resetCamera });
const {
  activeId: radialActiveId,
  currentOptions: radialOptions,
  selectedIndex: radialSelectedIndex,
  currentValue: radialCurrentValue,
  cursorX: radialCursorX,
  cursorY: radialCursorY,
} = radial;

// Adaptive resolution scaling tied to live FPS. Assigned below once
// `useRendererLifecycle` has been constructed; the closure handles the
// pre-assignment window via optional chaining.
let applyCanvasResolution: ((scale: number) => void) | undefined;
const adaptiveQuality = useAdaptiveQuality({
  onScaleChange: (scale) => applyCanvasResolution?.(scale),
});

// Gameplay + title-preview render loops.
const { gameLoop, currentIterations, sampleCount } = useGameplayLoop({
  rendererRef,
  scene,
  pointerLock,
  touchControls,
  adaptiveQuality,
  radial,
  input,
  urlState,
  getTimeSeconds,
});
const { fps } = gameLoop;
const { previewLoop } = usePreviewLoop({
  rendererRef,
  scene,
  previewMode,
  getTimeSeconds,
});

// High-level user actions (save / screenshot / load / regenerate thumbnails).
const saveActions = useSaveActions({
  canvasRef,
  rendererRef,
  savesBrowserRef,
  previewLoop,
  scene,
  urlState,
  notify,
});
const { loadSavedState, regenerateThumbnails } = saveActions;

// Renderer creation + resize + mode-transition watchers.
const lifecycle = useRendererLifecycle({
  canvasRef,
  rendererRef,
  startTime,
  scene,
  urlState,
  gameLoop,
  previewLoop,
  adaptiveQuality,
  pointerLock,
  isTouchActive,
});
const { gpuError, onCanvasReady, onResize } = lifecycle;
applyCanvasResolution = lifecycle.applyCanvasResolution;

// Gamepad-driven menu navigation (D-pad / left stick / ✕○ / L1 R1).
useMenuNavigation({ showHelpOverlay });

// Global keyboard + mouse shortcuts and pointer-lock pause behavior.
const { onCanvasClick } = useAppShortcuts({
  pointerLock,
  radial,
  saveActions,
  urlState,
  notify,
  isTouchActive,
  showHelpOverlay,
});
</script>

<template>
  <div :class="{ 'cursor-none': isGamepadActive }" class="h-screen w-screen">
    <GpuErrorScreen v-if="gpuError" :message="gpuError" />

    <template v-else>
      <WebGPUCanvas
        :class="{ 'blur-sm': !previewMode && appState.mode !== 'playing' }"
        @ready="onCanvasReady"
        @resize="onResize"
        @click="onCanvasClick"
      />

      <TitleScreen v-if="!previewMode && appState.mode === 'title'" />
      <FractalSelectScreen v-if="!previewMode && appState.mode === 'select'" />
      <PauseMenu v-if="appState.mode === 'paused'" />
      <SettingsMenu v-if="appState.mode === 'settings'" />
      <SavesBrowser
        v-if="appState.mode === 'saves'"
        ref="savesBrowserRef"
        @load="loadSavedState"
        @regenerate-thumbnails="regenerateThumbnails"
      />
      <GameHud
        v-if="appState.mode === 'playing'"
        :fps="fps"
        :camera="cameraPos"
        :effective-iterations="currentIterations"
        :sample-count="sampleCount"
      />

      <TouchActionButtons
        v-if="isTouchActive && appState.mode === 'playing'"
        :show-help="showHelpOverlay"
        @toggle-help="showHelpOverlay = !showHelpOverlay"
        @pause="appState.pause()"
      />

      <RadialMenu
        v-if="radialActiveId"
        :options="radialOptions"
        :selected-index="radialSelectedIndex"
        :current-value="radialCurrentValue"
        :cursor-x="radialCursorX"
        :cursor-y="radialCursorY"
      />

      <HelpOverlay v-if="showHelpOverlay" @close="showHelpOverlay = false" />

      <ShareToast :visible="toastVisible" :text="toastText" />
    </template>
  </div>
</template>
