<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import GameHud from './components/hud/GameHud.vue';
import RadialMenu from './components/hud/RadialMenu.vue';
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
import {
  COLOR_MODE_OPTIONS,
  type ColorMode,
  FRACTAL_CONFIGS,
  type FractalType,
  RENDER_MODE_OPTIONS,
  type RenderMode,
  useFractalParams,
} from './stores/fractalParams';
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

// Radial menu state
type RadialMenuType = 'color' | 'render' | 'fractal' | null;
const radialMenuType = ref<RadialMenuType>(null);
const radialCursorX = ref(0);
const radialCursorY = ref(0);
let radialHoldTimer: ReturnType<typeof setTimeout> | null = null;
let radialKeyCode: string | null = null;
const HOLD_DELAY = 200;

const fractalOptions = computed(() =>
  Object.entries(FRACTAL_CONFIGS).map(([key, cfg]) => ({
    value: key,
    label: cfg.label,
    short: cfg.short,
  })),
);

const radialMenuOptions = computed(() => {
  switch (radialMenuType.value) {
    case 'color':
      return COLOR_MODE_OPTIONS;
    case 'render':
      return RENDER_MODE_OPTIONS;
    case 'fractal':
      return fractalOptions.value;
    default:
      return [];
  }
});

const radialSelectedIndex = computed(() => {
  const cx = radialCursorX.value;
  const cy = radialCursorY.value;
  const dist = Math.sqrt(cx * cx + cy * cy);
  if (dist < 15 || !radialMenuType.value) return -1;

  const count = radialMenuOptions.value.length;
  const TAU = Math.PI * 2;
  let angle = Math.atan2(cy, cx) + Math.PI / 2; // offset so 0 = top
  if (angle < 0) angle += TAU;
  // Add half-sector offset so boundaries fall between tiles, not at them
  const halfStep = TAU / count / 2;
  return Math.floor((((angle + halfStep) % TAU) / TAU) * count) % count;
});

function openRadialMenu(type: RadialMenuType): void {
  radialMenuType.value = type;
  radialCursorX.value = 0;
  radialCursorY.value = 0;
}

function closeRadialMenu(apply: boolean, shiftKey: boolean): void {
  if (apply && radialMenuType.value && radialSelectedIndex.value >= 0) {
    const selected = radialMenuOptions.value[radialSelectedIndex.value]!;
    switch (radialMenuType.value) {
      case 'color':
        fractal.colorMode = selected.value as ColorMode;
        break;
      case 'render':
        fractal.renderMode = selected.value as RenderMode;
        break;
      case 'fractal':
        fractal.setFractalType(selected.value as FractalType);
        resetCamera();
        break;
    }
  } else if (!apply && radialMenuType.value === null) {
    // Quick tap — no menu was shown, cycle
    if (radialKeyCode === controls.keybindings.cycleColorMode) {
      fractal.cycleColorMode(shiftKey);
    } else if (radialKeyCode === controls.keybindings.cycleFractalType) {
      fractal.cycleFractalType(shiftKey);
      resetCamera();
    } else if (radialKeyCode === controls.keybindings.cycleRenderMode) {
      fractal.cycleRenderMode(shiftKey);
    }
  }
  radialMenuType.value = null;
  radialKeyCode = null;
  if (radialHoldTimer) {
    clearTimeout(radialHoldTimer);
    radialHoldTimer = null;
  }
}

const camera = new FPSCamera(0, 0, 3);
const cameraPos = ref({ x: 0, y: 0, z: 3, yaw: 0, pitch: 0 });
const currentIterations = ref(0);
const sampleCount = ref(0);

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
} else {
  fractal.setFractalType('mandelbulb');
}

function resetCamera(): void {
  const cam = fractal.config.camera;
  camera.position[0] = cam?.x ?? 0;
  camera.position[1] = cam?.y ?? 0;
  camera.position[2] = cam?.z ?? 3;
  camera.yaw = cam?.yaw ?? -Math.PI / 2;
  camera.pitch = cam?.pitch ?? 0;
}

let wasMoving = false;

function syncURLState(): void {
  if (appState.mode !== 'playing') return;
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
  const params = url.split('?')[1] ?? '';
  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
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

let isMovingThisFrame = false;
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

    // Camera rotation from mouse (disabled while radial menu is open)
    const { dx, dy } = pointerLock.consumeMovement();
    if (!radialMenuType.value) {
      camera.rotate(dx * controls.mouseSensitivity, -dy * controls.mouseSensitivity);
    }

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

    // Track movement for render path selection
    isMovingThisFrame = moving;
    if (moving) {
      renderer?.resetAccumulation();
    } else if (wasMoving) {
      syncURLState();
    }
    wasMoving = moving;

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
    renderer?.render(!isMovingThisFrame);
    sampleCount.value = renderer?.sampleCount ?? 0;
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
  (mode) => {
    renderer?.setColorMode(mode);
    renderer?.resetAccumulation();
    syncURLState();
  },
);
watch(
  () => fractal.renderMode,
  (mode) => {
    renderer?.setRenderMode(mode);
    renderer?.resetAccumulation();
    syncURLState();
  },
);
watch([() => fractal.power, () => fractal.maxIterations, () => fractal.bailout], () => {
  renderer?.resetAccumulation();
  syncURLState();
});

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
        window.history.replaceState({}, '', window.location.pathname);
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

  if (appState.mode === 'playing' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (e.code === controls.keybindings.toggleHud) {
      hudSettings.toggleHud();
    }
    if (e.code === controls.keybindings.toggleCrosshair) {
      hudSettings.toggleCrosshair();
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

    // Radial menu hold detection for cycle keys
    const radialMap: Record<string, RadialMenuType> = {
      [controls.keybindings.cycleColorMode]: 'color',
      [controls.keybindings.cycleRenderMode]: 'render',
      [controls.keybindings.cycleFractalType]: 'fractal',
    };
    const menuType = radialMap[e.code];
    if (menuType && !e.repeat && !radialHoldTimer && !radialMenuType.value) {
      radialKeyCode = e.code;
      radialHoldTimer = setTimeout(() => {
        radialHoldTimer = null;
        openRadialMenu(menuType);
      }, HOLD_DELAY);
    }
  }
}

function onCanvasClick(): void {
  if (appState.mode === 'playing' && !pointerLock.isLocked.value) {
    cursorUnlocked = false;
    pointerLock.requestLock();
  }
}

// Key up: close radial menu (apply selection) or quick-tap cycle
function onKeyUp(e: KeyboardEvent): void {
  if (appState.mode !== 'playing' || e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.code === radialKeyCode) {
    const menuWasOpen = radialMenuType.value !== null;
    closeRadialMenu(menuWasOpen, e.shiftKey);
  }
}

// Track mouse movement for radial menu while it's open
function onRadialMouseMove(e: MouseEvent): void {
  if (radialMenuType.value) {
    radialCursorX.value += e.movementX;
    radialCursorY.value += e.movementY;
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
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onRadialMouseMove);
  window.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('wheel', onWheel, { passive: false });
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('mousedown', onMouseDown);
  window.removeEventListener('mousemove', onRadialMouseMove);
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
        :sample-count="sampleCount"
      />

      <RadialMenu
        v-if="radialMenuType"
        :options="radialMenuOptions"
        :selected-index="radialSelectedIndex"
        :cursor-x="radialCursorX"
        :cursor-y="radialCursorY"
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
