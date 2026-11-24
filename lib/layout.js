// Pure layout math — everything in mm.

export function computeLayout(project) {
  const { page, frame, grid } = project;
  const cellW = frame.width + 2 * frame.bleed;
  const cellH = frame.height + 2 * frame.bleed;
  const availW = page.width - page.marginLeft - page.marginRight;
  const availH = page.height - page.marginTop - page.marginBottom;

  let cols;
  let rows;
  if (grid.mode === 'auto') {
    cols = Math.max(0, Math.floor((availW + grid.gapX + 0.001) / (cellW + grid.gapX)));
    rows = Math.max(0, Math.floor((availH + grid.gapY + 0.001) / (cellH + grid.gapY)));
  } else {
    cols = Math.max(1, Math.floor(grid.cols || 1));
    rows = Math.max(1, Math.floor(grid.rows || 1));
  }

  const gridW = cols > 0 ? cols * cellW + (cols - 1) * grid.gapX : 0;
  const gridH = rows > 0 ? rows * cellH + (rows - 1) * grid.gapY : 0;
  const startX = page.marginLeft + (grid.center ? (availW - gridW) / 2 : 0);
  const startY = page.marginTop + (grid.center ? (availH - gridH) / 2 : 0);

  const positions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push({ x: startX + c * (cellW + grid.gapX), y: startY + r * (cellH + grid.gapY), r, c });
    }
  }

  const overflowX = gridW > availW + 0.01;
  const overflowY = gridH > availH + 0.01;

  return {
    cellW,
    cellH,
    cols,
    rows,
    perPage: rows * cols,
    gridW,
    gridH,
    startX,
    startY,
    availW,
    availH,
    positions,
    overflow: overflowX || overflowY,
    // Space left over on the sheet (useful to show the admin)
    freeW: availW - gridW,
    freeH: availH - gridH,
  };
}

// Frame size that exactly fills the printable area for a fixed rows × cols grid
export function frameSizeToFitGrid(project) {
  const { page, frame, grid } = project;
  const availW = page.width - page.marginLeft - page.marginRight;
  const availH = page.height - page.marginTop - page.marginBottom;
  const cols = Math.max(1, grid.cols);
  const rows = Math.max(1, grid.rows);
  const cellW = (availW - (cols - 1) * grid.gapX) / cols;
  const cellH = (availH - (rows - 1) * grid.gapY) / rows;
  return {
    width: Math.max(1, cellW - 2 * frame.bleed),
    height: Math.max(1, cellH - 2 * frame.bleed),
  };
}

// Gap that spreads a fixed grid evenly across the printable area
export function gapToFillPage(project) {
  const { page, frame, grid } = project;
  const layout = computeLayout(project);
  const cellW = frame.width + 2 * frame.bleed;
  const cellH = frame.height + 2 * frame.bleed;
  const gapX = layout.cols > 1 ? (layout.availW - layout.cols * cellW) / (layout.cols - 1) : grid.gapX;
  const gapY = layout.rows > 1 ? (layout.availH - layout.rows * cellH) / (layout.rows - 1) : grid.gapY;
  return { gapX: Math.max(0, gapX), gapY: Math.max(0, gapY) };
}

// Number of pages needed so no filled slot is hidden
export function pagesNeeded(project, perPage) {
  if (!perPage) return Math.max(1, project.pageCount || 1);
  let last = -1;
  (project.slots || []).forEach((s, i) => {
    if (s && s.photoId) last = i;
  });
  return Math.max(project.pageCount || 1, Math.ceil((last + 1) / perPage), 1);
}

// ---- Shapes ---------------------------------------------------------------

function heartPoints(x, y, w, h, n = 72) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const px = 16 * Math.sin(t) ** 3;
    const py = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push([px, py]);
  }
  // px range [-16,16]; py range approx [-17, 12]
  const minY = -17;
  const maxY = 12;
  return pts.map(([px, py]) => [x + ((px + 16) / 32) * w, y + ((maxY - py) / (maxY - minY)) * h]);
}

function hexPoints(x, y, w, h) {
  return [
    [x + w * 0.25, y],
    [x + w * 0.75, y],
    [x + w, y + h / 2],
    [x + w * 0.75, y + h],
    [x + w * 0.25, y + h],
    [x, y + h / 2],
  ];
}

