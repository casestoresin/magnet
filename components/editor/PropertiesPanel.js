'use client';

import { UnitInput, NumberInput, Slider, ColorInput, Select, Toggle, Section } from '@/components/ui/Inputs';
import { imageArea, placeImage, qualityLabel } from '@/lib/layout';
import { thumbUrl } from '@/lib/image-url';
import { FONTS } from '@/lib/presets';
import { formatSize } from '@/lib/units';

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready to print' },
  { value: 'printed', label: 'Printed' },
  { value: 'delivered', label: 'Delivered' },
];

export default function PropertiesPanel({ project, selection, layout, totalPages, filledCount, actions }) {
  const unit = project.unit;
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
            <li>
              <span>Per sheet</span>
              <b>
                {layout.perPage} ({layout.cols}×{layout.rows})
              </b>
            </li>
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
      </aside>
    );
  }

  const set = (obj) => actions.patchSlots(selection, obj);
  const place = placeImage(first, imageArea(project.frame));
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

      <Section title="Fit & position">
        <div className="seg">
          <button className={first.fit !== 'contain' ? 'active' : ''} onClick={() => set({ fit: 'cover' })}>
            Fill (crop)
          </button>
          <button className={first.fit === 'contain' ? 'active' : ''} onClick={() => set({ fit: 'contain' })}>
            Fit whole photo
          </button>
        </div>
        <Slider label="Zoom" min={0.2} max={5} step={0.01} value={first.zoom ?? 1} onChange={(v) => set({ zoom: v })} format={(v) => `${Math.round(v * 100)}%`} />
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

      <Section title="Text / caption">
        <input className="input" placeholder="e.g. Goa 2026 ❤" value={first.text || ''} onChange={(e) => set({ text: e.target.value })} />
        {first.text && (
          <>
            <div className="grid-2">
              <NumberInput label="Size" suffix="pt" min={4} max={120} value={first.textSize ?? 12} onChange={(v) => set({ textSize: v })} />
              <UnitInput label="From bottom" unit={unit} min={null} valueMM={first.textY ?? 5} onChange={(v) => set({ textY: v })} />
            </div>
            <Select label="Font" value={first.textFont || FONTS[0]} onChange={(v) => set({ textFont: v })} options={FONTS.map((f) => ({ value: f, label: f.split(',')[0].replace(/"/g, '') }))} />
            <ColorInput label="Colour" value={first.textColor || '#ffffff'} onChange={(v) => set({ textColor: v })} />
            <Toggle label="Bold" checked={first.textBold} onChange={(v) => set({ textBold: v })} />
            <Toggle label="Outline / shadow" checked={first.textShadow} onChange={(v) => set({ textShadow: v })} />
          </>
        )}
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
