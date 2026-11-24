'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Sheet from './Sheet';
import LeftPanel from './LeftPanel';
import PropertiesPanel from './PropertiesPanel';
import { usePhotos } from '@/components/PhotoLibrary';
import { api, logout } from '@/lib/api';
import { computeLayout, pagesNeeded } from '@/lib/layout';
import { DEFAULT_SLOT, defaultProject } from '@/lib/presets';
import { UNITS, UNIT_LABELS, MM_PER_PX, PX_PER_MM } from '@/lib/units';

const STYLE_KEYS = ['fit', 'brightness', 'contrast', 'saturate', 'grayscale', 'sepia', 'bg', 'text', 'textColor', 'textSize', 'textY', 'textFont', 'textBold', 'textShadow'];
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o && k in o).map((k) => [k, o[k]]));

function slotFromPhoto(photo, old) {
  return {
    ...DEFAULT_SLOT,
    ...(old ? pick(old, STYLE_KEYS) : {}),
    photoId: photo._id,
    url: photo.url,
    w: photo.width,
    h: photo.height,
    name: photo.name,
  };
}

function normalize(p) {
  const base = defaultProject();
  return {
    ...base,
    ...p,
    page: { ...base.page, ...(p.page || {}) },
    frame: { ...base.frame, ...(p.frame || {}) },
    grid: { ...base.grid, ...(p.grid || {}) },
    marks: { ...base.marks, ...(p.marks || {}) },
    slots: p.slots || [],
  };
}

