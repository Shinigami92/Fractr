import { ref } from 'vue';

// Intentionally hand-rolled rather than VueUse `useRafFn`: this loop schedules
// the next frame BEFORE running update/render (see comment in `loop`), whereas
// `useRafFn` schedules after. For a heavy ray-marcher running below 60fps, the
// difference in vsync lead time is measurable.
export function useGameLoop(callbacks: { update: (dt: number) => void; render: () => void }) {
  const fps = ref(0);
  const isRunning = ref(false);

  let rafId = 0;
  let lastTime = 0;
  let fpsAccumulator = 0;
  let frameCount = 0;

  function loop(now: number): void {
    if (!isRunning.value) return;

    // Schedule next frame FIRST — gives the browser maximum lead time to
    // hit the next vsync, reducing frame-pacing jitter at sub-60fps.
    rafId = requestAnimationFrame(loop);

    const dt = Math.min((now - lastTime) / 1000, 0.1); // Cap at 100ms
    lastTime = now;

    // FPS calculation
    fpsAccumulator += dt;
    frameCount++;
    if (fpsAccumulator >= 0.5) {
      fps.value = Math.round(frameCount / fpsAccumulator);
      fpsAccumulator = 0;
      frameCount = 0;
    }

    callbacks.update(dt);
    callbacks.render();
  }

  function start(): void {
    if (isRunning.value) return;
    isRunning.value = true;
    lastTime = performance.now();
    fpsAccumulator = 0;
    frameCount = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stop(): void {
    isRunning.value = false;
    cancelAnimationFrame(rafId);
  }

  return { fps, isRunning, start, stop };
}
