/**
 * Gamepad vendor detection + per-vendor button label maps.
 *
 * Stored bindings are always `Button0`..`ButtonN` (stable physical position
 * under the W3C standard gamepad mapping). Only *display* varies by vendor,
 * so the same binding shows as "A" on Xbox, "✕" on PlayStation, "B" on
 * Nintendo — matching what's printed on the user's controller.
 */
export type GamepadVendor = 'xbox' | 'playstation' | 'nintendo' | 'generic';

/** Vendor IDs Chrome embeds in `gamepad.id` as "Vendor: xxxx". */
const VENDOR_IDS: Record<string, GamepadVendor> = {
  '054c': 'playstation', // Sony
  '045e': 'xbox', // Microsoft
  '057e': 'nintendo', // Nintendo
};

export function detectGamepadVendor(id: string): GamepadVendor {
  const vendorMatch = /Vendor:\s*([0-9a-f]{4})/i.exec(id);
  if (vendorMatch?.[1] != null && vendorMatch[1] !== '') {
    const vendor = VENDOR_IDS[vendorMatch[1].toLowerCase()];
    if (vendor != null) return vendor;
  }
  const lower = id.toLowerCase();
  if (/playstation|dualsense|dualshock/.test(lower)) return 'playstation';
  if (/xbox|xinput/.test(lower)) return 'xbox';
  if (/nintendo|switch|joy-con|joy con|pro controller/.test(lower)) return 'nintendo';
  return 'generic';
}

type ButtonLabelMap = Record<number, string>;

/** W3C standard gamepad mapping — bottom face button is index 0. */
const XBOX_LABELS: ButtonLabelMap = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'View',
  9: 'Menu',
  10: 'LS',
  11: 'RS',
  12: '↑',
  13: '↓',
  14: '←',
  15: '→',
};

const PLAYSTATION_LABELS: ButtonLabelMap = {
  0: '✕',
  1: '○',
  2: '□',
  3: '△',
  4: 'L1',
  5: 'R1',
  6: 'L2',
  7: 'R2',
  8: 'Create',
  9: 'Options',
  10: 'L3',
  11: 'R3',
  12: '↑',
  13: '↓',
  14: '←',
  15: '→',
};

// Nintendo Switch Pro: physical position stays the same (Button0 is the
// bottom face button) but the printed labels for A/B and X/Y are swapped
// relative to Xbox. A user who rebinds on Xbox and switches to a Switch pad
// will see their binding move to the adjacent face button — intentional
// (position-stable binding) and matches standard cross-platform behavior.
const NINTENDO_LABELS: ButtonLabelMap = {
  0: 'B',
  1: 'A',
  2: 'Y',
  3: 'X',
  4: 'L',
  5: 'R',
  6: 'ZL',
  7: 'ZR',
  8: '-',
  9: '+',
  10: 'LS',
  11: 'RS',
  12: '↑',
  13: '↓',
  14: '←',
  15: '→',
};

const LABELS_BY_VENDOR: Record<GamepadVendor, ButtonLabelMap> = {
  xbox: XBOX_LABELS,
  playstation: PLAYSTATION_LABELS,
  nintendo: NINTENDO_LABELS,
  generic: {},
};

/** Display label for a button code like "Button0" under a given vendor. */
export function displayGamepadCode(code: string, vendor: GamepadVendor): string {
  const match = /^Button(\d+)$/.exec(code);
  if (match?.[1] == null || match[1] === '') return code;
  const index = Number(match[1]);
  const label = LABELS_BY_VENDOR[vendor][index];
  if (label != null && label !== '') return label;
  return `B${index}`;
}
