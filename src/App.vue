<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import GameHud from './components/hud/GameHud.vue';
import FractalSelectScreen from './components/menu/FractalSelectScreen.vue';
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
import { buildShareURL, readStateFromURL } from './utils/urlState';

const appState = useAppState();
const fractal = useFractalParams();
const graphics = useGraphicsSettings();
const controls = useControlSettings();
const hudSettings = useHudSettings();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const gpuError = ref<string | null>(null);
const shareNotification = ref(false);

const camera = new FPSCamera(0, 0, 3);
const cameraPos = ref({ x: 0, y: 0, z: 3, yaw: 0, pitch: 0 });
const currentIterations = ref(0);

// Restore state from URL or default to Mandelbulb
const urlState = readStateFromURL();
let startFromURL = false;
const previewMode = urlState?.preview ?? false;
if (urlState) {
  fractal.fractalType = urlState.fractalType;
  fractal.power = urlState.power;
  fractal.maxIterations = urlState.maxIterations;
  fractal.bailout = urlState.bailout;
  fractal.colorMode = urlState.colorMode;
  camera.position[0] = urlState.x;
  camera.position[1] = urlState.y;
  camera.position[2] = urlState.z;
  camera.yaw = urlState.yaw;
  camera.pitch = urlState.pitch;
  startFromURL = true;
  if (!previewMode) {
    window.history.replaceState({}, '', window.location.pathname);
  }
} else {
  fractal.setFractalType('mandelbulb');
}

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
  ao: 3,
  normal: 4,
  curvature: 5,
  glow: 6,
  stripe: 7,
  fresnel: 8,
  depth: 9,
  triplanar: 10,
  temperature: 11,
  chromatic: 12,
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
    const absDist = Math.abs(dist);
    const speedScale = Math.max(0.001, Math.min(1, absDist));
    const sprint = isPressed('ShiftLeft') || isPressed('ShiftRight') ? 2 : 1;
    const speed = controls.cameraSpeed * speedScale * sprint * dt;

    // Dynamic iterations: more detail when close, fewer when far
    let effectiveIterations = fractal.maxIterations;
    if (graphics.dynamicIterations) {
      const iterScale = Math.max(0, Math.min(1, -Math.log10(Math.max(absDist, 0.0001)) / 4));
      const minIter = Math.max(4, Math.ceil(fractal.maxIterations * 0.3));
      effectiveIterations = Math.ceil(minIter + (fractal.maxIterations - minIter) * iterScale);
    }
    currentIterations.value = effectiveIterations;

    const bindings = controls.keybindings;
    const moving =
      isPressed(bindings.moveForward) ||
      isPressed(bindings.moveBackward) ||
      isPressed(bindings.moveRight) ||
      isPressed(bindings.moveLeft) ||
      isPressed(bindings.moveUp) ||
      isPressed(bindings.moveDown) ||
      isPressed('Mouse0') ||
      isPressed('Mouse2') ||
      Math.abs(dx) > 1 ||
      Math.abs(dy) > 1;

    // Adaptive quality
    adaptQuality(dt, gameLoop.fps.value, moving);

    if (isPressed(bindings.moveForward) || isPressed('Mouse0')) camera.moveForward(speed);
    if (isPressed(bindings.moveBackward) || isPressed('Mouse2')) camera.moveForward(-speed);
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
        maxIterations: effectiveIterations,
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
    // Only auto-orbit on title/select screen (and settings opened from title)
    // In preview mode, camera stays fixed at URL position
    const shouldOrbit =
      !previewMode &&
      (appState.mode === 'title' ||
        appState.mode === 'select' ||
        (appState.mode === 'settings' && appState.settingsSource === 'title'));

    if (shouldOrbit) {
      const t = performance.now() / 5000;
      camera.position[0] = Math.cos(t) * 3;
      camera.position[1] = Math.sin(t * 0.3) * 0.5;
      camera.position[2] = Math.sin(t) * 3;
      camera.yaw = t + Math.PI;
      camera.pitch = -Math.sin(t * 0.3) * 0.15;
    }
    // Paused / settings-from-pause: keep current camera position (frozen frame)

    // Use low quality only on title screen, not in settings or preview mode
    const lowQuality = appState.mode === 'title' && !previewMode;
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
    renderer.setRenderMode(fractal.renderMode);
    startTime = performance.now();

    if (previewMode) {
      // Screenshot mode: render continuously at full quality, no UI
      previewLoop.start();
    } else if (startFromURL) {
      // Jump directly into 3D view from shared URL
      appState.startGame();
    } else {
      previewLoop.start();
    }
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
    graphics.dynamicIterations = true;
  },
);
watch(
  () => fractal.colorMode,
  (mode) => renderer?.setColorMode(mode),
);
watch(
  () => fractal.renderMode,
  (mode) => renderer?.setRenderMode(mode),
);

