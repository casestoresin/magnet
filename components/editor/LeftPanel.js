'use client';

import { useState } from 'react';
import PhotoLibrary from '@/components/PhotoLibrary';
import { UnitInput, NumberInput, ColorInput, Select, Toggle, Section } from '@/components/ui/Inputs';
import { PAGE_PRESETS, FRAME_PRESETS, SHAPES } from '@/lib/presets';
import { frameSizeToFitGrid, gapToFillPage } from '@/lib/layout';
import { displayValue, formatSize } from '@/lib/units';

const TABS = [
  { id: 'photos', icon: '🖼', label: 'Photos' },
  { id: 'sheet', icon: '📄', label: 'Sheet' },
  { id: 'frame', icon: '⬜', label: 'Frame' },
  { id: 'grid', icon: '▦', label: 'Grid' },
  { id: 'marks', icon: '✂', label: 'Marks' },
];

export default function LeftPanel({ project, patch, update, layout, lib, usage, onPhotoClick, onAutoFill, hasSelection }) {
  const [tab, setTab] = useState('photos');
  const unit = project.unit;

  return (
    <aside className="left-panel no-print">
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <div className="panel-body">
        {tab === 'photos' && (
          <PhotosTab lib={lib} usage={usage} onPhotoClick={onPhotoClick} onAutoFill={onAutoFill} hasSelection={hasSelection} />
        )}
        {tab === 'sheet' && <SheetTab project={project} patch={patch} unit={unit} />}
        {tab === 'frame' && <FrameTab project={project} patch={patch} unit={unit} />}
        {tab === 'grid' && <GridTab project={project} patch={patch} update={update} unit={unit} layout={layout} />}
        {tab === 'marks' && <MarksTab project={project} patch={patch} unit={unit} />}
      </div>
    </aside>
  );
}

function PhotosTab({ lib, usage, onPhotoClick, onAutoFill, hasSelection }) {
  const [picked, setPicked] = useState([]);
  const [copies, setCopies] = useState(1);
  const [overwrite, setOverwrite] = useState(false);
  const [fromSelected, setFromSelected] = useState(false);

  const toggle = (p) => setPicked((s) => (s.includes(p._id) ? s.filter((x) => x !== p._id) : [...s, p._id]));
  const pickedPhotos = picked.map((id) => lib.photos.find((p) => p._id === id)).filter(Boolean);

  return (
    <>
      <p className="hint">
        <b>Click</b> a photo to place it in the selected magnet (or the next empty one). <b>Drag</b> it onto any magnet. Tick
        several photos to auto-fill.
      </p>
      {picked.length > 0 && (
        <div className="autofill-box">
          <div className="row between">
            <strong>{picked.length} photo(s) ticked</strong>
            <button className="link" onClick={() => setPicked([])}>
              Clear
            </button>
          </div>
          <NumberInput label="Copies of each photo" value={copies} min={1} max={500} onChange={setCopies} />
          <Toggle label="Overwrite filled magnets" checked={overwrite} onChange={setOverwrite} />
          {hasSelection && <Toggle label="Start from selected magnet" checked={fromSelected} onChange={setFromSelected} />}
          <button
            className="btn primary block"
            onClick={() => {
              onAutoFill(pickedPhotos, { copies, overwrite, fromSelected });
              setPicked([]);
            }}
          >
            Auto-fill {pickedPhotos.length * copies} magnet(s)
          </button>
        </div>
      )}
      <button className="btn ghost block" onClick={() => setPicked(lib.photos.map((p) => p._id))}>
        Tick all photos
      </button>
      <PhotoLibrary lib={lib} compact draggable selected={picked} onToggleSelect={toggle} onPhotoClick={onPhotoClick} usage={usage} />
    </>
  );
}

