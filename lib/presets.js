// Sheet (paper) presets — sizes in mm (portrait)
export const PAGE_PRESETS = [
  { id: 'a4', name: 'A4', width: 210, height: 297 },
  { id: 'a3', name: 'A3', width: 297, height: 420 },
  { id: 'a5', name: 'A5', width: 148, height: 210 },
  { id: 'letter', name: 'US Letter', width: 215.9, height: 279.4 },
  { id: 'legal', name: 'US Legal', width: 215.9, height: 355.6 },
  { id: '4x6', name: '4 × 6 in (Photo)', width: 101.6, height: 152.4 },
  { id: '5x7', name: '5 × 7 in (Photo)', width: 127, height: 177.8 },
  { id: '8x10', name: '8 × 10 in', width: 203.2, height: 254 },
  { id: '12x18', name: '12 × 18 in', width: 304.8, height: 457.2 },
  { id: '13x19', name: '13 × 19 in (Super B)', width: 330.2, height: 482.6 },
  { id: 'magnetic-a4', name: 'Magnetic Sheet A4', width: 210, height: 297 },
  { id: 'custom', name: 'Custom size', width: null, height: null },
];

// Fridge magnet frame presets — sizes in mm
export const FRAME_PRESETS = [
  { id: '2x2', name: '2 × 2 in square', width: 50.8, height: 50.8, shape: 'rect', bleed: 1.5 },
  { id: '2x3', name: '2 × 3 in', width: 50.8, height: 76.2, shape: 'rect', bleed: 1.5 },
  { id: '2.5x2.5', name: '2.5 × 2.5 in square', width: 63.5, height: 63.5, shape: 'rect', bleed: 1.5 },
  { id: '2.5x3.5', name: '2.5 × 3.5 in (card)', width: 63.5, height: 88.9, shape: 'rounded', radius: 3, bleed: 1.5 },
  { id: '3x3', name: '3 × 3 in square', width: 76.2, height: 76.2, shape: 'rect', bleed: 1.5 },
  { id: '3x4', name: '3 × 4 in', width: 76.2, height: 101.6, shape: 'rect', bleed: 1.5 },
  { id: '4x4', name: '4 × 4 in square', width: 101.6, height: 101.6, shape: 'rect', bleed: 1.5 },
  { id: '4x6', name: '4 × 6 in', width: 101.6, height: 152.4, shape: 'rect', bleed: 1.5 },
  { id: '50x50', name: '50 × 50 mm', width: 50, height: 50, shape: 'rect', bleed: 1.5 },
  { id: '60x90', name: '60 × 90 mm', width: 60, height: 90, shape: 'rounded', radius: 4, bleed: 1.5 },
  { id: 'polaroid', name: 'Polaroid style 3 × 3.6 in', width: 76.2, height: 91.4, shape: 'rect', bleed: 0, border: 5, borderBottom: 15 },
  { id: 'round44', name: '44 mm button (wrap 56 mm)', width: 44, height: 44, shape: 'circle', bleed: 6 },
  { id: 'round58', name: '58 mm button (wrap 70 mm)', width: 58, height: 58, shape: 'circle', bleed: 6 },
  { id: 'round75', name: '75 mm button (wrap 89 mm)', width: 75, height: 75, shape: 'circle', bleed: 7 },
  { id: 'heart', name: 'Heart 70 × 65 mm', width: 70, height: 65, shape: 'heart', bleed: 1.5 },
  { id: 'hexagon', name: 'Hexagon 60 mm', width: 60, height: 52, shape: 'hexagon', bleed: 1.5 },
];

export const SHAPES = [
  { id: 'rect', name: 'Rectangle' },
  { id: 'rounded', name: 'Rounded' },
  { id: 'circle', name: 'Circle / Oval' },
  { id: 'heart', name: 'Heart' },
  { id: 'hexagon', name: 'Hexagon' },
  { id: 'star', name: 'Star' },
];

export const FONTS = [
  'Arial, sans-serif',
  'Georgia, serif',
  '"Times New Roman", serif',
  '"Courier New", monospace',
  'Verdana, sans-serif',
  '"Trebuchet MS", sans-serif',
  'Impact, sans-serif',
  '"Comic Sans MS", cursive',
  '"Brush Script MT", cursive',
];

export const DEFAULT_SLOT = {
  photoId: null,
  url: '',
  w: 0,
  h: 0,
  fit: 'cover',
  zoom: 1,
  ox: 0,
  oy: 0,
  rotate: 0,
  flipX: false,
  flipY: false,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  sepia: 0,
  bg: '#ffffff',
  text: '',
  textColor: '#ffffff',
  textSize: 12, // pt
  textY: 5, // mm from bottom edge of frame
  textFont: 'Arial, sans-serif',
  textBold: true,
  textShadow: true,
};

export function defaultProject(overrides = {}) {
  return {
    name: 'Untitled magnet sheet',
    customer: '',
    phone: '',
    notes: '',
    status: 'draft',
    unit: 'mm',
    page: { preset: 'a4', width: 210, height: 297, marginTop: 8, marginRight: 8, marginBottom: 8, marginLeft: 8, background: '#ffffff' },
    frame: {
      preset: '2.5x2.5',
      width: 63.5,
      height: 63.5,
      shape: 'rect',
      radius: 3,
      bleed: 1.5,
      border: 0,
      borderBottom: 0,
      borderColor: '#ffffff',
    },
    grid: { mode: 'auto', rows: 4, cols: 3, gapX: 4, gapY: 4, center: true },
    marks: {
      cutMarks: true,
      markLength: 4,
      markOffset: 1,
      outline: true,
      outlineColor: '#b0b0b0',
      outlineWidth: 0.2,
      safeArea: false,
      safeMargin: 3,
      showMargins: true,
    },
    pageCount: 1,
    slots: [],
    ...overrides,
  };
}
