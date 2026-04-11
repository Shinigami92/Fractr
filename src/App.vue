<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import GameHud from './components/hud/GameHud.vue';
import PauseMenu from './components/menu/PauseMenu.vue';
import SettingsMenu from './components/menu/SettingsMenu.vue';
import TitleScreen from './components/menu/TitleScreen.vue';
import WebGPUCanvas from './components/WebGPUCanvas.vue';
import { useGameLoop } from './composables/useGameLoop';
import { useInput } from './composables/useInput';
import { usePointerLock } from './composables/usePointerLock';
import { FPSCamera } from './engine/camera/FPSCamera';
import { evaluateSDF } from './engine/fractals/sdf';
import { WebGPUContext } from './engine/gpu/WebGPUContext';
import { Renderer } from './engine/Renderer';
import { useAppState } from './stores/appState';
import { useControlSettings } from './stores/controlSettings';
import { type ColorMode, useFractalParams } from './stores/fractalParams';
import { useGraphicsSettings } from './stores/graphicsSettings';
import { useHudSettings } from './stores/hudSettings';

const appState = useAppState();
const fractal = useFractalParams();
const graphics = useGraphicsSettings();
const controls = useControlSettings();
const hudSettings = useHudSettings();

// Always start with Mandelbulb on page load
fractal.setFractalType('mandelbulb');

const canvasRef = ref<HTMLCanvasElement | null>(null);
const gpuError = ref<string | null>(null);

const camera = new FPSCamera(0, 0, 3);
const cameraPos = ref({ x: 0, y: 0, z: 3, yaw: 0, pitch: 0 });

function resetCamera(): void {
  camera.position[0] = 0;
  camera.position[1] = 0;
  camera.position[2] = 3;
  camera.yaw = -Math.PI / 2;
  camera.pitch = 0;
}

let renderer: Renderer | null = null;
let startTime = 0;
let displayWidth = 1;
let displayHeight = 1;

const PREVIEW_SCALE = 0.25;

function applyCanvasResolution(scale: number): void {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const w = Math.floor(displayWidth * scale);
  const h = Math.floor(displayHeight * scale);
  canvas.width = w;
  canvas.height = h;
  renderer?.resize(w, h);
}

const COLOR_MODE_MAP: Record<ColorMode, number> = {
  distance: 0,
  orbit_trap: 1,
  iteration: 2,
};

const { isPressed } = useInput();
const pointerLock = usePointerLock(canvasRef);

let adaptiveScale = 1.0;
let appliedScale = 1.0;
let adaptTimer = 0;
let isMoving = false;
const SCALE_STEP = 0.05;
const DROP_INTERVAL = 0.2; // React fast when FPS drops
const RISE_INTERVAL = 0.8; // Recover slowly to avoid oscillation

function adaptQuality(dt: number, currentFps: number, moving: boolean): void {
  if (!graphics.adaptiveQuality) return;

  isMoving = moving;
  adaptTimer += dt;

  const target = graphics.targetFps;
  const belowTarget = currentFps < target * 0.85;
  const interval = belowTarget ? DROP_INTERVAL : RISE_INTERVAL;

  if (adaptTimer < interval) return;
  adaptTimer = 0;

  // Movement penalty: reduce target scale while moving for smoother experience
  const movementPenalty = isMoving ? 0.1 : 0;
  const maxScale = 1.0 - movementPenalty;

  if (belowTarget && adaptiveScale > 0.3) {
    // Drop faster when far below target
    const urgency = currentFps < target * 0.5 ? 3 : 1;
    adaptiveScale = Math.max(0.3, adaptiveScale - SCALE_STEP * urgency);
  } else if (currentFps > target * 0.95 && adaptiveScale < maxScale) {
    adaptiveScale = Math.min(maxScale, adaptiveScale + SCALE_STEP);
  }

  // Only resize when quantized scale actually changed
  const quantized = Math.round(adaptiveScale / SCALE_STEP) * SCALE_STEP;
  if (Math.abs(quantized - appliedScale) >= SCALE_STEP) {
    appliedScale = quantized;
    applyCanvasResolution(quantized);
  }
}

