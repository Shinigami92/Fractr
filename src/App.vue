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

const canvasRef = ref<HTMLCanvasElement | null>(null);
const gpuError = ref<string | null>(null);

const camera = new FPSCamera(0, 0, 3);
let renderer: Renderer | null = null;
let startTime = 0;

const COLOR_MODE_MAP: Record<ColorMode, number> = {
  distance: 0,
  orbit_trap: 1,
  iteration: 2,
};

const { isPressed } = useInput();
const pointerLock = usePointerLock(canvasRef);

const gameLoop = useGameLoop({
  update(dt) {
    if (appState.mode !== 'playing') return;

    // Camera rotation from mouse
    const { dx, dy } = pointerLock.consumeMovement();
    camera.rotate(dx * controls.mouseSensitivity, -dy * controls.mouseSensitivity);

    // Camera movement from keyboard
    const speed = controls.cameraSpeed * dt;
    const bindings = controls.keybindings;
    if (isPressed(bindings.moveForward)) camera.moveForward(speed);
    if (isPressed(bindings.moveBackward)) camera.moveForward(-speed);
    if (isPressed(bindings.moveRight)) camera.moveRight(speed);
    if (isPressed(bindings.moveLeft)) camera.moveRight(-speed);
    if (isPressed(bindings.moveUp)) camera.moveUp(speed);
    if (isPressed(bindings.moveDown)) camera.moveUp(-speed);

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
    if (appState.mode !== 'title' && appState.mode !== 'settings' && appState.mode !== 'paused')
      return;

    // Slowly orbit camera for background effect
    const t = performance.now() / 5000;
    camera.position[0] = Math.cos(t) * 3;
    camera.position[1] = Math.sin(t * 0.3) * 0.5;
    camera.position[2] = Math.sin(t) * 3;
    camera.yaw = t + Math.PI;
    camera.pitch = -Math.sin(t * 0.3) * 0.15;

    renderer?.updateUniforms(
      camera,
      {
        power: fractal.power,
        maxIterations: 8,
        bailout: fractal.bailout,
        colorMode: COLOR_MODE_MAP[fractal.colorMode],
        maxRaySteps: 64,
        resolutionScale: 0.25,
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
    startTime = performance.now();

    // Start with preview rendering for title screen
    previewLoop.start();
  } catch (e) {
    gpuError.value = e instanceof Error ? e.message : 'Unknown WebGPU error';
  }
}

function onResize(width: number, height: number): void {
  renderer?.resize(width, height);
}

// Watch for fractal/color mode changes
watch(
  () => fractal.fractalType,
  (type) => renderer?.setFractalType(type),
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
      // Reset camera to a good starting position when starting from title
      if (oldMode === 'loading') {
        camera.position[0] = 0;
        camera.position[1] = 0;
        camera.position[2] = 3;
        camera.yaw = -Math.PI / 2;
        camera.pitch = 0;
      }
      previewLoop.stop();
      gameLoop.start();
      pointerLock.requestLock();
    } else if (mode === 'loading') {
      appState.onLoaded();
    } else {
      gameLoop.stop();
      if (mode === 'title' || mode === 'paused' || mode === 'settings') {
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
        :class="{ 'blur-sm': appState.mode === 'title' }"
        @ready="onCanvasReady"
        @resize="onResize"
      />

      <TitleScreen v-if="appState.mode === 'title'" />
      <PauseMenu v-if="appState.mode === 'paused'" />
      <SettingsMenu v-if="appState.mode === 'settings'" />
      <GameHud
        v-if="appState.mode === 'playing'"
        :fps="gameLoop.fps.value"
        :camera-x="camera.position[0]!"
        :camera-y="camera.position[1]!"
        :camera-z="camera.position[2]!"
      />
    </template>
  </div>
</template>