// Handle game state transitions
watch(
  () => appState.mode,
  (mode, oldMode) => {
    if (mode === 'playing') {
      if (oldMode === 'loading' && !startFromURL) {
        resetCamera();
      }
      startFromURL = false;
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
      if (mode === 'title' || mode === 'select') {
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

// Handle pointer lock loss → pause (unless intentionally unlocked via Ctrl)
let cursorUnlocked = false;

watch(
  () => pointerLock.isLocked.value,
  (locked) => {
    if (!locked && appState.mode === 'playing' && !cursorUnlocked) {
      appState.pause();
    }
  },
);

// Handle keyboard shortcuts
function onKeyDown(e: KeyboardEvent): void {
  // Ctrl to unlock cursor without pausing
  if (
    (e.code === 'ControlLeft' || e.code === 'ControlRight') &&
    appState.mode === 'playing' &&
    pointerLock.isLocked.value
  ) {
    cursorUnlocked = true;
    pointerLock.exitLock();
    return;
  }

  if (e.code === 'Escape') {
    if (appState.mode === 'select') {
      appState.backToTitle();
    } else if (appState.mode === 'paused') {
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
      fractal.cycleColorMode(e.shiftKey);
    }
    if (e.code === controls.keybindings.cycleFractalType) {
      fractal.cycleFractalType(e.shiftKey);
      resetCamera();
    }
    if (e.code === controls.keybindings.toggleDynamicIterations) {
      graphics.dynamicIterations = !graphics.dynamicIterations;
    }
    if (e.code === controls.keybindings.increaseIterations) {
      fractal.adjustIterations(1);
    }
    if (e.code === controls.keybindings.decreaseIterations) {
      fractal.adjustIterations(-1);
    }
    if (e.code === controls.keybindings.cycleRenderMode) {
      fractal.cycleRenderMode(e.shiftKey);
    }
    if (e.code === controls.keybindings.copyShareURL) {
      const url = buildShareURL({
        fractalType: fractal.fractalType,
        power: fractal.power,
        maxIterations: fractal.maxIterations,
        bailout: fractal.bailout,
        colorMode: fractal.colorMode,
        x: camera.position[0]!,
        y: camera.position[1]!,
        z: camera.position[2]!,
        yaw: camera.yaw,
        pitch: camera.pitch,
        preview: false,
      });
      navigator.clipboard.writeText(url);
      shareNotification.value = true;
      setTimeout(() => {
        shareNotification.value = false;
      }, 2000);
    }
  }
}

function onCanvasClick(): void {
  if (appState.mode === 'playing' && !pointerLock.isLocked.value) {
    cursorUnlocked = false;
    pointerLock.requestLock();
  }
}

function onMouseDown(e: MouseEvent): void {
  if (appState.mode !== 'playing') return;
  // Mouse button 5 (browser forward, e.button=4) = toggle dynamic iterations
  if (e.button === 4) {
    e.preventDefault();
    graphics.dynamicIterations = !graphics.dynamicIterations;
  }
}

function onContextMenu(e: MouseEvent): void {
  if (appState.mode === 'playing') {
    e.preventDefault();
  }
}

function onWheel(e: WheelEvent): void {
  if (appState.mode !== 'playing') return;
  e.preventDefault();
  fractal.adjustIterations(e.deltaY < 0 ? 1 : -1);
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('wheel', onWheel, { passive: false });
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('mousedown', onMouseDown);
  window.removeEventListener('contextmenu', onContextMenu);
  window.removeEventListener('wheel', onWheel);
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
        :class="{ 'blur-sm': !previewMode && appState.mode !== 'playing' }"
        @ready="onCanvasReady"
        @resize="onResize"
        @click="onCanvasClick"
      />

      <TitleScreen v-if="!previewMode && appState.mode === 'title'" />
      <FractalSelectScreen v-if="!previewMode && appState.mode === 'select'" />
      <PauseMenu v-if="appState.mode === 'paused'" />
      <SettingsMenu v-if="appState.mode === 'settings'" />
      <GameHud
        v-if="appState.mode === 'playing'"
        :fps="gameLoop.fps.value"
        :camera="cameraPos"
        :effective-iterations="currentIterations"
      />

      <Transition name="fade">
        <div
          v-if="shareNotification"
          class="pointer-events-none fixed bottom-8 left-1/2 z-30 -translate-x-1/2 border border-white/10 bg-surface-dim/90 px-4 py-2 font-mono text-sm text-accent-bright"
        >
          Share URL copied to clipboard
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
