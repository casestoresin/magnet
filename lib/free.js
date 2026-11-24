// Free layout: every frame (item) has its own size, position and sheet.
// item = { page, x, y, frame: { width, height, shape, radius, bleed, border, borderBottom, borderColor } }
// project.items[i] lines up with project.slots[i] (the photo inside it). All values in mm.

const EPS = 0.01;

export const cellOf = (frame) => ({ w: frame.width + 2 * frame.bleed, h: frame.height + 2 * frame.bleed });

export const rotatedFrame = (f) => ({ ...f, width: f.height, height: f.width });

export function frameTemplate(frame) {
  const { preset, ...rest } = frame;
  return { ...rest };
}

function gaps(project) {
  return { gx: project.grid.gapX ?? 0, gy: project.grid.gapY ?? 0 };
}

export function rectsOnPage(items, page, exclude = -1) {
  const out = [];
  items.forEach((it, i) => {
    if (it && it.page === page && i !== exclude) out.push({ i, x: it.x, y: it.y, ...cellOf(it.frame) });
  });
  return out;
}

function collides(r, rects, gx, gy) {
  return rects.some(
    (o) => r.x < o.x + o.w + gx - EPS && o.x < r.x + r.w + gx - EPS && r.y < o.y + o.h + gy - EPS && o.y < r.y + r.h + gy - EPS
  );
}

function inBounds(r, page) {
  return (
    r.x >= page.marginLeft - EPS &&
    r.y >= page.marginTop - EPS &&
    r.x + r.w <= page.width - page.marginRight + EPS &&
    r.y + r.h <= page.height - page.marginBottom + EPS
  );
}

// Top-left-most free spot for a w×h rectangle, or null
export function findSpot(rects, page, w, h, gx, gy) {
  const xs = new Set([page.marginLeft]);
  const ys = new Set([page.marginTop]);
  rects.forEach((o) => {
    xs.add(o.x + o.w + gx);
    xs.add(o.x);
    ys.add(o.y + o.h + gy);
    ys.add(o.y);
  });
  const X = [...xs].sort((a, b) => a - b);
  const Y = [...ys].sort((a, b) => a - b);
  for (const y of Y) {
    for (const x of X) {
      const r = { x, y, w, h };
      if (inBounds(r, page) && !collides(r, rects, gx, gy)) return { x, y };
    }
  }
  return null;
}

// Best spot for a frame on one sheet, optionally trying it rotated too
function spotFor(rects, page, frame, allowRotate, gx, gy) {
  const options = [frame];
  if (allowRotate && Math.abs(frame.width - frame.height) > EPS) options.push(rotatedFrame(frame));
  let best = null;
  for (const f of options) {
    const { w, h } = cellOf(f);
    const s = findSpot(rects, page, w, h, gx, gy);
    if (s && (!best || s.y < best.y - EPS || (Math.abs(s.y - best.y) < EPS && s.x < best.x))) best = { ...s, frame: f };
  }
  return best;
}

// Item for one new frame: first sheet (from startPage) where it fits; a new sheet if none
export function placeNewItem(project, frame, startPage = 0, allowRotate = false, pageCount = 1) {
  const { gx, gy } = gaps(project);
  const items = project.items || [];
  for (let p = startPage; p < Math.max(pageCount, startPage + 1) + 1; p++) {
    const s = spotFor(rectsOnPage(items, p), project.page, frame, allowRotate, gx, gy);
    if (s) return { page: p, x: s.x, y: s.y, frame: s.frame };
  }
  // Too big for an empty sheet — put it at the margin corner so the admin sees the warning
  return { page: Math.max(pageCount, startPage), x: project.page.marginLeft, y: project.page.marginTop, frame };
}

// Fill the empty space of one sheet with as many frames of this size as fit
function greedyFill(project, frame, page, allowRotate, gx, gy) {
  const rects = rectsOnPage(project.items || [], page);
  const added = [];
  for (let n = 0; n < 1000; n++) {
    const s = spotFor(rects, project.page, frame, allowRotate, gx, gy);
    if (!s) break;
    added.push({ page, x: s.x, y: s.y, frame: s.frame });
    rects.push({ x: s.x, y: s.y, ...cellOf(s.frame) });
  }
  return added;
}

