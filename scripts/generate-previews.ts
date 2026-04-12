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
  { type: 'spudsville', power: 4, iter: 16, bail: 50, x: 0, y: 0, z: 2.1, yaw: -1.57, pitch: 0 },
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

const PRESETS = {
  thumbnail: { width: 960, height: 540, wait: 3000 },
  highres: { width: 1920, height: 1080, wait: 5000 },
};

const PORT = 4173;

interface Options {
  fractals: string[];
  color: string;
  preset: keyof typeof PRESETS;
  outDir: string;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const fractals: string[] = [];
  let color = 'glow';
  let preset: keyof typeof PRESETS = 'thumbnail';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--color' && args[i + 1]) {
      color = args[++i]!;
    } else if (arg === '--highres') {
      preset = 'highres';
    } else if (arg === '--help') {
      console.log(`Usage: generate-previews [options] [fractal names...]

Options:
  --color <mode>   Color mode (default: glow)
  --highres        1920x1080 with longer render wait (default: 960x540)
  --help           Show this help

Examples:
  pnpm run generate-previews
  pnpm run generate-previews mandelbulb menger --color chromatic
  pnpm run generate-previews --highres --color distance
  pnpm run generate-previews mandelbulb --highres

Available fractals: ${FRACTALS.map((f) => f.type).join(', ')}
Available colors: glow, distance, orbit_trap, iteration, ao, normal, curvature, stripe, fresnel, depth, triplanar, temperature, chromatic`);
      process.exit(0);
    } else if (!arg.startsWith('--')) {
      fractals.push(arg);
    }
  }

  const outDir =
    preset === 'highres'
      ? resolve(import.meta.dirname, '../public/screenshots')
      : resolve(import.meta.dirname, '../public/previews');

  return { fractals, color, preset, outDir };
}

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
  const opts = parseArgs();
  const targets =
    opts.fractals.length > 0 ? FRACTALS.filter((f) => opts.fractals.includes(f.type)) : FRACTALS;

  if (targets.length === 0) {
    console.error(`No matching fractals. Available: ${FRACTALS.map((f) => f.type).join(', ')}`);
    process.exit(1);
  }

  const { width, height, wait } = PRESETS[opts.preset];
  mkdirSync(opts.outDir, { recursive: true });

  console.log('Building...');
  execSync('pnpm run build', { stdio: 'inherit', cwd: resolve(import.meta.dirname, '..') });

  console.log(
    `Capturing ${targets.length} fractal(s) at ${width}x${height} with color=${opts.color}...`,
  );
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
        viewport: { width, height },
      });

      const params = new URLSearchParams({
        f: fractal.type,
        p: String(fractal.power),
        i: String(fractal.iter),
        b: String(fractal.bail),
        c: opts.color,
        x: String(fractal.x),
        y: String(fractal.y),
        z: String(fractal.z),
        yaw: String(fractal.yaw),
        pitch: String(fractal.pitch),
        preview: '1',
      });

      await page.goto(`http://localhost:${PORT}/Fractr/?${params.toString()}`);
      await page.waitForTimeout(wait);

      const canvas = page.locator('canvas');
      const pngPath = resolve(opts.outDir, `${fractal.type}.png`);
      const webpPath = resolve(opts.outDir, `${fractal.type}.webp`);
      await canvas.screenshot({ path: pngPath, type: 'png' });
      execSync(`cwebp -q 90 "${pngPath}" -o "${webpPath}"`, { stdio: 'pipe' });
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