const gameLoop = useGameLoop({
  update(dt) {
    if (appState.mode !== 'playing') return;

    // Camera rotation from mouse
    const { dx, dy } = pointerLock.consumeMovement();
    camera.rotate(dx * controls.mouseSensitivity, -dy * controls.mouseSensitivity);

    // Distance-based camera speed: slow near surfaces, fast in open space
    const dist = evaluateSDF(
      fractal.fractalType,
      camera.position[0]!,
      camera.position[1]!,
      camera.position[2]!,
      { power: fractal.power, maxIterations: fractal.maxIterations, bailout: fractal.bailout },
    );
    const speedScale = Math.max(0.001, Math.min(1, Math.abs(dist)));
    const speed = controls.cameraSpeed * speedScale * dt;

    const bindings = controls.keybindings;
    const moving =
      isPressed(bindings.moveForward) ||
      isPressed(bindings.moveBackward) ||
      isPressed(bindings.moveRight) ||
      isPressed(bindings.moveLeft) ||
      isPressed(bindings.moveUp) ||
      isPressed(bindings.moveDown) ||
      Math.abs(dx) > 1 ||
      Math.abs(dy) > 1;

    // Adaptive quality
    adaptQuality(dt, gameLoop.fps.value, moving);

    if (isPressed(bindings.moveForward)) camera.moveForward(speed);
    if (isPressed(bindings.moveBackward)) camera.moveForward(-speed);
    if (isPressed(bindings.moveRight)) camera.moveRight(speed);
    if (isPressed(bindings.moveLeft)) camera.moveRight(-speed);
    if (isPressed(bindings.moveUp)) camera.moveUp(speed);
    if (isPressed(bindings.moveDown)) camera.moveUp(-speed);

    // Update reactive camera position for HUD
    cameraPos.value = {
      x: camera.position[0]!,
      y: camera.position[1]!,
      z: camera.position[2]!,
      yaw: camera.yaw,
      pitch: camera.pitch,
    };

    // Update renderer uniforms
    renderer?.updateUniforms(
      camera,
      {
        power: fractal.power,
        maxIterations: fractal.maxIterations,
        bailout: fractal.bailout,
        colorMode: COLOR_MODE_MAP[fractal.colorMode],
        maxRaySteps: graphics.maxRaySteps,
        resolutionScale: graphics.resolutionScale,
      },
      (performance.now() - startTime) / 1000,
    );
  },
  render() {
    renderer?.render();
  },
});

// Handle title screen preview rendering
const previewLoop = useGameLoop({
  update() {
    // Only auto-orbit on title screen (and settings opened from title)
    const shouldOrbit =
      appState.mode === 'title' ||
      (appState.mode === 'settings' && appState.settingsSource === 'title');

    if (shouldOrbit) {
      const t = performance.now() / 5000;
      camera.position[0] = Math.cos(t) * 3;
      camera.position[1] = Math.sin(t * 0.3) * 0.5;
      camera.position[2] = Math.sin(t) * 3;
      camera.yaw = t + Math.PI;
      camera.pitch = -Math.sin(t * 0.3) * 0.15;
    }
    // Paused / settings-from-pause: keep current camera position (frozen frame)

    // Use low quality only on title screen, not in settings (so changes are visible)
    const lowQuality = appState.mode === 'title';
    renderer?.updateUniforms(
      camera,
      {
        power: fractal.power,
        maxIterations: lowQuality ? 8 : fractal.maxIterations,
        bailout: fractal.bailout,
        colorMode: COLOR_MODE_MAP[fractal.colorMode],
        maxRaySteps: lowQuality ? 64 : graphics.maxRaySteps,
        resolutionScale: graphics.resolutionScale,
      },
      (performance.now() - startTime) / 1000,
    );
  },
  render() {
    renderer?.render();
  },
});