function SheetTab({ project, patch, unit }) {
  const { page } = project;
  const [linkMargins, setLinkMargins] = useState(
    page.marginTop === page.marginRight && page.marginTop === page.marginBottom && page.marginTop === page.marginLeft
  );
  const landscape = page.width > page.height;

  const setPreset = (id) => {
    const p = PAGE_PRESETS.find((x) => x.id === id);
    if (!p || !p.width) return patch('page', { preset: 'custom' });
    const [w, h] = landscape ? [p.height, p.width] : [p.width, p.height];
    patch('page', { preset: id, width: w, height: h });
  };

  const setMargin = (side, v) => {
    if (linkMargins) patch('page', { marginTop: v, marginRight: v, marginBottom: v, marginLeft: v });
    else patch('page', { [side]: v });
  };

  return (
    <>
      <Section title="Sheet size">
        <Select
          label="Preset"
          value={page.preset || 'custom'}
          onChange={setPreset}
          options={PAGE_PRESETS.map((p) => ({ value: p.id, label: p.width ? `${p.name} — ${formatSize(p.width, p.height, unit)}` : p.name }))}
        />
        <div className="grid-2">
          <UnitInput label="Width" unit={unit} valueMM={page.width} min={10} onChange={(v) => patch('page', { width: v, preset: 'custom' })} />
          <UnitInput label="Height" unit={unit} valueMM={page.height} min={10} onChange={(v) => patch('page', { height: v, preset: 'custom' })} />
        </div>
        <div className="seg">
          <button className={!landscape ? 'active' : ''} onClick={() => landscape && patch('page', { width: page.height, height: page.width })}>
            ▯ Portrait
          </button>
          <button className={landscape ? 'active' : ''} onClick={() => !landscape && patch('page', { width: page.height, height: page.width })}>
            ▭ Landscape
          </button>
        </div>
      </Section>

      <Section title="Margins (printer safe zone)" right={<Toggle label="Link" checked={linkMargins} onChange={setLinkMargins} />}>
        {linkMargins ? (
          <UnitInput label="All sides" unit={unit} valueMM={page.marginTop} onChange={(v) => setMargin('marginTop', v)} />
        ) : (
          <div className="grid-2">
            <UnitInput label="Top" unit={unit} valueMM={page.marginTop} onChange={(v) => setMargin('marginTop', v)} />
            <UnitInput label="Bottom" unit={unit} valueMM={page.marginBottom} onChange={(v) => setMargin('marginBottom', v)} />
            <UnitInput label="Left" unit={unit} valueMM={page.marginLeft} onChange={(v) => setMargin('marginLeft', v)} />
            <UnitInput label="Right" unit={unit} valueMM={page.marginRight} onChange={(v) => setMargin('marginRight', v)} />
          </div>
        )}
        <p className="hint">Most printers can't print the outer 3–5 mm. Keep margins at least that big.</p>
      </Section>

      <Section title="Background">
        <ColorInput label="Sheet colour" value={page.background || '#ffffff'} onChange={(v) => patch('page', { background: v })} />
      </Section>
    </>
  );
}

function FrameTab({ project, patch, unit }) {
  const { frame } = project;

  const setPreset = (id) => {
    const p = FRAME_PRESETS.find((x) => x.id === id);
    if (!p) return patch('frame', { preset: 'custom' });
    patch('frame', {
      preset: id,
      width: p.width,
      height: p.height,
      shape: p.shape,
      radius: p.radius ?? frame.radius ?? 3,
      bleed: p.bleed ?? 1.5,
      border: p.border ?? 0,
      borderBottom: p.borderBottom ?? 0,
    });
  };

  return (
    <>
      <Section title="Magnet size">
        <Select
          label="Preset"
          value={frame.preset || 'custom'}
          onChange={setPreset}
          options={[{ value: 'custom', label: 'Custom size' }, ...FRAME_PRESETS.map((p) => ({ value: p.id, label: p.name }))]}
        />
        <div className="grid-2">
          <UnitInput label="Width" unit={unit} valueMM={frame.width} min={5} onChange={(v) => patch('frame', { width: v, preset: 'custom' })} />
          <UnitInput label="Height" unit={unit} valueMM={frame.height} min={5} onChange={(v) => patch('frame', { height: v, preset: 'custom' })} />
        </div>
        <button className="btn ghost block" onClick={() => patch('frame', { width: frame.height, height: frame.width })}>
          ⇄ Swap width / height
        </button>
      </Section>

      <Section title="Shape">
        <div className="shape-grid">
          {SHAPES.map((s) => (
            <button key={s.id} className={frame.shape === s.id ? 'active' : ''} onClick={() => patch('frame', { shape: s.id })}>
              <ShapeIcon shape={s.id} />
              <span>{s.name}</span>
            </button>
          ))}
        </div>
        {frame.shape === 'rounded' && (
          <UnitInput label="Corner radius" unit={unit} valueMM={frame.radius} onChange={(v) => patch('frame', { radius: v })} />
        )}
      </Section>

      <Section title="Bleed / wrap">
        <UnitInput
          label="Bleed (extra image outside cut line)"
          unit={unit}
          valueMM={frame.bleed}
          onChange={(v) => patch('frame', { bleed: v })}
        />
        <p className="hint">
          Flat magnets: 1–3 mm so a slightly off cut doesn't show white. Button / badge magnets: use the wrap size (e.g. 6 mm for a
          58 mm button).
        </p>
      </Section>

      <Section title="White border (Polaroid style)">
        <div className="grid-2">
          <UnitInput label="Border" unit={unit} valueMM={frame.border || 0} onChange={(v) => patch('frame', { border: v })} />
          <UnitInput label="Extra bottom" unit={unit} valueMM={frame.borderBottom || 0} onChange={(v) => patch('frame', { borderBottom: v })} />
        </div>
        <ColorInput label="Border colour" value={frame.borderColor || '#ffffff'} onChange={(v) => patch('frame', { borderColor: v })} />
      </Section>
    </>
  );
}

