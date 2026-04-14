<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import GameHud from './components/hud/GameHud.vue';
import HelpOverlay from './components/hud/HelpOverlay.vue';
import RadialMenu from './components/hud/RadialMenu.vue';
import FractalSelectScreen from './components/menu/FractalSelectScreen.vue';
import PauseMenu from './components/menu/PauseMenu.vue';
import SavesBrowser from './components/menu/SavesBrowser.vue';
import SettingsMenu from './components/menu/SettingsMenu.vue';
import TitleScreen from './components/menu/TitleScreen.vue';
import WebGPUCanvas from './components/WebGPUCanvas.vue';
import { useGameLoop } from './composables/useGameLoop';
import { useInput } from './composables/useInput';
import { useInputMode } from './composables/useInputMode';
import { usePointerLock } from './composables/usePointerLock';
import { useTouchControls } from './composables/useTouchControls';
import { FPSCamera } from './engine/camera/FPSCamera';
import { evaluateSDF } from './engine/fractals/sdf';
import { WebGPUContext } from './engine/gpu/WebGPUContext';
import { Renderer } from './engine/Renderer';
import { type SaveEntry, type SavedState, saveState, saveThumbnail } from './services/savesDB';
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
const savesBrowserRef = ref<InstanceType<typeof SavesBrowser> | null>(null);
const shareNotification = ref(false);
const notificationText = ref('');

function showNotification(text: string, duration = 2000): void {
  notificationText.value = text;
  shareNotification.value = true;
  setTimeout(() => {
    shareNotification.value = false;
  }, duration);
}

// Radial menu state
type RadialMenuType = 'color' | 'render' | 'fractal' | null;
const radialMenuType = ref<RadialMenuType>(null);
const showHelpOverlay = ref(false);
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

const radialCurrentValue = computed(() => {
  switch (radialMenuType.value) {
    case 'color':
      return fractal.colorMode;
    case 'render':
      return fractal.renderMode;
    case 'fractal':
      return fractal.fractalType;
    default:
      return '';
  }
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
const cameraPos = ref({ x: 0, y: 0, z: 3, yaw: 0, pitch: 0, roll: 0 });
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
  graphics.dynamicIterations = urlState.dynamicIterations;
  camera.position[0] = urlState.x;
  camera.position[1] = urlState.y;
  camera.position[2] = urlState.z;
  camera.setFromEuler(urlState.yaw, urlState.pitch, urlState.roll);
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
  camera.roll = 0;
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
    dynamicIterations: graphics.dynamicIterations,
    x: camera.position[0]!,
    y: camera.position[1]!,
    z: camera.position[2]!,
    yaw: camera.yaw,
    pitch: camera.pitch,
    roll: camera.roll,
    preview: false,
  });
  const params = url.split('?')[1] ?? '';
  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}

function getCurrentState(): SavedState {
  return {
    fractalType: fractal.fractalType,
    power: fractal.power,
    maxIterations: fractal.maxIterations,
    bailout: fractal.bailout,
    colorMode: fractal.colorMode,
    renderMode: fractal.renderMode,
    dynamicIterations: graphics.dynamicIterations,
    x: camera.position[0]!,
    y: camera.position[1]!,
    z: camera.position[2]!,
    yaw: camera.yaw,
    pitch: camera.pitch,
    roll: camera.roll,
  };
}

async function quickSave(): Promise<void> {
  const state = getCurrentState();
  // Capture thumbnail from current canvas
  const canvas = canvasRef.value;
  let thumbnail: Blob | undefined;
  if (canvas) {
    thumbnail = await new Promise<Blob | undefined>((resolve) => {
      canvas.toBlob((blob) => resolve(blob ?? undefined), 'image/webp', 0.7);
    });
  }
  const saved = await saveState(state, thumbnail);
  if (saved) {
    showNotification('Location saved');
  } else {
    showNotification('Already saved');
  }
}

async function takeScreenshot(): Promise<void> {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
  if (!blob) return;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showNotification('Screenshot copied to clipboard');
  } catch {
    // Fallback: download the file
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fractr-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Screenshot saved as file');
  }
}