// With rotation allowed, tries several strategies and keeps the one that fits the most frames
export function fillPageItems(project, frame, page, allowRotate) {
  const { gx, gy } = gaps(project);
  const upright = greedyFill(project, frame, page, false, gx, gy);
  if (!allowRotate || Math.abs(frame.width - frame.height) < EPS) return upright;
  const turned = rotatedFrame(frame);
  const candidates = [
    upright,
    greedyFill(project, turned, page, false, gx, gy),
    greedyFill(project, frame, page, true, gx, gy),
    // fill one orientation first, then top up the leftover space with the other
    (() => {
      const a = greedyFill(project, frame, page, false, gx, gy);
      return [...a, ...greedyFill({ ...project, items: [...(project.items || []), ...a] }, turned, page, false, gx, gy)];
    })(),
    (() => {
      const a = greedyFill(project, turned, page, false, gx, gy);
      return [...a, ...greedyFill({ ...project, items: [...(project.items || []), ...a] }, frame, page, false, gx, gy)];
    })(),
  ];
  return candidates.reduce((best, c) => (c.length > best.length ? c : best), upright);
}

// Re-pack all frames onto as few sheets as possible (biggest first). Returns new order of indices + items.
export function autoArrange(project, allowRotate) {
  const { gx, gy } = gaps(project);
  const items = project.items || [];
  const order = items
    .map((it, i) => i)
    .sort((a, b) => {
      const A = cellOf(items[a].frame);
      const B = cellOf(items[b].frame);
      return B.w * B.h - A.w * A.h || a - b;
    });
  const pages = [];
  const placed = [];
  for (const idx of order) {
    const it = items[idx];
    let done = null;
    for (let p = 0; p <= pages.length; p++) {
      const rects = pages[p] || [];
      const s = spotFor(rects, project.page, it.frame, allowRotate, gx, gy);
      if (s) {
        done = { ...it, page: p, x: s.x, y: s.y, frame: s.frame };
        break;
      }
    }
    if (!done) done = { ...it, page: pages.length, x: project.page.marginLeft, y: project.page.marginTop };
    (pages[done.page] = pages[done.page] || []).push({ x: done.x, y: done.y, ...cellOf(done.frame) });
    placed.push(done);
  }
  return { order, items: placed, pageCount: Math.max(1, pages.length) };
}

// Snap a dragged frame to margins and neighbour edges (+gap)
export function snapPosition(project, index, x, y, threshold = 1.5) {
  const items = project.items;
  const it = items[index];
  const { w, h } = cellOf(it.frame);
  const { gx, gy } = gaps(project);
  const page = project.page;
  const others = rectsOnPage(items, it.page, index);
  const cx = [page.marginLeft, page.width - page.marginRight - w];
  const cy = [page.marginTop, page.height - page.marginBottom - h];
  others.forEach((o) => {
    cx.push(o.x, o.x + o.w + gx, o.x - gx - w, o.x + o.w - w);
    cy.push(o.y, o.y + o.h + gy, o.y - gy - h, o.y + o.h - h);
  });
  const best = (v, list) => {
    let out = v;
    let d = threshold;
    list.forEach((c) => {
      if (Math.abs(c - v) < d) {
        d = Math.abs(c - v);
        out = c;
      }
    });
    return out;
  };
  return { x: best(x, cx), y: best(y, cy) };
}

// Indices of frames that overlap another frame or go outside the margins
export function problemItems(project) {
  const items = project.items || [];
  const bad = new Set();
  items.forEach((it, i) => {
    const r = { x: it.x, y: it.y, ...cellOf(it.frame) };
    if (!inBounds(r, project.page)) bad.add(i);
    if (collides(r, rectsOnPage(items, it.page, i), 0, 0)) bad.add(i);
  });
  return bad;
}

// Convert the current grid into free items (same indices, so photos stay put)
export function itemsFromGrid(project, layout, totalPages) {
  const frame = frameTemplate(project.frame);
  const items = [];
  for (let p = 0; p < totalPages; p++) {
    layout.positions.forEach((pos) => items.push({ page: p, x: pos.x, y: pos.y, frame: { ...frame } }));
  }
  return items;
}
