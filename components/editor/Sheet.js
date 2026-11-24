'use client';

import MagnetCell from './MagnetCell';

function CutMarks({ page, frame, layout, marks }) {
  const { startX, startY, gridW, gridH, cols, rows, cellW, cellH } = layout;
  const gx = layout.cols > 1 ? (gridW - cols * cellW) / (cols - 1) : 0;
  const gy = layout.rows > 1 ? (gridH - rows * cellH) / (rows - 1) : 0;
  const len = marks.markLength || 4;
  const off = marks.markOffset ?? 1;
  const b = frame.bleed;
  const lines = [];

  for (let c = 0; c < cols; c++) {
    const x0 = startX + c * (cellW + gx) + b;
    const x1 = x0 + frame.width;
    for (const x of [x0, x1]) {
      lines.push([x, startY - off - len, x, startY - off]);
      lines.push([x, startY + gridH + off, x, startY + gridH + off + len]);
    }
  }
  for (let r = 0; r < rows; r++) {
    const y0 = startY + r * (cellH + gy) + b;
    const y1 = y0 + frame.height;
    for (const y of [y0, y1]) {
      lines.push([startX - off - len, y, startX - off, y]);
      lines.push([startX + gridW + off, y, startX + gridW + off + len, y]);
    }
  }

  return (
    <svg
      className="cut-marks"
      width="100%"
      height="100%"
      viewBox={`0 0 ${page.width} ${page.height}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={0.15} />
      ))}
    </svg>
  );
}

// Free layout: short marks just outside each frame's cut corners (drawn under the photos)
function CornerMarks({ page, items, marks }) {
  const len = marks.markLength || 4;
  const off = marks.markOffset ?? 1;
  const lines = [];
  items.forEach(({ it }) => {
    const b = it.frame.bleed;
    const x0 = it.x;
    const y0 = it.y;
    const x1 = it.x + it.frame.width + 2 * b;
    const y1 = it.y + it.frame.height + 2 * b;
    const cx = [it.x + b, it.x + b + it.frame.width];
    const cy = [it.y + b, it.y + b + it.frame.height];
    cx.forEach((x) => {
      lines.push([x, y0 - off - len, x, y0 - off]);
      lines.push([x, y1 + off, x, y1 + off + len]);
    });
    cy.forEach((y) => {
      lines.push([x0 - off - len, y, x0 - off, y]);
      lines.push([x1 + off, y, x1 + off + len, y]);
    });
  });
  return (
    <svg className="cut-marks" width="100%" height="100%" viewBox={`0 0 ${page.width} ${page.height}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={0.15} />
      ))}
    </svg>
  );
}

export default function Sheet({ project, layout, pageIndex, zoom, selection, problems, onCellPointerDown, onDropPhoto, onCellDoubleClick }) {
  const { page, frame, marks } = project;
  const base = pageIndex * layout.perPage;
  const free = project.layoutMode === 'free';
  const freeItems = free ? (project.items || []).map((it, i) => ({ it, i })).filter(({ it }) => it.page === pageIndex) : [];

  if (free) {
    return (
      <div className="sheet" style={{ width: `${page.width}mm`, height: `${page.height}mm`, background: page.background || '#fff', zoom }}>
        {marks.showMargins && (
          <div
            className="margin-guide screen-only"
            style={{ left: `${page.marginLeft}mm`, top: `${page.marginTop}mm`, width: `${layout.availW}mm`, height: `${layout.availH}mm` }}
          />
        )}
        {marks.cutMarks && <CornerMarks page={page} items={freeItems} marks={marks} />}
        {freeItems.map(({ it, i }) => (
          <MagnetCell
            key={i}
            uid={`f${i}`}
            index={i}
            x={it.x}
            y={it.y}
            slot={project.slots[i]}
            frame={it.frame}
            marks={marks}
            selected={selection.includes(i)}
            problem={problems?.has(i)}
            onPointerDown={onCellPointerDown}
            onDropPhoto={onDropPhoto}
            onDoubleClick={onCellDoubleClick}
          />
        ))}
        {!freeItems.length && <div className="sheet-empty screen-only">No frames on this sheet yet — use “Add frame” or “Fill sheet” in the Layout tab.</div>}
      </div>
    );
  }

  return (
    <div
      className="sheet"
      style={{ width: `${page.width}mm`, height: `${page.height}mm`, background: page.background || '#fff', zoom }}
    >
      {marks.showMargins && (
        <div
          className="margin-guide screen-only"
          style={{
            left: `${page.marginLeft}mm`,
            top: `${page.marginTop}mm`,
            width: `${layout.availW}mm`,
            height: `${layout.availH}mm`,
          }}
        />
      )}
      {layout.positions.map((pos, i) => {
        const g = base + i;
        return (
          <MagnetCell
            key={i}
            uid={`${pageIndex}-${i}`}
            index={g}
            x={pos.x}
            y={pos.y}
            slot={project.slots[g]}
            frame={frame}
            marks={marks}
            selected={selection.includes(g)}
            onPointerDown={onCellPointerDown}
            onDropPhoto={onDropPhoto}
            onDoubleClick={onCellDoubleClick}
          />
        );
      })}
      {marks.cutMarks && layout.perPage > 0 && <CutMarks page={page} frame={frame} layout={layout} marks={marks} />}
    </div>
  );
}
