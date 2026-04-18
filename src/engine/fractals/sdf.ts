import type { FractalType } from '../../stores/fractalParams';

interface SDFParams {
  readonly power: number;
  readonly maxIterations: number;
  readonly bailout: number;
}

function mandelbulbSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  let dr = 1;
  let r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  const { power, maxIterations, bailout } = params;

  for (let i = 0; i < maxIterations; i++) {
    if (r > bailout) break;

    const theta = Math.acos(zz / r);
    const phi = Math.atan2(zy, zx);
    const rp = r ** power;
    dr = r ** (power - 1) * power * dr + 1;

    const newTheta = theta * power;
    const newPhi = phi * power;
    zx = rp * Math.sin(newTheta) * Math.cos(newPhi) + x;
    zy = rp * Math.sin(newTheta) * Math.sin(newPhi) + y;
    zz = rp * Math.cos(newTheta) + z;

    r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  }

  return (0.5 * Math.log(r) * r) / dr;
}

function mandelboxSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  let dr = 1;
  const { power: scale, maxIterations, bailout } = params;
  const FOLD = 1;
  const MIN_R2 = 0.25;
  const FIXED_R2 = 1;

  for (let i = 0; i < maxIterations; i++) {
    if (Math.sqrt(zx * zx + zy * zy + zz * zz) > bailout) break;

    // Box fold
    zx = Math.max(-FOLD, Math.min(FOLD, zx)) * 2 - zx;
    zy = Math.max(-FOLD, Math.min(FOLD, zy)) * 2 - zy;
    zz = Math.max(-FOLD, Math.min(FOLD, zz)) * 2 - zz;

    // Sphere fold
    const r2 = zx * zx + zy * zy + zz * zz;
    let factor = 1;
    if (r2 < MIN_R2) {
      factor = FIXED_R2 / MIN_R2;
    } else if (r2 < FIXED_R2) {
      factor = FIXED_R2 / r2;
    }
    zx *= factor;
    zy *= factor;
    zz *= factor;
    dr = dr * factor;

    // Scale and translate
    zx = zx * scale + x;
    zy = zy * scale + y;
    zz = zz * scale + z;
    dr = dr * Math.abs(scale) + 1;
  }

  return Math.sqrt(zx * zx + zy * zy + zz * zz) / Math.abs(dr);
}

function mengerSDF(x: number, y: number, z: number, params: SDFParams): number {
  let d = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) - 1;
  let s = 1;

  for (let i = 0; i < params.maxIterations; i++) {
    // GLSL-style mod
    const ax = ((((x * s) % 2) + 2) % 2) - 1;
    const ay = ((((y * s) % 2) + 2) % 2) - 1;
    const az = ((((z * s) % 2) + 2) % 2) - 1;
    s *= 3;

    const rx = Math.abs(1 - 3 * Math.abs(ax));
    const ry = Math.abs(1 - 3 * Math.abs(ay));
    const rz = Math.abs(1 - 3 * Math.abs(az));

    const da = Math.max(rx, ry);
    const db = Math.max(ry, rz);
    const dc = Math.max(rz, rx);
    const c = (Math.min(da, db, dc) - 1) / s;

    d = Math.max(d, c);
  }

  return d;
}

function sierpinskiSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  const a = [
    [1, 1, 1],
    [-1, -1, 1],
    [1, -1, -1],
    [-1, 1, -1],
  ] as const;
  const scale = 2;

  for (let i = 0; i < params.maxIterations; i++) {
    let ci = 0;
    let d = (zx - a[0][0]) ** 2 + (zy - a[0][1]) ** 2 + (zz - a[0][2]) ** 2;
    for (let j = 1; j < 4; j++) {
      const dj = (zx - a[j]![0]) ** 2 + (zy - a[j]![1]) ** 2 + (zz - a[j]![2]) ** 2;
      if (dj < d) {
        ci = j;
        d = dj;
      }
    }
    zx = zx * scale - a[ci]![0] * (scale - 1);
    zy = zy * scale - a[ci]![1] * (scale - 1);
    zz = zz * scale - a[ci]![2] * (scale - 1);
  }

  return (Math.sqrt(zx * zx + zy * zy + zz * zz) - 1.5) * scale ** -params.maxIterations;
}