function loadSavedState(state: SavedState): void {
  fractal.fractalType = state.fractalType;
  fractal.power = state.power;
  fractal.maxIterations = state.maxIterations;
  fractal.bailout = state.bailout;
  fractal.colorMode = state.colorMode;
  fractal.renderMode = state.renderMode;
  graphics.dynamicIterations = state.dynamicIterations;
  camera.position[0] = state.x;
  camera.position[1] = state.y;
  camera.position[2] = state.z;
  camera.setFromEuler(state.yaw, state.pitch, state.roll);
  renderer?.setFractalType(state.fractalType);
  renderer?.setColorMode(state.colorMode);
  renderer?.setRenderMode(state.renderMode);
  renderer?.resetAccumulation();
  startFromURL = true; // prevent camera reset on loading → playing transition
  appState.startGame();
}

async function regenerateThumbnails(saves: SaveEntry[]): Promise<void> {
  if (!renderer) return;
  const canvas = canvasRef.value;
  if (!canvas) return;

  // Stop preview loop so it doesn't overwrite our renders
  previewLoop.stop();

  // Save current state to restore after
  const prevState = getCurrentState();

  for (const save of saves) {
    const s = save.state;
    // Temporarily set renderer state
    renderer.setFractalType(s.fractalType);
    renderer.setColorMode(s.colorMode);
    renderer.setRenderMode(s.renderMode);
    camera.position[0] = s.x;
    camera.position[1] = s.y;
    camera.position[2] = s.z;
    camera.setFromEuler(s.yaw, s.pitch, s.roll);

    const saveCfg = FRACTAL_CONFIGS[s.fractalType];
    const saveStepFactor = saveCfg.stepFactor ?? 1;
    let saveOriginOffset: [number, number, number] | undefined;
    const savePeriodFn = saveCfg.periodOffset;
    if (savePeriodFn) {
      const period = savePeriodFn(s.power);
      saveOriginOffset = [
        Math.round(s.x / period) * period,
        Math.round(s.y / period) * period,
        Math.round(s.z / period) * period,
      ];
    }
    renderer.updateUniforms(
      camera,
      {
        power: s.power,
        maxIterations: s.maxIterations,
        bailout: s.bailout,
        colorMode: COLOR_MODE_MAP[s.colorMode],
        maxRaySteps: graphics.maxRaySteps,
        resolutionScale: 1,
        animatedColors: false,
        stepFactor: saveStepFactor,
        originOffset: saveOriginOffset,
      },
      0,
    );
    renderer.resetAccumulation();

    // Time-based rendering: keep rendering until enough time has passed
    const renderTimeMs = Math.max(300, s.maxIterations * 30);
    const params = {
      power: s.power,
      maxIterations: s.maxIterations,
      bailout: s.bailout,
      colorMode: COLOR_MODE_MAP[s.colorMode],
      maxRaySteps: graphics.maxRaySteps,
      resolutionScale: 1,
      animatedColors: false,
      stepFactor: saveStepFactor,
      originOffset: saveOriginOffset,
    };

    const startMs = performance.now();
    while (performance.now() - startMs < renderTimeMs) {
      renderer.updateUniforms(camera, params, 0);
      renderer.render(false);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    // Extra settle for GPU flush
    await new Promise((resolve) => setTimeout(resolve, 300));

    const blob = await new Promise<Blob | undefined>((resolve) => {
      canvas.toBlob((b) => resolve(b ?? undefined), 'image/webp', 0.7);
    });

    if (blob) {
      await saveThumbnail(save.stateHash, blob);
      // Show thumbnail immediately in the browser
      savesBrowserRef.value?.setThumbnail(save.stateHash, blob);
    }

    // Delay between captures
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Restore previous state
  renderer.setFractalType(prevState.fractalType);
  renderer.setColorMode(prevState.colorMode);
  renderer.setRenderMode(prevState.renderMode);
  camera.position[0] = prevState.x;
  camera.position[1] = prevState.y;
  camera.position[2] = prevState.z;
  camera.setFromEuler(prevState.yaw, prevState.pitch, prevState.roll);
  renderer.resetAccumulation();

  // Restart preview loop and refresh thumbnails in the browser
  previewLoop.start();
  savesBrowserRef.value?.refreshThumbnails();
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

// For periodic SDFs (declared via FractalConfig.periodOffset), snap the camera
// position to a multiple of the SDF's period so the GPU sees small coordinates
// with full f32 precision. Subtraction is done here in JS f64, so no
// cancellation loss.
function computeOriginOffset(): [number, number, number] | undefined {
  const periodFn = fractal.config.periodOffset;
  if (!periodFn) return undefined;
  const period = periodFn(fractal.power);
  return [
    Math.round(camera.position[0]! / period) * period,
    Math.round(camera.position[1]! / period) * period,
    Math.round(camera.position[2]! / period) * period,
  ];
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
const { isTouchActive, mount: mountInputMode, unmount: unmountInputMode } = useInputMode();
const touchControls = useTouchControls();

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

    // Camera rotation from mouse + touch (disabled while radial menu is open)
    const { dx, dy } = pointerLock.consumeMovement();
    const touchLook = touchControls.consumeLookDelta();
    const totalDx = dx + touchLook.dx;
    const totalDy = dy + touchLook.dy;
    if (!radialMenuType.value) {
      camera.rotate(totalDx * controls.mouseSensitivity, -totalDy * controls.mouseSensitivity);
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
    const speedScale = Math.max(1e-6, Math.min(1, absDist));
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
    const rollSpeed = 1.5 * dt;
    const touchMove = touchControls.getMovementVector();
    const touchActive =
      Math.abs(touchMove.x) > 0.05 ||
      Math.abs(touchMove.y) > 0.05 ||
      Math.abs(touchLook.dx) > 1 ||
      Math.abs(touchLook.dy) > 1;
    const moving =
      isPressed(bindings.moveForward) ||
      isPressed(bindings.moveBackward) ||
      isPressed(bindings.moveRight) ||
      isPressed(bindings.moveLeft) ||
      isPressed(bindings.rollLeft) ||
      isPressed(bindings.rollRight) ||
      isPressed('Mouse0') ||
      isPressed('Mouse2') ||
      Math.abs(dx) > 1 ||
      Math.abs(dy) > 1 ||
      touchActive;

    // Adaptive quality
    adaptQuality(dt, gameLoop.fps.value, moving);

    if (isPressed(bindings.moveForward) || isPressed('Mouse0')) camera.moveForward(speed);
    if (isPressed(bindings.moveBackward) || isPressed('Mouse2')) camera.moveForward(-speed);
    if (isPressed(bindings.moveRight)) camera.moveRight(speed);
    if (isPressed(bindings.moveLeft)) camera.moveRight(-speed);
    const shifting = isPressed('ShiftLeft') || isPressed('ShiftRight');
    if (isPressed(bindings.rollLeft)) {
      if (shifting) {
        camera.moveUp(-speed);
      } else {
        camera.rollCamera(-rollSpeed);
      }
    }
    if (isPressed(bindings.rollRight)) {
      if (shifting) {
        camera.moveUp(speed);
      } else {
        camera.rollCamera(rollSpeed);
      }
    }

    // Touch analog movement (additive to keyboard)
    if (Math.abs(touchMove.x) > 0.05 || Math.abs(touchMove.y) > 0.05) {
      camera.moveForward(-touchMove.y * speed);
      camera.moveRight(touchMove.x * speed);
    }

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
      roll: camera.roll,
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
        animatedColors: graphics.animatedColors,
        stepFactor: fractal.config.stepFactor ?? 1,
        originOffset: computeOriginOffset(),
      },
      (performance.now() - startTime) / 1000,
    );
  },
  render() {
    renderer?.render(!isMovingThisFrame && !graphics.animatedColors);
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
        animatedColors: graphics.animatedColors,
        stepFactor: fractal.config.stepFactor ?? 1,
        originOffset: computeOriginOffset(),
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
  mountInputMode();
  touchControls.mount(canvas);

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
    if (!startFromURL) {
      resetCamera();
      graphics.dynamicIterations = fractal.config.defaultDynamicIterations !== false;
    }
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
      if (!isTouchActive.value) {
        pointerLock.requestLock();
      }
    } else if (mode === 'loading') {
      appState.onLoaded();
    } else {
      gameLoop.stop();
      if (mode === 'title' || mode === 'select') {
        applyCanvasResolution(PREVIEW_SCALE);
        previewLoop.start();
        window.history.replaceState({}, '', window.location.pathname);
      } else if (mode === 'paused' || mode === 'settings' || mode === 'saves') {
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
    if (
      !locked &&
      appState.mode === 'playing' &&
      !cursorUnlocked &&
      !showHelpOverlay.value &&
      !isTouchActive.value
    ) {
      appState.pause();
    }
  },
);

// Handle keyboard shortcuts
function onKeyDown(e: KeyboardEvent): void {
  // F1 toggles the help overlay during gameplay (closing also allowed if open)
  if (e.code === 'F1') {
    e.preventDefault();
    if (appState.mode === 'playing' || showHelpOverlay.value) {
      showHelpOverlay.value = !showHelpOverlay.value;
    }
    return;
  }

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
    if (showHelpOverlay.value) {
      showHelpOverlay.value = false;
      return;
    }
    if (appState.mode === 'select') {
      appState.backToTitle();
    } else if (appState.mode === 'paused') {
      appState.resume();
    } else if (appState.mode === 'settings') {
      appState.closeSettings();
    } else if (appState.mode === 'saves') {
      appState.closeSaves();
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
    if (e.code === controls.keybindings.increaseBailout) {
      fractal.adjustBailout(1);
    }
    if (e.code === controls.keybindings.decreaseBailout) {
      fractal.adjustBailout(-1);
    }
    if (e.code === controls.keybindings.toggleAnimatedColors) {
      graphics.animatedColors = !graphics.animatedColors;
    }
    if (e.code === controls.keybindings.quickSave) {
      e.preventDefault();
      quickSave();
    }
    if (e.code === controls.keybindings.screenshot) {
      e.preventDefault();
      takeScreenshot();
    }
    if (e.code === controls.keybindings.openSaves) {
      cursorUnlocked = true;
      pointerLock.exitLock();
      appState.openSaves();
    }
    if (e.code === controls.keybindings.copyShareURL) {
      const url = buildShareURL({
        fractalType: fractal.fractalType,
        power: fractal.power,
        maxIterations: fractal.maxIterations,
        bailout: fractal.bailout,
        colorMode: fractal.colorMode,
        dynamicIterations: graphics.dynamicIterations,
        x: camera.position[0]!,
        y: camera.position[1]!,
        z: camera.position[2]!,
        yaw: camera.yaw,
        pitch: camera.pitch,
        roll: camera.roll,
        preview: false,
      });
      navigator.clipboard.writeText(url);
      showNotification('Share URL copied to clipboard');
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
  if (appState.mode === 'playing' && !pointerLock.isLocked.value && !isTouchActive.value) {
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
  unmountInputMode();
  touchControls.unmount();
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
      <SavesBrowser
        v-if="appState.mode === 'saves'"
        ref="savesBrowserRef"
        @load="loadSavedState"
        @regenerate-thumbnails="regenerateThumbnails"
      />
      <GameHud
        v-if="appState.mode === 'playing'"
        :fps="gameLoop.fps.value"
        :camera="cameraPos"
        :effective-iterations="currentIterations"
        :sample-count="sampleCount"
      />

      <!-- Touch-only action buttons: rendered outside GameHud's pointer-events-none
           container so mobile touch hit-testing isn't blocked by the parent. -->
      <div
        v-if="isTouchActive && appState.mode === 'playing'"
        class="fixed top-3 right-3 z-20 flex gap-2"
      >
        <button
          class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-sm transition-colors active:bg-white/20"
          @touchstart.stop.prevent="showHelpOverlay = !showHelpOverlay"
          @click.stop="showHelpOverlay = !showHelpOverlay"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <text x="9" y="14" text-anchor="middle" font-size="14" font-weight="bold">?</text>
          </svg>
        </button>
        <button
          class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-sm transition-colors active:bg-white/20"
          @touchstart.stop.prevent="appState.pause()"
          @click.stop="appState.pause()"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <rect x="3" y="2" width="4" height="14" rx="1" />
            <rect x="11" y="2" width="4" height="14" rx="1" />
          </svg>
        </button>
      </div>

      <RadialMenu
        v-if="radialMenuType"
        :options="radialMenuOptions"
        :selected-index="radialSelectedIndex"
        :current-value="radialCurrentValue"
        :cursor-x="radialCursorX"
        :cursor-y="radialCursorY"
      />

      <HelpOverlay v-if="showHelpOverlay" @close="showHelpOverlay = false" />

      <Transition name="fade">
        <div
          v-if="shareNotification"
          class="pointer-events-none fixed bottom-8 left-1/2 z-30 -translate-x-1/2 border border-white/10 bg-surface-dim/90 px-4 py-2 font-mono text-sm text-accent-bright"
        >
          {{ notificationText }}
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
