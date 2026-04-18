export type Vec3 = Float32Array;
export type ReadonlyVec3 = { readonly [index: number]: number; readonly length: number };

export function create(x = 0, y = 0, z = 0): Vec3 {
  const out = new Float32Array(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- out is an output buffer, mutated by design
export function add(out: Vec3, a: ReadonlyVec3, b: ReadonlyVec3): Vec3 {
  out[0] = a[0]! + b[0]!;
  out[1] = a[1]! + b[1]!;
  out[2] = a[2]! + b[2]!;
  return out;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- out is an output buffer, mutated by design
export function subtract(out: Vec3, a: ReadonlyVec3, b: ReadonlyVec3): Vec3 {
  out[0] = a[0]! - b[0]!;
  out[1] = a[1]! - b[1]!;
  out[2] = a[2]! - b[2]!;
  return out;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- out is an output buffer, mutated by design
export function scale(out: Vec3, a: ReadonlyVec3, s: number): Vec3 {
  out[0] = a[0]! * s;
  out[1] = a[1]! * s;
  out[2] = a[2]! * s;
  return out;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- out is an output buffer, mutated by design
export function cross(out: Vec3, a: ReadonlyVec3, b: ReadonlyVec3): Vec3 {
  const ax = a[0]!;
  const ay = a[1]!;
  const az = a[2]!;
  const bx = b[0]!;
  const by = b[1]!;
  const bz = b[2]!;
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- out is an output buffer, mutated by design
export function normalize(out: Vec3, a: ReadonlyVec3): Vec3 {
  const len = Math.sqrt(a[0]! * a[0]! + a[1]! * a[1]! + a[2]! * a[2]!);
  if (len > 0) {
    const invLen = 1 / len;
    out[0] = a[0]! * invLen;
    out[1] = a[1]! * invLen;
    out[2] = a[2]! * invLen;
  }
  return out;
}

export function dot(a: ReadonlyVec3, b: ReadonlyVec3): number {
  return a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- out is an output buffer, mutated by design
export function scaleAndAdd(out: Vec3, a: ReadonlyVec3, b: ReadonlyVec3, s: number): Vec3 {
  out[0] = a[0]! + b[0]! * s;
  out[1] = a[1]! + b[1]! * s;
  out[2] = a[2]! + b[2]! * s;
  return out;
}
