import { apollonianSDF } from './apollonian';
import { bristorbrotSDF } from './bristorbrot';
import { burningshipSDF } from './burningship';
import { cantordustSDF } from './cantordust';
import type { FractalType } from './configs';
import { cospower2SDF } from './cospower2';
import { gyroidSDF } from './gyroid';
import { juliabulbSDF } from './juliabulb';
import { kaleidoboxSDF } from './kaleidobox';
import { kleinianSDF } from './kleinian';
import { koch3dSDF } from './koch3d';
import { mandelboxSDF } from './mandelbox';
import { mandelbulbSDF } from './mandelbulb';
import { mengerSDF } from './menger';
import { octahedronSDF } from './octahedron';
import { quatjuliaSDF } from './quatjulia';
import type { SDFParams } from './SDFParams';
import { sierpinskiSDF } from './sierpinski';
import { spudsvilleSDF } from './spudsville';
import { tricornSDF } from './tricorn';
import { xenodreambuieSDF } from './xenodreambuie';

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
