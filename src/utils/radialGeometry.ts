/** Radius (px) below which the cursor is treated as "no selection". */
const RADIAL_DEAD_ZONE = 15;

/**
 * Convert cursor offset from the menu center to the selected sector index of
 * a radial menu with `count` evenly-spaced items. Index 0 sits at the top and
 * indices proceed clockwise. Returns -1 when the cursor is within the dead
 * zone or when `count` is non-positive.
 */
export function radialSelectedIndex(cursorX: number, cursorY: number, count: number): number {
  const dist = Math.sqrt(cursorX * cursorX + cursorY * cursorY);
  if (dist < RADIAL_DEAD_ZONE || count <= 0) return -1;

  const TAU = Math.PI * 2;
  let angle = Math.atan2(cursorY, cursorX) + Math.PI / 2; // offset so 0 = top
  if (angle < 0) angle += TAU;
  // Add half-sector offset so boundaries fall between tiles, not on them
  const halfStep = TAU / count / 2;
  return Math.floor((((angle + halfStep) % TAU) / TAU) * count) % count;
}
