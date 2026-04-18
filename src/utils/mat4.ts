import type { ReadonlyVec3 } from './vec3';
import * as vec3 from './vec3';

export type Mat4 = Float32Array;
export type ReadonlyMat4 = { readonly [index: number]: number; readonly length: number };

export function create(): Mat4 {
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

export function perspective(
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- output buffer, mutated
  out: Mat4,
  fovY: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 {
  const f = 1.0 / Math.tan(fovY / 2);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- out is an output buffer, mutated by design
export function lookAt(out: Mat4, eye: ReadonlyVec3, target: ReadonlyVec3, up: ReadonlyVec3): Mat4 {
  const z = vec3.create();
  vec3.subtract(z, eye, target);
  vec3.normalize(z, z);

  const x = vec3.create();
  vec3.cross(x, up, z);
  vec3.normalize(x, x);

  const y = vec3.create();
  vec3.cross(y, z, x);

  out[0] = x[0]!;
  out[1] = y[0]!;
  out[2] = z[0]!;
  out[3] = 0;
  out[4] = x[1]!;
  out[5] = y[1]!;
  out[6] = z[1]!;
  out[7] = 0;
  out[8] = x[2]!;
  out[9] = y[2]!;
  out[10] = z[2]!;
  out[11] = 0;
  out[12] = -vec3.dot(x, eye);
  out[13] = -vec3.dot(y, eye);
  out[14] = -vec3.dot(z, eye);
  out[15] = 1;
  return out;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- out is an output buffer, mutated by design
export function multiply(out: Mat4, a: ReadonlyMat4, b: ReadonlyMat4): Mat4 {
  for (let i = 0; i < 4; i++) {
    const ai0 = a[i]!;
    const ai1 = a[i + 4]!;
    const ai2 = a[i + 8]!;
    const ai3 = a[i + 12]!;
    out[i] = ai0 * b[0]! + ai1 * b[1]! + ai2 * b[2]! + ai3 * b[3]!;
    out[i + 4] = ai0 * b[4]! + ai1 * b[5]! + ai2 * b[6]! + ai3 * b[7]!;
    out[i + 8] = ai0 * b[8]! + ai1 * b[9]! + ai2 * b[10]! + ai3 * b[11]!;
    out[i + 12] = ai0 * b[12]! + ai1 * b[13]! + ai2 * b[14]! + ai3 * b[15]!;
  }
  return out;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- out is an output buffer, mutated by design
export function invert(out: Mat4, a: ReadonlyMat4): Mat4 | null {
  const a00 = a[0]!;
  const a01 = a[1]!;
  const a02 = a[2]!;
  const a03 = a[3]!;
  const a10 = a[4]!;
  const a11 = a[5]!;
  const a12 = a[6]!;
  const a13 = a[7]!;
  const a20 = a[8]!;
  const a21 = a[9]!;
  const a22 = a[10]!;
  const a23 = a[11]!;
  const a30 = a[12]!;
  const a31 = a[13]!;
  const a32 = a[14]!;
  const a33 = a[15]!;

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  det = 1.0 / det;

  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
