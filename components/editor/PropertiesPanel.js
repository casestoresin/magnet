'use client';

import { useState } from 'react';
import { UnitInput, NumberInput, Slider, ColorInput, Select, Toggle, Section } from '@/components/ui/Inputs';
import { imageArea, placeImage, qualityLabel } from '@/lib/layout';
import { thumbUrl } from '@/lib/image-url';
import { SHAPES } from '@/lib/presets';
import TextPanel from './TextPanel';
import { formatSize } from '@/lib/units';

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready to print' },
  { value: 'printed', label: 'Printed' },
  { value: 'delivered', label: 'Delivered' },
];

function CustomSize({ first, place, area, unit, set, lock, setLock }) {
  const w = first.imgW || place.visW;
  const h = first.imgH || place.visH;
  const ratio = place.aspect; // photo's real width / height (after rotation)

  return (
    <>
      <div className="size-row">
        <UnitInput label="Photo width" unit={unit} min={1} valueMM={w} onChange={(v) => set(lock ? { imgW: v, imgH: v / ratio } : { imgW: v })} />
        <button className={`lock-btn ${lock ? 'on' : ''}`} onClick={() => setLock(!lock)} title={lock ? 'Ratio locked (no stretching)' : 'Ratio unlocked (free stretch)'}>
          {lock ? '🔒' : '🔓'}
        </button>
        <UnitInput label="Photo height" unit={unit} min={1} valueMM={h} onChange={(v) => set(lock ? { imgH: v, imgW: v * ratio } : { imgH: v })} />
      </div>
      <div className="btn-row">
        <button className="btn ghost" onClick={() => set({ imgW: area.w, imgH: area.w / ratio, ox: 0, oy: 0 })} title="Photo width = frame width, height keeps the real ratio">
          ↔ Match width
        </button>
        <button className="btn ghost" onClick={() => set({ imgH: area.h, imgW: area.h * ratio, ox: 0, oy: 0 })} title="Photo height = frame height, width keeps the real ratio">
          ↕ Match height
        </button>
        <button className="btn ghost" onClick={() => set({ imgW: area.w, imgH: area.h, ox: 0, oy: 0 })} title="Exactly the frame size (may stretch)">
          ⤢ Match frame
        </button>
        <button className="btn ghost" onClick={() => set({ imgH: w / ratio })} title="Fix stretching — restore the real photo shape">
          ↺ Real ratio
        </button>
      </div>
    </>
  );
}

// Free layout: edit the frame(s) themselves
function FrameEditor({ project, selection, actions, unit }) {
  const items = selection.map((i) => project.items?.[i]).filter(Boolean);
  if (!items.length) return null;
  const f = items[0].frame;
  const setF = (obj) => actions.patchFrames(selection, obj);
  return (
    <Section title={items.length > 1 ? `${items.length} frames` : 'Frame'}>
      <div className="grid-2">
        <UnitInput label="Frame width" unit={unit} min={5} valueMM={f.width} onChange={(v) => setF({ width: v })} />
        <UnitInput label="Frame height" unit={unit} min={5} valueMM={f.height} onChange={(v) => setF({ height: v })} />
      </div>
      <button className="btn ghost block" onClick={() => actions.rotateFrames(selection)} title="Swap width and height">
        ⟳ Turn frame 90° ({f.width >= f.height ? 'make vertical ▯' : 'make horizontal ▭'})
      </button>
      <Select label="Shape" value={f.shape} onChange={(v) => setF({ shape: v })} options={SHAPES.map((s) => ({ value: s.id, label: s.name }))} />
      {f.shape === 'rounded' && <UnitInput label="Corner radius" unit={unit} valueMM={f.radius || 0} onChange={(v) => setF({ radius: v })} />}
      <UnitInput label="Bleed" unit={unit} valueMM={f.bleed} onChange={(v) => setF({ bleed: v })} />
      <button className="btn danger block" onClick={() => actions.deleteFrames(selection)}>
        🗑 Delete frame{items.length > 1 ? 's' : ''}
      </button>
    </Section>
  );
}