async function onCanvasReady(canvas: HTMLCanvasElement): Promise<void> {
  canvasRef.value = canvas;
  pointerLock.mount();

  try {
    const ctx = await WebGPUContext.create(canvas);
    renderer = new Renderer(ctx);
    renderer.resize(canvas.width, canvas.height);
    renderer.setFractalType(fractal.fractalType);
    renderer.setColorMode(fractal.colorMode);
    startTime = performance.now();

    // Start with preview rendering for title screen
    previewLoop.start();
  } catch (e) {
    gpuError.value = e instanceof Error ? e.message : 'Unknown WebGPU error';
  }
}

function onResize(width: number, height: number): void {
  displayWidth = width;
  displayHeight = height;
  const scale = appState.mode === 'playing' ? 1 : PREVIEW_SCALE;
  applyCanvasResolution(scale);
}

// Watch for fractal/color mode changes
watch(
  () => fractal.fractalType,
  (type) => {
    renderer?.setFractalType(type);
    resetCamera();
  },
);
watch(
  () => fractal.colorMode,
  (mode) => renderer?.setColorMode(mode),
);

// Handle game state transitions
watch(
  () => appState.mode,
  (mode, oldMode) => {
    if (mode === 'playing') {
      if (oldMode === 'loading') {
        resetCamera();
      }
      adaptiveScale = 1.0;
      appliedScale = 1.0;
      adaptTimer = 0;
      applyCanvasResolution(1);
      previewLoop.stop();
      gameLoop.start();
      pointerLock.requestLock();
    } else if (mode === 'loading') {
      appState.onLoaded();
    } else {
      gameLoop.stop();
      if (mode === 'title') {
        applyCanvasResolution(PREVIEW_SCALE);
        previewLoop.start();
      } else if (mode === 'paused' || mode === 'settings') {
        // Keep current resolution when pausing from gameplay
        const fromGame = oldMode === 'playing' || oldMode === 'paused';
        if (!fromGame) {
          applyCanvasResolution(PREVIEW_SCALE);
        }
        previewLoop.start();
      }
    }
  },
);

// Handle pointer lock loss → pause
watch(
  () => pointerLock.isLocked.value,
  (locked) => {
    if (!locked && appState.mode === 'playing') {
      appState.pause();
    }
  },
);

// Handle keyboard shortcuts
function onKeyDown(e: KeyboardEvent): void {
  if (e.code === 'Escape') {
    if (appState.mode === 'paused') {
      appState.resume();
    } else if (appState.mode === 'settings') {
      appState.closeSettings();
    }
    // 'playing' → pointer lock exit triggers pause via watcher above
  }

  if (appState.mode === 'playing') {
    if (e.code === controls.keybindings.toggleHud) {
      hudSettings.toggleHud();
    }
    if (e.code === controls.keybindings.toggleCrosshair) {
      hudSettings.toggleCrosshair();
    }
    if (e.code === controls.keybindings.cycleColorMode) {
      fractal.cycleColorMode();
    }
    if (e.code === controls.keybindings.cycleFractalType) {
      fractal.cycleFractalType();
      resetCamera();
    }
  }
}

function onCanvasClick(): void {
  if (appState.mode === 'playing' && !pointerLock.isLocked.value) {
    pointerLock.requestLock();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  gameLoop.stop();
  previewLoop.stop();
  pointerLock.unmount();
  renderer?.destroy();
});
</script>

<template>
  <div class="h-screen w-screen">
    <div v-if="gpuError" class="flex h-full items-center justify-center">
      <div class="flex flex-col items-center gap-4 text-center">
        <p class="text-xl text-red-400">WebGPU Not Available</p>
        <p class="text-sm text-white/50">{{ gpuError }}</p>
      </div>
    </div>

    <template v-else>
      <WebGPUCanvas
        :class="{ 'blur-sm': appState.mode !== 'playing' }"
        @ready="onCanvasReady"
        @resize="onResize"
        @click="onCanvasClick"
      />

      <TitleScreen v-if="appState.mode === 'title'" />
      <PauseMenu v-if="appState.mode === 'paused'" />
      <SettingsMenu v-if="appState.mode === 'settings'" />
      <GameHud v-if="appState.mode === 'playing'" :fps="gameLoop.fps.value" :camera="cameraPos" />
    </template>
  </div>
</template>
