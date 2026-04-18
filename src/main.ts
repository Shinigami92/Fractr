import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { initKeyboardLayout } from './input/keyboardLayout';
import { piniaPersistPlugin } from './plugins/piniaPersist';
// oxlint-disable-next-line import/no-unassigned-import -- side-effect import: loads global Tailwind/CSS resets.
import './style.css';

declare const __COMMIT_SHA__: string;
console.log(`Fractr ${__COMMIT_SHA__}`);

// The WebGPU device cannot survive a partial HMR swap: the renderer
// composable's onUnmounted tears down the device, but the canvas DOM element
// is reused so onCanvasReady never re-fires — leaving a dead renderer (black
// canvas, 0 FPS, zero HUD stats). Force a full reload on JS updates. CSS
// updates still HMR normally.
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', (payload) => {
    if (payload.updates.some((u) => u.type === 'js-update')) {
      window.location.reload();
    }
  });
}

const pinia = createPinia();
pinia.use(piniaPersistPlugin);

void initKeyboardLayout();

const app = createApp(App);
app.use(pinia);
app.mount('#app');