export default function Editor({ id }) {
  const [project, setProject] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selection, setSelection] = useState([]);
  const [zoom, setZoom] = useState(0.6);
  const [saveState, setSaveState] = useState('saved');
  const [printOpen, setPrintOpen] = useState(false);
  const [printOpts, setPrintOpts] = useState({ skipEmpty: true, from: 1, to: 999 });
  const [calibration, setCalibration] = useState(false);
  const [toast, setToast] = useState('');

  const lib = usePhotos();
  const projectRef = useRef(null);
  const zoomRef = useRef(zoom);
  const past = useRef([]);
  const future = useRef([]);
  const lastMerge = useRef({ key: null, t: 0 });
  const clipboard = useRef(null);
  const wrapRef = useRef(null);
  const loaded = useRef(false);
  const saveTimer = useRef(null);
  const [, forceRender] = useState(0);

  zoomRef.current = zoom;

  // ---------- load ----------
  useEffect(() => {
    api
      .getProject(id)
      .then(({ project }) => {
        const p = normalize(project);
        projectRef.current = p;
        setProject(p);
        requestAnimationFrame(() => fitToScreen(p));
      })
      .catch((e) => setLoadError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------- state + history ----------
  const update = useCallback((fn, { record = true, mergeKey = null } = {}) => {
    const prev = projectRef.current;
    if (!prev) return;
    const next = typeof fn === 'function' ? fn(prev) : { ...prev, ...fn };
    if (next === prev) return;
    const now = Date.now();
    const merging = mergeKey && lastMerge.current.key === mergeKey && now - lastMerge.current.t < 1000;
    if (record && !merging) {
      past.current.push(prev);
      if (past.current.length > 100) past.current.shift();
      future.current = [];
    }
    lastMerge.current = { key: mergeKey, t: now };
    projectRef.current = next;
    setProject(next);
  }, []);

  const patch = useCallback(
    (section, obj) => update((p) => ({ ...p, [section]: { ...p[section], ...obj } }), { mergeKey: `${section}:${Object.keys(obj).join(',')}` }),
    [update]
  );
  const patchRoot = useCallback((obj) => update((p) => ({ ...p, ...obj }), { mergeKey: `root:${Object.keys(obj).join(',')}` }), [update]);

  const undo = useCallback(() => {
    if (!past.current.length) return;
    future.current.push(projectRef.current);
    const prev = past.current.pop();
    projectRef.current = prev;
    lastMerge.current = { key: null, t: 0 };
    setProject(prev);
  }, []);
  const redo = useCallback(() => {
    if (!future.current.length) return;
    past.current.push(projectRef.current);
    const next = future.current.pop();
    projectRef.current = next;
    lastMerge.current = { key: null, t: 0 };
    setProject(next);
  }, []);

  // ---------- autosave ----------
  const save = useCallback(async () => {
    const p = projectRef.current;
    if (!p) return;
    setSaveState('saving');
    try {
      const slots = [...p.slots];
      while (slots.length && !(slots[slots.length - 1] && slots[slots.length - 1].url)) slots.pop();
      const { _id, createdAt, updatedAt, __v, ...body } = p;
      await api.saveProject(id, { ...body, slots });
      if (projectRef.current === p) setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      setToast(`Save failed: ${e.message}`);
    }
  }, [id]);

  useEffect(() => {
    if (!project) return;
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    setSaveState('unsaved');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 800);
  }, [project, save]);

  useEffect(() => {
    const h = (e) => {
      if (saveState !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [saveState]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ---------- derived ----------
  const layout = useMemo(() => (project ? computeLayout(project) : null), [project]);
  const totalPages = project && layout ? pagesNeeded(project, layout.perPage) : 1;
  const filledCount = project ? project.slots.filter((s) => s && s.url).length : 0;
  const usage = useMemo(() => {
    const u = {};
    project?.slots.forEach((s) => {
      if (s && s.photoId) u[s.photoId] = (u[s.photoId] || 0) + 1;
    });
    return u;
  }, [project]);

  // ---------- zoom ----------
  const fitToScreen = useCallback((p = projectRef.current) => {
    const el = wrapRef.current;
    if (!el || !p) return;
    const w = el.clientWidth - 80;
    const h = el.clientHeight - 90;
    const z = Math.min(w / (p.page.width * PX_PER_MM), h / (p.page.height * PX_PER_MM));
    setZoom(Math.max(0.1, Math.min(3, Math.round(z * 100) / 100)));
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => Math.max(0.1, Math.min(4, Math.round(z * (e.deltaY < 0 ? 1.1 : 0.9) * 100) / 100)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [project === null]); // attach once canvas exists

  // ---------- slot helpers ----------
  const setSlots = useCallback(
    (fn, opts) =>
      update((p) => {
        const slots = [...p.slots];
        fn(slots, p);
        const lay = computeLayout(p);
        const next = { ...p, slots };
        return { ...next, pageCount: pagesNeeded(next, lay.perPage) };
      }, opts),
    [update]
  );

  const patchSlots = useCallback(
    (indices, obj) =>
      setSlots(
        (slots) => {
          indices.forEach((i) => {
            if (slots[i] && slots[i].url) slots[i] = { ...slots[i], ...obj };
          });
        },
        { mergeKey: `slots:${indices.join(',')}:${Object.keys(obj).join(',')}` }
      ),
    [setSlots]
  );

  const clearSlots = useCallback(
    (indices) =>
      setSlots((slots) => {
        indices.forEach((i) => (slots[i] = null));
      }),
    [setSlots]
  );

  const placePhoto = useCallback(
    (index, photo) =>
      setSlots((slots) => {
        slots[index] = slotFromPhoto(photo, slots[index]);
      }),
    [setSlots]
  );

  const firstEmpty = (slots, from = 0) => {
    let i = from;
    while (slots[i] && slots[i].url) i++;
    return i;
  };

  const onPhotoClick = useCallback(
    (photo) => {
      const sel = selection;
      if (sel.length) {
        setSlots((slots) => sel.forEach((i) => (slots[i] = slotFromPhoto(photo, slots[i]))));
      } else {
        const i = firstEmpty(projectRef.current.slots);
        placePhoto(i, photo);
        setSelection([i]);
      }
    },
    [selection, setSlots, placePhoto]
  );

  const onAutoFill = useCallback(
    (photos, { copies = 1, overwrite = false, fromSelected = false }) => {
      const queue = photos.flatMap((p) => Array.from({ length: copies }, () => p));
      let start = fromSelected && selection.length ? Math.min(...selection) : 0;
      setSlots((slots) => {
        let i = start;
        for (const photo of queue) {
          if (!overwrite) i = firstEmpty(slots, i);
          slots[i] = slotFromPhoto(photo, slots[i]);
          i++;
        }
      });
      setToast(`Placed ${queue.length} magnet(s)`);
    },
    [selection, setSlots]
  );

  const perPage = layout?.perPage || 0;

  const actions = useMemo(
    () => ({
      patchRoot,
      patchSlots,
      clearSlots,
      deselect: () => setSelection([]),
      fillEmptyWith: (index) =>
        setSlots((slots, p) => {
          const src = slots[index];
          const total = pagesNeeded(p, perPage) * perPage;
          for (let i = 0; i < total; i++) if (!(slots[i] && slots[i].url)) slots[i] = { ...src };
        }),
      fillPageWith: (index) =>
        setSlots((slots) => {
          const src = slots[index];
          const start = Math.floor(index / perPage) * perPage;
          for (let i = start; i < start + perPage; i++) slots[i] = { ...src };
        }),
      applyStyleToAll: (index) =>
        setSlots((slots) => {
          const style = pick(slots[index], [...STYLE_KEYS, 'zoom']);
          for (let i = 0; i < slots.length; i++) if (slots[i] && slots[i].url) slots[i] = { ...slots[i], ...style };
        }),
    }),
    [patchRoot, patchSlots, clearSlots, setSlots, perPage]
  );

  // ---------- pages ----------
  const addPage = () => update((p) => ({ ...p, pageCount: totalPages + 1 }));
  const deletePage = (pi) => {
    if (totalPages <= 1) return clearPage(pi);
    if (!confirm(`Delete sheet ${pi + 1}?`)) return;
    update((p) => {
      const slots = [...p.slots];
      slots.splice(pi * perPage, perPage);
      return { ...p, slots, pageCount: totalPages - 1 };
    });
    setSelection([]);
  };
  const duplicatePage = (pi) =>
    update((p) => {
      const slots = [...p.slots];
      while (slots.length < (pi + 1) * perPage) slots.push(null);
      const copy = slots.slice(pi * perPage, (pi + 1) * perPage).map((s) => (s ? { ...s } : null));
      slots.splice((pi + 1) * perPage, 0, ...copy);
      return { ...p, slots, pageCount: totalPages + 1 };
    });
  const clearPage = (pi) =>
    setSlots((slots) => {
      for (let i = pi * perPage; i < (pi + 1) * perPage; i++) slots[i] = null;
    });
  const selectPage = (pi) => setSelection(Array.from({ length: perPage }, (_, i) => pi * perPage + i));

  // ---------- pointer: select + drag to pan ----------
  const drag = useRef(null);
  const onCellPointerDown = useCallback(
    (e, index) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const multi = e.shiftKey || e.metaKey || e.ctrlKey;
      setSelection((sel) => (multi ? (sel.includes(index) ? sel.filter((i) => i !== index) : [...sel, index]) : [index]));
      const slot = projectRef.current.slots[index];
      if (multi || !slot || !slot.url) return;

      drag.current = { index, sx: e.clientX, sy: e.clientY, ox: slot.ox || 0, oy: slot.oy || 0, moved: false };
      const move = (ev) => {
        const d = drag.current;
        if (!d) return;
        const pxX = ev.clientX - d.sx;
        const pxY = ev.clientY - d.sy;
        if (!d.moved && Math.hypot(pxX, pxY) < 3) return;
        const k = MM_PER_PX / zoomRef.current;
        const ox = d.ox + pxX * k;
        const oy = d.oy + pxY * k;
        update(
          (p) => {
            const slots = [...p.slots];
            slots[d.index] = { ...slots[d.index], ox, oy };
            return { ...p, slots };
          },
          { record: !d.moved }
        );
        d.moved = true;
        document.body.classList.add('panning');
      };
      const up = () => {
        drag.current = null;
        document.body.classList.remove('panning');
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [update]
  );

  const onDropPhoto = useCallback((index, photo) => {
    placePhoto(index, photo);
    setSelection([index]);
  }, [placePhoto]);

  const onCellDoubleClick = useCallback(
    (index) => {
      const s = projectRef.current.slots[index];
      if (s && s.url) patchSlots([index], { ox: 0, oy: 0, zoom: 1 });
    },
    [patchSlots]
  );

  // ---------- print ----------
  const doPrint = (calib = false) => {
    setCalibration(calib);
    setPrintOpen(false);
    setSelection([]);
    setTimeout(() => {
      window.print();
      setCalibration(false);
    }, 300);
  };

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      if (mod && k === 'p') {
        e.preventDefault();
        setPrintOpen(true);
        return;
      }
      if (mod && k === 's') {
        e.preventDefault();
        save();
        return;
      }
      if (typing) return;
      if (mod && k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (mod && k === 'a') {
        e.preventDefault();
        setSelection(Array.from({ length: totalPages * perPage }, (_, i) => i));
      } else if (mod && k === 'c' && selection.length) {
        const s = projectRef.current.slots[selection[0]];
        if (s && s.url) {
          clipboard.current = { ...s };
          setToast('Magnet copied');
        }
      } else if (mod && k === 'v' && clipboard.current && selection.length) {
        e.preventDefault();
        const src = clipboard.current;
        setSlots((slots) => selection.forEach((i) => (slots[i] = { ...src })));
      } else if ((k === 'delete' || k === 'backspace') && selection.length) {
        e.preventDefault();
        clearSlots(selection);
      } else if (k === 'escape') {
        setSelection([]);
        setPrintOpen(false);
      } else if (k.startsWith('arrow') && selection.length) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 0.5;
        const dx = k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0;
        const dy = k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0;
        setSlots(
          (slots) =>
            selection.forEach((i) => {
              if (slots[i] && slots[i].url) slots[i] = { ...slots[i], ox: (slots[i].ox || 0) + dx, oy: (slots[i].oy || 0) + dy };
            }),
          { mergeKey: `nudge:${selection.join(',')}` }
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, undo, redo, save, clearSlots, setSlots, totalPages, perPage]);

  // ---------- render ----------
  if (loadError)
    return (
      <div className="center-msg">
        <h2>Could not open project</h2>
        <p>{loadError}</p>
        <Link className="btn primary" href="/">
          Back to dashboard
        </Link>
      </div>
    );
  if (!project || !layout) return <div className="center-msg">Loading editor…</div>;

  const pageHasPhotos = (pi) => {
    for (let i = pi * perPage; i < (pi + 1) * perPage; i++) if (project.slots[i] && project.slots[i].url) return true;
    return false;
  };
  const printable = (pi) => pi + 1 >= printOpts.from && pi + 1 <= printOpts.to && (!printOpts.skipEmpty || pageHasPhotos(pi));
  const printCount = Array.from({ length: totalPages }, (_, i) => i).filter(printable).length;

  return (
    <div className={`editor ${calibration ? 'print-calibration' : ''}`}>
      <style>{`@page { size: ${project.page.width}mm ${project.page.height}mm; margin: 0; }`}</style>

      <header className="toolbar no-print">
        <Link href="/" className="brand-sm" title="Back to dashboard">
          ← 🧲
        </Link>
        <input className="title-input" value={project.name} onChange={(e) => patchRoot({ name: e.target.value })} />
        <span className={`save-state ${saveState}`}>
          {saveState === 'saved' ? '✓ Saved' : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? '⚠ Not saved' : '● Unsaved'}
        </span>
        <div className="toolbar-group">
          <button className="icon-btn" onClick={undo} disabled={!past.current.length} title="Undo (Ctrl+Z)">
            ↶
          </button>
          <button className="icon-btn" onClick={redo} disabled={!future.current.length} title="Redo (Ctrl+Y)">
            ↷
          </button>
        </div>
        <div className="toolbar-group">
          <label className="unit-select" title="Measurement unit used everywhere">
            Unit
            <select value={project.unit} onChange={(e) => patchRoot({ unit: e.target.value })}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="toolbar-group">
          <button className="icon-btn" onClick={() => setZoom((z) => Math.max(0.1, Math.round((z - 0.1) * 100) / 100))}>
            −
          </button>
          <button className="zoom-label" onClick={() => fitToScreen()} title="Fit to screen">
            {Math.round(zoom * 100)}%
          </button>
          <button className="icon-btn" onClick={() => setZoom((z) => Math.min(4, Math.round((z + 0.1) * 100) / 100))}>
            +
          </button>
          <button className="btn ghost sm" onClick={() => setZoom(1)} title="Real size on a 96 DPI screen">
            100%
          </button>
        </div>
        <div className="spacer" />
        <span className="muted sm">
          {filledCount} magnets · {totalPages} sheet{totalPages > 1 ? 's' : ''}
        </span>
        <button className="btn primary" onClick={() => setPrintOpen(true)}>
          🖨 Print
        </button>
        <button className="btn ghost sm" onClick={logout} title="Logout">
          Logout
        </button>
      </header>

      <div className="editor-body">
        <LeftPanel
          project={project}
          patch={patch}
          update={update}
          layout={layout}
          lib={lib}
          usage={usage}
          onPhotoClick={onPhotoClick}
          onAutoFill={onAutoFill}
          hasSelection={selection.length > 0}
        />

        <main className="canvas-wrap" ref={wrapRef} onPointerDown={(e) => e.target === e.currentTarget && setSelection([])}>
          {layout.perPage === 0 && (
            <div className="alert error no-print">The magnet size (with bleed) is bigger than the printable area. Make the magnet smaller or the margins smaller.</div>
          )}
          {layout.overflow && <div className="alert warn no-print">The grid is bigger than the printable area — some magnets fall outside the margins.</div>}

          {Array.from({ length: totalPages }, (_, pi) => (
            <div key={pi} className={`sheet-block ${printable(pi) ? '' : 'skip-print'}`} onPointerDown={(e) => e.target === e.currentTarget && setSelection([])}>
              <div className="sheet-head no-print" style={{ width: `${project.page.width * PX_PER_MM * zoom}px` }}>
                <span>
                  Sheet {pi + 1} / {totalPages}
                </span>
                <div className="sheet-actions">
                  <button onClick={() => selectPage(pi)} title="Select all magnets on this sheet">Select all</button>
                  <button onClick={() => duplicatePage(pi)} title="Duplicate sheet">Duplicate</button>
                  <button onClick={() => clearPage(pi)} title="Remove all photos from this sheet">Clear</button>
                  <button onClick={() => deletePage(pi)} title="Delete sheet">Delete</button>
                </div>
              </div>
              <Sheet
                project={project}
                layout={layout}
                pageIndex={pi}
                zoom={zoom}
                selection={selection}
                onCellPointerDown={onCellPointerDown}
                onDropPhoto={onDropPhoto}
                onCellDoubleClick={onCellDoubleClick}
              />
            </div>
          ))}

          <button className="add-page no-print" onClick={addPage}>
            + Add sheet
          </button>

          <CalibrationPage page={project.page} />
        </main>

        <PropertiesPanel project={project} selection={selection} layout={layout} totalPages={totalPages} filledCount={filledCount} actions={actions} />
      </div>

      {printOpen && (
        <div className="modal-backdrop no-print" onPointerDown={(e) => e.target === e.currentTarget && setPrintOpen(false)}>
          <div className="modal">
            <h3>Print magnet sheets</h3>
            <div className="grid-2">
              <label className="field">
                <span className="field-label">From sheet</span>
                <input className="input" type="number" min={1} max={totalPages} value={printOpts.from} onChange={(e) => setPrintOpts((o) => ({ ...o, from: Math.max(1, +e.target.value || 1) }))} />
              </label>
              <label className="field">
                <span className="field-label">To sheet</span>
                <input className="input" type="number" min={1} value={Math.min(printOpts.to, totalPages)} onChange={(e) => setPrintOpts((o) => ({ ...o, to: Math.max(1, +e.target.value || 1) }))} />
              </label>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={printOpts.skipEmpty} onChange={(e) => setPrintOpts((o) => ({ ...o, skipEmpty: e.target.checked }))} />
              <span className="toggle-track" />
              <span>Skip sheets with no photos</span>
            </label>
            <div className="print-tips">
              <b>For exact sizes, in the print dialog choose:</b>
              <ul>
                <li>
                  Paper size: <b>{project.page.width} × {project.page.height} mm</b> (matching sheet)
                </li>
                <li>
                  Scale: <b>100% / Actual size</b> — never "Fit to page"
                </li>
                <li>
                  Margins: <b>None</b> · enable <b>Background graphics</b>
                </li>
                <li>Use "Save as PDF" to send to a print shop.</li>
              </ul>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => doPrint(true)} title="Prints a page with a 100 mm and 4 inch square to check your printer scale">
                Print calibration test
              </button>
              <div className="spacer" />
              <button className="btn ghost" onClick={() => setPrintOpen(false)}>
                Cancel
              </button>
              <button className="btn primary" disabled={!printCount} onClick={() => doPrint(false)}>
                Print {printCount} sheet{printCount === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast no-print">{toast}</div>}
    </div>
  );
}

function CalibrationPage({ page }) {
  return (
    <div className="calibration-page" style={{ width: `${page.width}mm`, height: `${page.height}mm` }}>
      <div style={{ position: 'absolute', left: '15mm', top: '15mm', fontFamily: 'Arial', fontSize: '12pt' }}>
        <b>Printer calibration test</b>
        <div style={{ fontSize: '9pt', marginTop: '2mm' }}>Measure with a ruler. If the boxes are not exact, set print scale to 100% / Actual size.</div>
      </div>
      <div className="calib-box" style={{ left: '15mm', top: '35mm', width: '100mm', height: '100mm' }}>
        <span>100 × 100 mm</span>
      </div>
      <div className="calib-box" style={{ left: '15mm', top: '145mm', width: '101.6mm', height: '101.6mm' }}>
        <span>4 × 4 in</span>
      </div>
      <div className="calib-ruler" style={{ left: '125mm', top: '35mm', height: '100mm' }}>
        {Array.from({ length: 101 }, (_, i) => (
          <i key={i} style={{ top: `${i}mm`, width: i % 10 === 0 ? '6mm' : i % 5 === 0 ? '4mm' : '2mm' }} />
        ))}
      </div>
    </div>
  );
}
