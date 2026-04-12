import { chromium } from '@playwright/test';
import { type ChildProcess, execSync, spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const FRACTALS = [
  {
    type: 'mandelbulb',
    power: 8,
    iter: 20,
    bail: 2,
    x: 1.5,
    y: 0.8,
    z: 1.5,
    yaw: -2.35,
    pitch: -0.35,
  },
  {
    type: 'mandelbox',
    power: -1.5,
    iter: 15,
    bail: 100,
    x: 2.0,
    y: 1.0,
    z: 2.0,
    yaw: -2.35,
    pitch: -0.3,
  },
  { type: 'menger', power: 3, iter: 6, bail: 100, x: 1.8, y: 1.2, z: 1.8, yaw: -2.35, pitch: -0.4 },
  {
    type: 'sierpinski',
    power: 0,
    iter: 10,
    bail: 100,
    x: 2.0,
    y: 1.5,
    z: 2.0,
    yaw: -2.35,
    pitch: -0.35,
  },
  {
    type: 'quatjulia',
    power: -1.5,
    iter: 20,
    bail: 4,
    x: 1.5,
    y: 0.8,
    z: 1.5,
    yaw: -2.35,
    pitch: -0.35,
  },
  { type: 'kleinian', power: 0, iter: 12, bail: 100, x: 0, y: 0, z: 4, yaw: -1.57, pitch: 0 },
  {
    type: 'koch3d',
    power: 0,
    iter: 6,
    bail: 100,
    x: 2.0,
    y: 1.5,
    z: 2.0,
    yaw: -2.35,
    pitch: -0.35,
  },
  {
    type: 'apollonian',
    power: 0,
    iter: 8,
    bail: 100,
    x: 2.5,
    y: 2.0,
    z: 2.5,
    yaw: -2.35,
    pitch: -0.4,
  },
  {
    type: 'juliabulb',
    power: 2,
    iter: 16,
    bail: 2,
    x: 1.5,
    y: 0.8,
    z: 1.5,
    yaw: -2.35,
    pitch: -0.35,
  },
  {
    type: 'octahedron',
    power: 0,
    iter: 8,
    bail: 100,
    x: 3.0,
    y: 2.0,
    z: 3.0,
    yaw: -2.35,
    pitch: -0.35,
  },
  {
    type: 'cantordust',
    power: 0,
    iter: 4,
    bail: 100,
    x: 1.8,
    y: 1.2,
    z: 1.8,
    yaw: -2.35,
    pitch: -0.4,
  },
  {
    type: 'burningship',
    power: 8,
    iter: 20,
    bail: 2,
    x: 1.5,
    y: 0.8,
    z: 1.5,
    yaw: -2.35,
    pitch: -0.35,
  },
  {
    type: 'tricorn',
    power: 8,
    iter: 20,
    bail: 2,
    x: 1.5,
    y: 0.8,
    z: 1.5,
    yaw: -2.35,
    pitch: -0.35,
  },
  {
    type: 'cospower2',
    power: 0,
    iter: 20,
    bail: 2,
    x: 1.5,
    y: 0.8,
    z: 1.5,
    yaw: -2.35,
    pitch: -0.35,
  },
  {
    type: 'kaleidobox',
    power: -1.5,
    iter: 15,
    bail: 100,
    x: 2.0,
    y: 1.0,
    z: 2.0,
    yaw: -2.35,
    pitch: -0.3,
  },
  {
    type: 'spudsville',
    power: 4,
    iter: 16,
    bail: 4,
    x: 1.5,
    y: 0.8,
    z: 1.5,
    yaw: -2.35,
    pitch: -0.35,
  },
  {
    type: 'bristorbrot',
    power: 0,
    iter: 20,
    bail: 2,
    x: 1.5,
    y: 0.8,
    z: 1.5,
    yaw: -2.35,
    pitch: -0.35,
  },
  {
    type: 'xenodreambuie',
    power: 8,
    iter: 20,
    bail: 2,
    x: 1.5,
    y: 0.8,
    z: 1.5,
    yaw: -2.35,
    pitch: -0.35,
  },
  { type: 'gyroid', power: 5, iter: 2, bail: 100, x: 0, y: 0, z: 1.5, yaw: -1.57, pitch: 0 },
];

const WIDTH = 640;
const HEIGHT = 360;
const OUTPUT_DIR = resolve(import.meta.dirname, '../public/previews');
const PORT = 4173;

function waitForServer(server: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 15000);
    server.stdout?.on('data', (data: Buffer) => {
      if (data.toString().includes('Local')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.stderr?.on('data', (data: Buffer) => {
      console.error(data.toString());
    });
  });
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Building...');
  execSync('pnpm run build', { stdio: 'inherit', cwd: resolve(import.meta.dirname, '..') });

  console.log('Starting preview server...');
  const server = spawn('pnpm', ['run', 'preview', '--port', String(PORT)], {
    stdio: 'pipe',
    cwd: resolve(import.meta.dirname, '..'),
  });

  try {
    await waitForServer(server);
    console.log('Server ready, launching browser...');

    const browser = await chromium.launch({
      headless: false,
      args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan'],
    });

    for (const fractal of FRACTALS) {
      console.log(`Capturing ${fractal.type}...`);

      const page = await browser.newPage({
        viewport: { width: WIDTH, height: HEIGHT },
      });

      const params = new URLSearchParams({
        f: fractal.type,
        p: String(fractal.power),
        i: String(fractal.iter),
        b: String(fractal.bail),
        c: 'distance',
        x: String(fractal.x),
        y: String(fractal.y),
        z: String(fractal.z),
        yaw: String(fractal.yaw),
        pitch: String(fractal.pitch),
        preview: '1',
      });

      await page.goto(`http://localhost:${PORT}/Fractr/?${params.toString()}`);

      // Wait for WebGPU render
      await page.waitForTimeout(3000);

      const canvas = page.locator('canvas');
      const outPath = resolve(OUTPUT_DIR, `${fractal.type}.png`);
      await canvas.screenshot({ path: outPath, type: 'png' });
      console.log(`  Saved ${outPath}`);

      await page.close();
    }

    await browser.close();
  } finally {
    server.kill();
  }

  console.log('Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
