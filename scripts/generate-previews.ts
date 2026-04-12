import { chromium } from '@playwright/test';
import { type ChildProcess, execSync, spawn } from 'node:child_process';
import { mkdirSync, unlinkSync } from 'node:fs';
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
    x: 4.0,
    y: 2.5,
    z: 4.0,
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
  { type: 'kleinian', power: 0, iter: 6, bail: 100, x: 2, y: 1, z: 3, yaw: -2.0, pitch: -0.2 },
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
    x: 4.0,
    y: 2.5,
    z: 4.0,
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

const WIDTH = 960;
const HEIGHT = 540;
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
  // Filter fractals by CLI args: `pnpm run generate-previews mandelbulb menger`
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? FRACTALS.filter((f) => args.includes(f.type)) : FRACTALS;

  if (targets.length === 0) {
    console.error(`No matching fractals. Available: ${FRACTALS.map((f) => f.type).join(', ')}`);
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Building...');
  execSync('pnpm run build', { stdio: 'inherit', cwd: resolve(import.meta.dirname, '..') });

  console.log(`Starting preview server... (${targets.length} fractal(s) to capture)`);
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

    for (const fractal of targets) {
      console.log(`Capturing ${fractal.type}...`);

      const page = await browser.newPage({
        viewport: { width: WIDTH, height: HEIGHT },
      });

      const params = new URLSearchParams({
        f: fractal.type,
        p: String(fractal.power),
        i: String(fractal.iter),
        b: String(fractal.bail),
        c: 'glow',
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
      const pngPath = resolve(OUTPUT_DIR, `${fractal.type}.png`);
      const webpPath = resolve(OUTPUT_DIR, `${fractal.type}.webp`);
      await canvas.screenshot({ path: pngPath, type: 'png' });
      execSync(`cwebp -q 85 "${pngPath}" -o "${webpPath}"`, { stdio: 'pipe' });
      unlinkSync(pngPath);
      console.log(`  Saved ${webpPath}`);

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