export default function PropertiesPanel({ project, selection, layout, totalPages, filledCount, actions, activeLayer, setActiveLayer, photos }) {
  const [lockRatio, setLockRatio] = useState(false);
  const unit = project.unit;
  const isFree = project.layoutMode === 'free';
  const filled = selection.map((i) => project.slots[i]).filter((s) => s && s.url);
  const first = filled[0];

  if (!selection.length) {
    return (
      <aside className="right-panel no-print">
        <Section title="Order details">
          <label className="field">
            <span className="field-label">Customer name</span>
            <input className="input" value={project.customer || ''} onChange={(e) => actions.patchRoot({ customer: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Phone</span>
            <input className="input" value={project.phone || ''} onChange={(e) => actions.patchRoot({ phone: e.target.value })} />
          </label>
          <Select label="Status" value={project.status || 'draft'} onChange={(v) => actions.patchRoot({ status: v })} options={STATUSES} />
          <label className="field">
            <span className="field-label">Notes</span>
            <textarea className="input" rows={3} value={project.notes || ''} onChange={(e) => actions.patchRoot({ notes: e.target.value })} />
          </label>
        </Section>
        <Section title="Summary">
          <ul className="summary">
            <li>
              <span>Sheet</span>
              <b>{formatSize(project.page.width, project.page.height, unit)}</b>
            </li>
            <li>
              <span>Magnet (cut size)</span>
              <b>{formatSize(project.frame.width, project.frame.height, unit)}</b>
            </li>
            <li>
              <span>With bleed</span>
              <b>{formatSize(layout.cellW, layout.cellH, unit)}</b>
            </li>
            {isFree ? (
              <li>
                <span>Frames (free layout)</span>
                <b>{(project.items || []).length}</b>
              </li>
            ) : (
              <li>
                <span>Per sheet</span>
                <b>
                  {layout.perPage} ({layout.cols}×{layout.rows})
                </b>
              </li>
            )}
            <li>
              <span>Filled magnets</span>
              <b>{filledCount}</b>
            </li>
            <li>
              <span>Sheets</span>
              <b>{totalPages}</b>
            </li>
          </ul>
        </Section>
        <Section title="Shortcuts">
          <ul className="shortcuts">
            <li><kbd>Click</kbd> select · <kbd>Shift</kbd>+click multi-select</li>
            <li><kbd>Drag</kbd> inside a photo to reposition</li>
            <li><kbd>Ctrl</kbd>+<kbd>scroll</kbd> zoom canvas</li>
            <li><kbd>Arrows</kbd> nudge photo · <kbd>Del</kbd> remove</li>
            <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Y</kbd> undo / redo</li>
            <li><kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>V</kbd> copy / paste magnet</li>
            <li><kbd>Ctrl</kbd>+<kbd>A</kbd> select all · <kbd>Ctrl</kbd>+<kbd>P</kbd> print</li>
          </ul>
        </Section>
      </aside>
    );
  }

  if (!first) {
    return (
      <aside className="right-panel no-print">
        <Section title={`${selection.length} empty magnet(s) selected`}>
          <p className="hint">Click a photo in the library, or drag one onto the magnet, to fill it.</p>
          <button className="btn ghost block" onClick={actions.deselect}>
            Deselect
          </button>
        </Section>
        {isFree && <FrameEditor project={project} selection={selection} actions={actions} unit={unit} />}
      </aside>
    );
  }

  const set = (obj) => actions.patchSlots(selection, obj);
  const firstIndex = selection.find((i) => project.slots[i] && project.slots[i].url);
  const area = imageArea(isFree && project.items?.[firstIndex] ? project.items[firstIndex].frame : project.frame);
  const place = placeImage(first, area);
  const q = qualityLabel(place?.dpi);

  return (
    <aside className="right-panel no-print">
      <Section title={filled.length > 1 ? `${filled.length} magnets selected` : 'Magnet'}>
        <div className="prop-photo">
          <img src={thumbUrl(first.url)} alt="" />
          <div>
            <b title={first.name}>{first.name || 'Photo'}</b>
            <small>
              {first.w}×{first.h}px
            </small>
            <span className={`quality ${q.level}`}>{q.label}</span>
          </div>
        </div>
      </Section>

      <TextPanel
        slot={first}
        index={firstIndex}
        frame={isFree && project.items?.[firstIndex] ? project.items[firstIndex].frame : project.frame}
        unit={unit}
        actions={actions}
        activeLayer={activeLayer}
        setActiveLayer={setActiveLayer}
        photos={photos || []}
      />

      {isFree && <FrameEditor project={project} selection={selection} actions={actions} unit={unit} />}

      <Section title="Fit & position">
        <div className="seg seg-4">
          <button className={!['contain', 'stretch', 'custom'].includes(first.fit) ? 'active' : ''} onClick={() => set({ fit: 'cover', zoom: 1 })} title="Fills the frame, extra parts get cropped">
            Fill
          </button>
          <button className={first.fit === 'contain' ? 'active' : ''} onClick={() => set({ fit: 'contain', zoom: 1 })} title="Whole photo visible, may leave empty space">
            Fit
          </button>
          <button className={first.fit === 'stretch' ? 'active' : ''} onClick={() => set({ fit: 'stretch', zoom: 1, ox: 0, oy: 0 })} title="Stretch to exactly the frame — nothing cut, no empty space">
            Stretch
          </button>
          <button
            className={first.fit === 'custom' ? 'active' : ''}
            onClick={() => first.fit !== 'custom' && set({ fit: 'custom', imgW: place.visW, imgH: place.visH, zoom: 1 })}
            title="Set photo width & height yourself"
          >
            Custom
          </button>
        </div>
        <p className="hint fit-hint">
          {first.fit === 'contain'
            ? 'Whole photo shows; empty area uses the background colour.'
            : first.fit === 'stretch'
            ? 'Photo is stretched to exactly fill the frame — nothing is cut.'
            : first.fit === 'custom'
            ? 'Type the photo width & height. Unlock the ratio to stretch it in one direction only.'
            : 'Photo fills the frame; extra parts are cropped. Drag on the photo to choose what shows.'}
        </p>

        {first.fit === 'custom' ? (
          <CustomSize first={first} place={place} area={area} unit={unit} set={set} lock={lockRatio} setLock={setLockRatio} />
        ) : (
          first.fit !== 'stretch' && (
            <Slider label="Zoom" min={0.2} max={5} step={0.01} value={first.zoom ?? 1} onChange={(v) => set({ zoom: v })} format={(v) => `${Math.round(v * 100)}%`} />
          )
        )}
        {place && Math.abs(place.distortion - 1) > 0.02 && (
          <div className="alert warn sm">
            Photo is {place.distortion > 1 ? 'stretched wider' : 'stretched taller'} by {Math.round(Math.abs(place.distortion - 1) * 100)}% — faces may look
            {place.distortion > 1 ? ' wider' : ' thinner'}.
          </div>
        )}
        <div className="grid-2">
          <UnitInput label="Move X" unit={unit} min={null} valueMM={first.ox || 0} onChange={(v) => set({ ox: v })} />
          <UnitInput label="Move Y" unit={unit} min={null} valueMM={first.oy || 0} onChange={(v) => set({ oy: v })} />
        </div>
        <button className="btn ghost block" onClick={() => set({ ox: 0, oy: 0, zoom: 1 })}>
          ⊕ Reset position & zoom
        </button>
      </Section>

      <Section title="Rotate & flip">
        <div className="btn-row">
          <button className="btn ghost" onClick={() => set({ rotate: (((first.rotate || 0) - 90 + 540) % 360) - 180 })} title="Rotate left">
            ⟲ 90°
          </button>
          <button className="btn ghost" onClick={() => set({ rotate: (((first.rotate || 0) + 90 + 540) % 360) - 180 })} title="Rotate right">
            ⟳ 90°
          </button>
          <button className={`btn ghost ${first.flipX ? 'on' : ''}`} onClick={() => set({ flipX: !first.flipX })}>
            ⇋ Flip H
          </button>
          <button className={`btn ghost ${first.flipY ? 'on' : ''}`} onClick={() => set({ flipY: !first.flipY })}>
            ⇵ Flip V
          </button>
        </div>
        <Slider label="Angle" min={-180} max={180} step={1} value={first.rotate || 0} onChange={(v) => set({ rotate: v })} format={(v) => `${v}°`} />
      </Section>

      <Section title="Adjust" right={<button className="link" onClick={() => set({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0 })}>Reset</button>}>
        <Slider label="Brightness" min={30} max={200} value={first.brightness ?? 100} onChange={(v) => set({ brightness: v })} format={(v) => `${v}%`} />
        <Slider label="Contrast" min={30} max={200} value={first.contrast ?? 100} onChange={(v) => set({ contrast: v })} format={(v) => `${v}%`} />
        <Slider label="Saturation" min={0} max={250} value={first.saturate ?? 100} onChange={(v) => set({ saturate: v })} format={(v) => `${v}%`} />
        <Slider label="Black & white" min={0} max={100} value={first.grayscale ?? 0} onChange={(v) => set({ grayscale: v })} format={(v) => `${v}%`} />
        <Slider label="Sepia / vintage" min={0} max={100} value={first.sepia ?? 0} onChange={(v) => set({ sepia: v })} format={(v) => `${v}%`} />
        <ColorInput label="Background (empty area)" value={first.bg || '#ffffff'} onChange={(v) => set({ bg: v })} />
      </Section>

      <Section title="Actions">
        <div className="btn-col">
          <button className="btn ghost block" onClick={() => actions.fillEmptyWith(selection[0])}>Copy into all empty magnets</button>
          <button className="btn ghost block" onClick={() => actions.fillPageWith(selection[0])}>Fill this whole sheet with it</button>
          <button className="btn ghost block" onClick={() => actions.applyStyleToAll(selection[0])}>Apply style (zoom, filters, text) to all</button>
          <button className="btn danger block" onClick={() => actions.clearSlots(selection)}>Remove photo{selection.length > 1 ? 's' : ''}</button>
        </div>
      </Section>
    </aside>
  );
}