function starPoints(x, y, w, h, spikes = 5, inner = 0.45) {
  const pts = [];
  const cx = x + w / 2;
  const cy = y + h / 2;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 1 : inner;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    pts.push([cx + (Math.cos(a) * r * w) / 2, cy + (Math.sin(a) * r * h) / 2 + h * 0.04]);
  }
  return pts;
}

const toAttr = (pts) => pts.map(([a, b]) => `${a.toFixed(3)},${b.toFixed(3)}`).join(' ');

// Returns { tag, attrs } so it can be used for <clipPath> children or outlines
export function shapeGeometry(shape, x, y, w, h, radius = 0) {
  w = Math.max(0.01, w);
  h = Math.max(0.01, h);
  switch (shape) {
    case 'rounded':
      return { tag: 'rect', attrs: { x, y, width: w, height: h, rx: Math.max(0, Math.min(radius, w / 2, h / 2)) } };
    case 'circle':
      return { tag: 'ellipse', attrs: { cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 } };
    case 'heart':
      return { tag: 'polygon', attrs: { points: toAttr(heartPoints(x, y, w, h)) } };
    case 'hexagon':
      return { tag: 'polygon', attrs: { points: toAttr(hexPoints(x, y, w, h)) } };
    case 'star':
      return { tag: 'polygon', attrs: { points: toAttr(starPoints(x, y, w, h)) } };
    default:
      return { tag: 'rect', attrs: { x, y, width: w, height: h } };
  }
}

// ---- Image placement ------------------------------------------------------

// area = { x, y, w, h } in mm. Returns image draw box + effective DPI.
export function placeImage(slot, area) {
  if (!slot || !slot.w || !slot.h) return null;
  const quarter = Math.round((slot.rotate || 0) / 90);
  const swapped = Math.abs(quarter) % 2 === 1;
  const iw = swapped ? slot.h : slot.w;
  const ih = swapped ? slot.w : slot.h;
  const zoom = slot.zoom || 1;

  // Visible size on the sheet (after rotation), in mm
  let visW;
  let visH;
  if (slot.fit === 'stretch') {
    visW = area.w * zoom;
    visH = area.h * zoom;
  } else if (slot.fit === 'custom' && slot.imgW > 0 && slot.imgH > 0) {
    visW = slot.imgW;
    visH = slot.imgH;
  } else {
    const scale = (slot.fit === 'contain' ? Math.min(area.w / iw, area.h / ih) : Math.max(area.w / iw, area.h / ih)) * zoom;
    visW = iw * scale;
    visH = ih * scale;
  }

  // Drawn size before rotation (in image orientation)
  const dw = swapped ? visH : visW;
  const dh = swapped ? visW : visH;
  const cx = area.x + area.w / 2 + (slot.ox || 0);
  const cy = area.y + area.h / 2 + (slot.oy || 0);
  const dpi = Math.min(slot.w / (dw / 25.4), slot.h / (dh / 25.4));
  // How much the photo is squashed/stretched compared to its real shape (1 = not at all)
  const distortion = visW / visH / (iw / ih);

  let transform = `rotate(${slot.rotate || 0} ${cx} ${cy})`;
  if (slot.flipX || slot.flipY) {
    transform += ` translate(${cx} ${cy}) scale(${slot.flipX ? -1 : 1} ${slot.flipY ? -1 : 1}) translate(${-cx} ${-cy})`;
  }
  return { x: cx - dw / 2, y: cy - dh / 2, width: dw, height: dh, transform, dpi, visW, visH, distortion, aspect: iw / ih };
}

// Image area for a slot inside a cell (cell origin 0,0)
export function imageArea(frame) {
  const b = frame.bleed;
  if (frame.border > 0 || frame.borderBottom > 0) {
    const t = frame.border || 0;
    const bottom = t + (frame.borderBottom || 0);
    return {
      x: b + t,
      y: b + t,
      w: Math.max(1, frame.width - 2 * t),
      h: Math.max(1, frame.height - t - bottom),
      inset: true,
    };
  }
  return { x: 0, y: 0, w: frame.width + 2 * b, h: frame.height + 2 * b, inset: false };
}

export function qualityLabel(dpi) {
  if (!dpi || !isFinite(dpi)) return { label: '—', level: 'none' };
  if (dpi >= 250) return { label: `${Math.round(dpi)} DPI · Excellent`, level: 'good' };
  if (dpi >= 150) return { label: `${Math.round(dpi)} DPI · Good`, level: 'ok' };
  return { label: `${Math.round(dpi)} DPI · Low quality`, level: 'bad' };
}