function quatjuliaSDF(x: number, y: number, z: number, params: SDFParams): number {
  const c = [params.power * -0.2, 0.6, 0.2, -0.4];
  let qx = x;
  let qy = y;
  let qz = z;
  let qw = 0;
  let dqx = 1;
  let dqy = 0;
  let dqz = 0;
  let dqw = 0;
  let r = Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw);

  for (let i = 0; i < params.maxIterations; i++) {
    if (r > params.bailout) break;
    const ndx = 2 * (qx * dqx - qy * dqy - qz * dqz - qw * dqw);
    const ndy = 2 * (qx * dqy + qy * dqx + qz * dqw - qw * dqz);
    const ndz = 2 * (qx * dqz - qy * dqw + qz * dqx + qw * dqy);
    const ndw = 2 * (qx * dqw + qy * dqz - qz * dqy + qw * dqx);
    dqx = ndx;
    dqy = ndy;
    dqz = ndz;
    dqw = ndw;
    const nqx = qx * qx - qy * qy - qz * qz - qw * qw + c[0]!;
    const nqy = 2 * qx * qy + c[1]!;
    const nqz = 2 * qx * qz + c[2]!;
    const nqw = 2 * qx * qw + c[3]!;
    qx = nqx;
    qy = nqy;
    qz = nqz;
    qw = nqw;
    r = Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw);
  }

  const dr = Math.sqrt(dqx * dqx + dqy * dqy + dqz * dqz + dqw * dqw);
  return (0.5 * r * Math.log(r)) / dr;
}

function kleinianSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  let dr = 1;
  const box = [1, 1, 0.5];
  // Track minimum |DE| across iterations for safe camera-speed estimation.
  // Detecting walls requires deeper iterations (macro-shape fold is too loose),
  // but past a certain `dr` the DE degrades into chaotic noise. Bail out when
  // `dr` suggests precision has collapsed — before that, tighter iteration
  // values win; after, trust the last known good estimate.
  const iter = Math.min(16, params.maxIterations);
  let minAbsDist = Infinity;
  let bestSigned = 0;

  for (let i = 0; i < iter; i++) {
    zx = Math.max(-box[0]!, Math.min(box[0]!, zx)) * 2 - zx;
    zy = Math.max(-box[1]!, Math.min(box[1]!, zy)) * 2 - zy;
    zz = Math.max(-box[2]!, Math.min(box[2]!, zz)) * 2 - zz;
    const r2 = zx * zx + zy * zy + zz * zz;
    const k = Math.max(1.2 / r2, 1);
    zx *= k;
    zy *= k;
    zz *= k;
    dr *= k;
    zx += 0.2;
    zy += 0.3;
    zz += -0.4;
    const d = (Math.sqrt(zx * zx + zy * zy + zz * zz) - 0.5) / dr;
    const ad = Math.abs(d);
    if (ad < minAbsDist) {
      minAbsDist = ad;
      bestSigned = d;
    }
    if (dr > 1e6) break;
  }

  return bestSigned;
}

function koch3dSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  const scale = 3;
  let r = 1;

  for (let i = 0; i < params.maxIterations; i++) {
    zx = Math.abs(zx);
    zy = Math.abs(zy);
    zz = Math.abs(zz);
    if (zx + zy < 0) {
      const t = zx;
      zx = -zy;
      zy = -t;
    }
    if (zx + zz < 0) {
      const t = zx;
      zx = -zz;
      zz = -t;
    }
    if (zy + zz < 0) {
      const t = zy;
      zy = -zz;
      zz = -t;
    }
    zx = zx * scale - (scale - 1);
    zy = zy * scale - (scale - 1);
    zz = zz * scale - (scale - 1);
    r *= scale;
  }

  return (Math.sqrt(zx * zx + zy * zy + zz * zz) - 1.5) / r;
}

function apollonianSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x;
  let zy = y;
  let zz = z;
  let scale = 1;

  for (let i = 0; i < params.maxIterations; i++) {
    zx = Math.abs(zx);
    zy = Math.abs(zy);
    zz = Math.abs(zz);
    if (zx < zy) {
      const t = zx;
      zx = zy;
      zy = t;
    }
    if (zx < zz) {
      const t = zx;
      zx = zz;
      zz = t;
    }
    if (zy < zz) {
      const t = zy;
      zy = zz;
      zz = t;
    }
    zx -= 1;
    zy -= 1;
    zz -= 1;
    const r2 = zx * zx + zy * zy + zz * zz;
    const invR = Math.max(0.5 / r2, 1);
    zx *= invR;
    zy *= invR;
    zz *= invR;
    scale *= invR;
    zx += 1;
    zy += 1;
    zz += 1;
  }

  return (Math.sqrt(zx * zx + zy * zy + zz * zz) - 1) / scale;
}

function juliabulbSDF(x: number, y: number, z: number, params: SDFParams): number {
  const julia = [params.power * 0.1, -0.5, 0.3];
  let zx = x;
  let zy = y;
  let zz = z;
  let dr = 1;
  let r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  const power = 8;

  for (let i = 0; i < params.maxIterations; i++) {
    if (r > params.bailout) break;
    const theta = Math.acos(zz / r);
    const phi = Math.atan2(zy, zx);
    const rp = r ** power;
    dr = r ** (power - 1) * power * dr + 1;
    const nt = theta * power;
    const np = phi * power;
    zx = rp * Math.sin(nt) * Math.cos(np) + julia[0]!;
    zy = rp * Math.sin(nt) * Math.sin(np) + julia[1]!;
    zz = rp * Math.cos(nt) + julia[2]!;
    r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  }

  return (0.5 * Math.log(r) * r) / dr;
}

function octahedronSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x,
    zy = y,
    zz = z;
  const scale = 2;
  let r = 1;
  for (let i = 0; i < params.maxIterations; i++) {
    zx = Math.abs(zx);
    zy = Math.abs(zy);
    zz = Math.abs(zz);
    if (zx < zy) {
      const t = zx;
      zx = zy;
      zy = t;
    }
    if (zx < zz) {
      const t = zx;
      zx = zz;
      zz = t;
    }
    if (zy < zz) {
      const t = zy;
      zy = zz;
      zz = t;
    }
    zx = zx * scale - (scale - 1);
    zy = zy * scale - (scale - 1);
    zz = zz * scale - (scale - 1);
    if (zz < -1) zz = -2 - zz;
    const r2 = zx * zx + zy * zy + zz * zz;
    if (r2 < 0.5) {
      zx *= 2;
      zy *= 2;
      zz *= 2;
      r *= 2;
    }
    r *= scale;
  }
  const a = Math.abs(zx / r) + Math.abs(zy / r) + Math.abs(zz / r);
  return (a - 1) * 0.577;
}

function glslMod(v: number, m: number): number {
  return v - m * Math.floor(v / m);
}

function cantordustSDF(x: number, y: number, z: number, params: SDFParams): number {
  let d = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) - 1;
  let s = 1;
  for (let i = 0; i < params.maxIterations; i++) {
    const ax = glslMod(x * s, 2) - 1;
    const ay = glslMod(y * s, 2) - 1;
    const az = glslMod(z * s, 2) - 1;
    s *= 3;
    const rx = Math.abs(ax);
    const ry = Math.abs(ay);
    const rz = Math.abs(az);
    const crossX = Math.max(1 - ry * 3, 1 - rz * 3);
    const crossY = Math.max(1 - rx * 3, 1 - rz * 3);
    const crossZ = Math.max(1 - rx * 3, 1 - ry * 3);
    d = Math.max(d, Math.max(crossX, crossY, crossZ) / s);
  }
  return d;
}

function burningshipSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x,
    zy = y,
    zz = z,
    dr = 1;
  let r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  const { power, maxIterations, bailout } = params;
  for (let i = 0; i < maxIterations; i++) {
    if (r > bailout) break;
    zx = Math.abs(zx);
    zy = Math.abs(zy);
    zz = Math.abs(zz);
    const theta = Math.acos(zz / r),
      phi = Math.atan2(zy, zx);
    const rp = r ** power;
    dr = r ** (power - 1) * power * dr + 1;
    zx = rp * Math.sin(theta * power) * Math.cos(phi * power) + x;
    zy = rp * Math.sin(theta * power) * Math.sin(phi * power) + y;
    zz = rp * Math.cos(theta * power) + z;
    r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  }
  return (0.5 * Math.log(r) * r) / dr;
}

function tricornSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x,
    zy = y,
    zz = z,
    dr = 1;
  let r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  const { power, maxIterations, bailout } = params;
  for (let i = 0; i < maxIterations; i++) {
    if (r > bailout) break;
    const theta = Math.acos(zz / r),
      phi = -Math.atan2(zy, zx);
    const rp = r ** power;
    dr = r ** (power - 1) * power * dr + 1;
    zx = rp * Math.sin(theta * power) * Math.cos(phi * power) + x;
    zy = rp * Math.sin(theta * power) * Math.sin(phi * power) + y;
    zz = rp * Math.cos(theta * power) + z;
    r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  }
  return (0.5 * Math.log(r) * r) / dr;
}

function cospower2SDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x,
    zy = y,
    zz = z,
    dr = 1;
  let r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  for (let i = 0; i < params.maxIterations; i++) {
    if (r > params.bailout) break;
    const theta = Math.acos(Math.max(-1, Math.min(1, zz / r)));
    const phi = Math.atan2(zy, zx);
    const rp = r * r;
    dr = 2 * r * dr + 1;
    const nt = theta * 2;
    const np = phi * 2;
    zx = rp * Math.sin(nt) * Math.cos(np) + x;
    zy = rp * Math.sin(nt) * Math.sin(np) + y;
    zz = rp * Math.cos(nt) + z;
    r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  }
  return (0.5 * Math.log(r) * r) / dr;
}

function kaleidoboxSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x,
    zy = y,
    zz = z,
    dr = 1;
  const { power: scale, maxIterations, bailout } = params;
  for (let i = 0; i < maxIterations; i++) {
    if (Math.sqrt(zx * zx + zy * zy + zz * zz) > bailout) break;
    if (zx + zy < 0) {
      const t = zx;
      zx = -zy;
      zy = -t;
    }
    if (zx + zz < 0) {
      const t = zx;
      zx = -zz;
      zz = -t;
    }
    if (zy + zz < 0) {
      const t = zy;
      zy = -zz;
      zz = -t;
    }
    zx = Math.max(-1, Math.min(1, zx)) * 2 - zx;
    zy = Math.max(-1, Math.min(1, zy)) * 2 - zy;
    zz = Math.max(-1, Math.min(1, zz)) * 2 - zz;
    const r2 = zx * zx + zy * zy + zz * zz;
    const k = Math.max(1 / Math.max(r2, 0.25), 1);
    zx *= k;
    zy *= k;
    zz *= k;
    dr *= k;
    zx = zx * scale + x;
    zy = zy * scale + y;
    zz = zz * scale + z;
    dr = dr * Math.abs(scale) + 1;
  }
  return Math.sqrt(zx * zx + zy * zy + zz * zz) / Math.abs(dr);
}

function spudsvilleSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x,
    zy = y,
    zz = z,
    dr = 1;
  let r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  const { power, maxIterations, bailout } = params;
  for (let i = 0; i < maxIterations; i++) {
    if (r > bailout) break;
    if (i % 2 === 0) {
      const theta = Math.acos(zz / r),
        phi = Math.atan2(zy, zx);
      const rp = r ** power;
      dr = r ** (power - 1) * power * dr + 1;
      zx = rp * Math.sin(theta * power) * Math.cos(phi * power) + x;
      zy = rp * Math.sin(theta * power) * Math.sin(phi * power) + y;
      zz = rp * Math.cos(theta * power) + z;
    } else {
      zx = Math.max(-1, Math.min(1, zx)) * 2 - zx;
      zy = Math.max(-1, Math.min(1, zy)) * 2 - zy;
      zz = Math.max(-1, Math.min(1, zz)) * 2 - zz;
      const r2 = zx * zx + zy * zy + zz * zz;
      const k = Math.max(1 / Math.max(r2, 0.25), 1);
      zx *= k;
      zy *= k;
      zz *= k;
      dr *= k;
      zx = zx * 2 + x;
      zy = zy * 2 + y;
      zz = zz * 2 + z;
      dr = dr * 2 + 1;
    }
    r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  }
  return (0.5 * Math.log(r) * r) / dr;
}

function bristorbrotSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x,
    zy = y,
    zz = z,
    dr = 1;
  let r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  for (let i = 0; i < params.maxIterations; i++) {
    if (r > params.bailout) break;
    dr = 2 * r * dr + 1;
    const nx = zx * zx - zy * zy - zz * zz;
    const ny = 2 * zx * zy;
    const nz = 2 * zx * zz;
    zx = nx + x;
    zy = ny + y;
    zz = nz + z;
    r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  }
  return (0.5 * Math.log(r) * r) / dr;
}

function xenodreambuieSDF(x: number, y: number, z: number, params: SDFParams): number {
  let zx = x,
    zy = y,
    zz = z,
    dr = 1;
  let r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  const { power, maxIterations, bailout } = params;
  for (let i = 0; i < maxIterations; i++) {
    if (r > bailout) break;
    const rp = r ** power;
    dr = r ** (power - 1) * power * dr + 1;
    const theta = Math.atan2(zy, zx) * power;
    const phi = Math.asin(zz / r) * power;
    zx = rp * Math.cos(phi) * Math.cos(theta) + x;
    zy = rp * Math.cos(phi) * Math.sin(theta) + y;
    zz = rp * Math.sin(phi) + z;
    r = Math.sqrt(zx * zx + zy * zy + zz * zz);
  }
  return (0.5 * Math.log(r) * r) / dr;
}

function gyroidSDF(x: number, y: number, z: number, params: SDFParams): number {
  const scale = params.power;
  const px = x * scale,
    py = y * scale,
    pz = z * scale;
  let g = Math.sin(px) * Math.cos(py) + Math.sin(py) * Math.cos(pz) + Math.sin(pz) * Math.cos(px);
  let amp = 0.5,
    freq = 2;
  for (let i = 0; i < params.maxIterations; i++) {
    const qx = px * freq,
      qy = py * freq,
      qz = pz * freq;
    g +=
      (Math.sin(qx) * Math.cos(qy) + Math.sin(qy) * Math.cos(qz) + Math.sin(qz) * Math.cos(qx)) *
      amp;
    amp *= 0.5;
    freq *= 2;
  }
  return (Math.abs(g) - 0.3) / scale;
}

const SDF_FUNCTIONS: Record<
  FractalType,
  (x: number, y: number, z: number, params: SDFParams) => number
> = {
  mandelbulb: mandelbulbSDF,
  mandelbox: mandelboxSDF,
  menger: mengerSDF,
  sierpinski: sierpinskiSDF,
  quatjulia: quatjuliaSDF,
  kleinian: kleinianSDF,
  koch3d: koch3dSDF,
  apollonian: apollonianSDF,
  juliabulb: juliabulbSDF,
  octahedron: octahedronSDF,
  cantordust: cantordustSDF,
  burningship: burningshipSDF,
  tricorn: tricornSDF,
  cospower2: cospower2SDF,
  kaleidobox: kaleidoboxSDF,
  spudsville: spudsvilleSDF,
  bristorbrot: bristorbrotSDF,
  xenodreambuie: xenodreambuieSDF,
  gyroid: gyroidSDF,
};

export function evaluateSDF(
  fractalType: FractalType,
  x: number,
  y: number,
  z: number,
  params: SDFParams,
): number {
  return SDF_FUNCTIONS[fractalType](x, y, z, params);
}
