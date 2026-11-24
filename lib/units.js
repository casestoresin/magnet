// All sizes are stored internally in millimetres (mm).
// px uses the CSS / screen standard of 96 px per inch.

export const UNITS = ['mm', 'cm', 'in', 'px'];

export const UNIT_LABELS = {
  mm: 'Millimetre (mm)',
  cm: 'Centimetre (cm)',
  in: 'Inch (in)',
  px: 'Pixel (px @ 96 DPI)',
};

const MM_PER_UNIT = { mm: 1, cm: 10, in: 25.4, px: 25.4 / 96 };

export const PRECISION = { mm: 1, cm: 2, in: 3, px: 0 };
export const STEP = { mm: 0.5, cm: 0.05, in: 0.01, px: 1 };

export const MM_PER_PX = 25.4 / 96;
export const PX_PER_MM = 96 / 25.4;
export const MM_PER_PT = 25.4 / 72;

export function round(value, decimals = 2) {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function toMM(value, unit) {
  return Number(value) * (MM_PER_UNIT[unit] || 1);
}

export function fromMM(mm, unit) {
  return Number(mm) / (MM_PER_UNIT[unit] || 1);
}

export function displayValue(mm, unit) {
  return round(fromMM(mm, unit), PRECISION[unit] ?? 2);
}

export function formatSize(wMM, hMM, unit) {
  return `${displayValue(wMM, unit)} × ${displayValue(hMM, unit)} ${unit}`;
}