function GridTab({ project, patch, update, unit, layout }) {
  const { grid } = project;
  const [linkGap, setLinkGap] = useState(grid.gapX === grid.gapY);

  return (
    <>
      <Section title="Layout mode">
        <div className="seg">
          <button className={grid.mode === 'auto' ? 'active' : ''} onClick={() => patch('grid', { mode: 'auto' })}>
            Auto fit
          </button>
          <button
            className={grid.mode === 'manual' ? 'active' : ''}
            onClick={() => patch('grid', { mode: 'manual', rows: layout.rows || 1, cols: layout.cols || 1 })}
          >
            Set rows × cols
          </button>
        </div>
        {grid.mode === 'manual' ? (
          <>
            <div className="grid-2">
              <NumberInput label="Columns" value={grid.cols} min={1} max={50} onChange={(v) => patch('grid', { cols: Math.round(v) })} />
              <NumberInput label="Rows" value={grid.rows} min={1} max={50} onChange={(v) => patch('grid', { rows: Math.round(v) })} />
            </div>
            <button
              className="btn ghost block"
              onClick={() => update((p) => ({ ...p, frame: { ...p.frame, ...frameSizeToFitGrid(p), preset: 'custom' } }))}
            >
              Resize magnets to fill the sheet
            </button>
          </>
        ) : (
          <p className="hint">As many magnets as fit inside the margins are placed automatically.</p>
        )}
        <div className={`stat ${layout.overflow ? 'bad' : ''}`}>
          <b>{layout.perPage}</b> magnets per sheet ({layout.cols} × {layout.rows})
          {layout.overflow && <div>⚠ Grid is bigger than the printable area!</div>}
          {layout.perPage === 0 && <div>⚠ The magnet is bigger than the sheet.</div>}
        </div>
      </Section>

      <Section title="Spacing between magnets" right={<Toggle label="Link" checked={linkGap} onChange={setLinkGap} />}>
        {linkGap ? (
          <UnitInput label="Gap" unit={unit} valueMM={grid.gapX} onChange={(v) => patch('grid', { gapX: v, gapY: v })} />
        ) : (
          <div className="grid-2">
            <UnitInput label="Horizontal gap" unit={unit} valueMM={grid.gapX} onChange={(v) => patch('grid', { gapX: v })} />
            <UnitInput label="Vertical gap" unit={unit} valueMM={grid.gapY} onChange={(v) => patch('grid', { gapY: v })} />
          </div>
        )}
        <button
          className="btn ghost block"
          onClick={() => {
            setLinkGap(false);
            update((p) => ({ ...p, grid: { ...p.grid, ...gapToFillPage(p) } }));
          }}
        >
          Spread evenly across sheet
        </button>
        <Toggle label="Center grid on sheet" checked={grid.center} onChange={(v) => patch('grid', { center: v })} />
        <p className="hint">
          Unused space: {displayValue(Math.max(0, layout.freeW), unit)} × {displayValue(Math.max(0, layout.freeH), unit)} {unit}
        </p>
      </Section>
    </>
  );
}

function MarksTab({ project, patch, unit }) {
  const { marks } = project;
  return (
    <>
      <Section title="Crop / cut marks">
        <Toggle label="Print crop marks around grid" checked={marks.cutMarks} onChange={(v) => patch('marks', { cutMarks: v })} />
        {marks.cutMarks && (
          <div className="grid-2">
            <UnitInput label="Length" unit={unit} valueMM={marks.markLength} onChange={(v) => patch('marks', { markLength: v })} />
            <UnitInput label="Offset" unit={unit} valueMM={marks.markOffset} onChange={(v) => patch('marks', { markOffset: v })} />
          </div>
        )}
      </Section>
      <Section title="Cut line on each magnet">
        <Toggle label="Print cut outline" checked={marks.outline} onChange={(v) => patch('marks', { outline: v })} />
        {marks.outline && (
          <>
            <ColorInput label="Line colour" value={marks.outlineColor} onChange={(v) => patch('marks', { outlineColor: v })} />
            <UnitInput label="Line width" unit={unit} valueMM={marks.outlineWidth} onChange={(v) => patch('marks', { outlineWidth: v })} />
          </>
        )}
      </Section>
      <Section title="Screen guides (not printed)">
        <Toggle label="Show margin guide" checked={marks.showMargins} onChange={(v) => patch('marks', { showMargins: v })} />
        <Toggle label="Show safe area" checked={marks.safeArea} onChange={(v) => patch('marks', { safeArea: v })} />
        {marks.safeArea && (
          <UnitInput label="Safe margin inside cut" unit={unit} valueMM={marks.safeMargin} onChange={(v) => patch('marks', { safeMargin: v })} />
        )}
        <p className="hint">Keep faces and text inside the safe area so they don't get cut off.</p>
      </Section>
    </>
  );
}

function ShapeIcon({ shape }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 };
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      {shape === 'rect' && <rect x="3" y="4" width="18" height="16" {...common} />}
      {shape === 'rounded' && <rect x="3" y="4" width="18" height="16" rx="4" {...common} />}
      {shape === 'circle' && <circle cx="12" cy="12" r="9" {...common} />}
      {shape === 'heart' && <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" {...common} />}
      {shape === 'hexagon' && <polygon points="7,3 17,3 22,12 17,21 7,21 2,12" {...common} />}
      {shape === 'star' && <polygon points="12,2 14.8,9 22,9 16.2,13.6 18.4,21 12,16.5 5.6,21 7.8,13.6 2,9 9.2,9" {...common} />}
    </svg>
  );
}
