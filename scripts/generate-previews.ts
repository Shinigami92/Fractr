/* oxlint-disable typescript/prefer-readonly-parameter-types -- Node ChildProcess/Buffer and mutable local array literals */
import type { Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { execSync, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdirSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ColorMode } from '../src/engine/colorModes';
import { COLOR_MODES } from '../src/engine/colorModes';
import type { RenderMode } from '../src/engine/renderModes';
import { RENDER_MODES } from '../src/engine/renderModes';
import type { FractalSpec } from './preview-fractals';
import { FRACTALS } from './preview-fractals';

const PRESETS = {
  thumbnail: { width: 960, height: 540, wait: 3000 },
  highres: { width: 1920, height: 1080, wait: 5000 },
};

const PORT = 4173;

interface Options {
  fractals: string[];
  color: ColorMode;
  render: RenderMode;
  preset: keyof typeof PRESETS;
  outDir: string;
}

function isColorMode(value: string): value is ColorMode {
  return (COLOR_MODES as ReadonlyArray<string>).includes(value);
}

function isRenderMode(value: string): value is RenderMode {
  return (RENDER_MODES as ReadonlyArray<string>).includes(value);
}

const HELP_TEXT = `Usage: generate-previews [options] [fractal names...]

Options:
  --color <mode>    Color mode (default: glow)
  --render <mode>   Render mode (default: ray)
  --highres         1920x1080 with longer render wait (default: 960x540)
  --help            Show this help

Examples:
  pnpm run generate-previews
  pnpm run generate-previews mandelbulb menger --color chromatic
  pnpm run generate-previews --highres --color distance --render softshadow
  pnpm run generate-previews mandelbulb --highres

Available fractals: ${FRACTALS.map((f) => f.type).join(', ')}
Available colors: ${COLOR_MODES.join(', ')}
Available renders: ${RENDER_MODES.join(', ')}`;

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const fractals: string[] = [];
  let color: ColorMode = 'glow';
  let render: RenderMode = 'ray';
  let preset: keyof typeof PRESETS = 'thumbnail';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--color' && args[i + 1] != null) {
      const next = args[++i]!;
      if (!isColorMode(next)) {
        console.error(`Unknown color "${next}". Available: ${COLOR_MODES.join(', ')}`);
        process.exit(1);
      }
      color = next;
    } else if (arg === '--render' && args[i + 1] != null) {
      const next = args[++i]!;
      if (!isRenderMode(next)) {
        console.error(`Unknown render mode "${next}". Available: ${RENDER_MODES.join(', ')}`);
        process.exit(1);
      }
      render = next;
    } else if (arg === '--highres') {
      preset = 'highres';
    } else if (arg === '--help') {
      console.log(HELP_TEXT);
      process.exit(0);
    } else if (!arg.startsWith('--')) {
      fractals.push(arg);
    }
  }

  const outDir =
    preset === 'highres'
      ? resolve(import.meta.dirname, '../public/screenshots')
      : resolve(import.meta.dirname, '../public/previews');

  return { fractals, color, render, preset, outDir };
}

function waitForServer(server: ChildProcess): Promise<void> {
  return new Promise((done, fail) => {
    const timeout = setTimeout(() => {
      fail(new Error('Server start timeout'));
    }, 15000);
    server.stdout?.on('data', (data: Buffer) => {
      if (data.toString().includes('Local')) {
        clearTimeout(timeout);
        done();
      }
    });
    server.stderr?.on('data', (data: Buffer) => {
      console.error(data.toString());
    });
  });
}

function buildFractalParams(fractal: FractalSpec, color: string, render: string): URLSearchParams {
  return new URLSearchParams({
    f: fractal.type,
    p: String(fractal.power),
    i: String(fractal.iter),
    b: String(fractal.bail),
    c: color,
    r: render,
    x: String(fractal.x),
    y: String(fractal.y),
    z: String(fractal.z),
    yaw: String(fractal.yaw),
    pitch: String(fractal.pitch),
    roll: String(fractal.roll ?? 0),
    dyn: '0',
    preview: '1',
  });
}

async function captureFractal(
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Playwright Browser has mutating internals
  browser: Browser,
  fractal: FractalSpec,
  color: string,
  render: string,
  outDir: string,
  preset: (typeof PRESETS)[keyof typeof PRESETS],
): Promise<void> {
  const { width, height, wait } = preset;
  const page = await browser.newPage({ viewport: { width, height }, ignoreHTTPSErrors: true });
  const params = buildFractalParams(fractal, color, render);
  await page.goto(`https://localhost:${PORT}/Fractr/?${params.toString()}`);
  await page.waitForTimeout(wait);

  const canvas = page.locator('canvas');
  const pngPath = resolve(outDir, `${fractal.type}.png`);
  const webpPath = resolve(outDir, `${fractal.type}.webp`);
  await canvas.screenshot({ path: pngPath, type: 'png' });
  execSync(`cwebp -q 90 "${pngPath}" -o "${webpPath}"`, { stdio: 'pipe' });
  unlinkSync(pngPath);
  console.log(`  Saved ${webpPath}`);

  await page.close();
}

async function captureAll(
  targets: ReadonlyArray<FractalSpec>,
  opts: Options,
  preset: (typeof PRESETS)[keyof typeof PRESETS],
): Promise<void> {
  const browser = await chromium.launch({
    headless: false,
    args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan'],
  });
  for (const fractal of targets) {
    console.log(`Capturing ${fractal.type}...`);
    // oxlint-disable-next-line no-await-in-loop -- shared browser: pages must be created/closed sequentially and screenshots are serial
    await captureFractal(browser, fractal, opts.color, opts.render, opts.outDir, preset);
  }
  await browser.close();
}

async function main(): Promise<void> {
  const opts = parseArgs();
  const targets =
    opts.fractals.length > 0 ? FRACTALS.filter((f) => opts.fractals.includes(f.type)) : FRACTALS;

  if (targets.length === 0) {
    console.error(`No matching fractals. Available: ${FRACTALS.map((f) => f.type).join(', ')}`);
    process.exit(1);
  }

  const preset = PRESETS[opts.preset];
  mkdirSync(opts.outDir, { recursive: true });

  console.log('Building...');
  execSync('pnpm run build', { stdio: 'inherit', cwd: resolve(import.meta.dirname, '..') });

  console.log(
    `Capturing ${targets.length} fractal(s) at ${preset.width}x${preset.height} with color=${opts.color}, render=${opts.render}...`,
  );
  const server = spawn('pnpm', ['run', 'preview', '--port', String(PORT)], {
    stdio: 'pipe',
    cwd: resolve(import.meta.dirname, '..'),
  });

  try {
    await waitForServer(server);
    console.log('Server ready, launching browser...');
    await captureAll(targets, opts, preset);
  } finally {
    server.kill();
  }

  console.log('Done!');
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
