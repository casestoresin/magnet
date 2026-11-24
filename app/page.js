'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import { api } from '@/lib/api';
import { PAGE_PRESETS, FRAME_PRESETS } from '@/lib/presets';
import { thumbUrl } from '@/lib/image-url';
import { formatSize, UNITS } from '@/lib/units';
import { UnitInput } from '@/components/ui/Inputs';

const STATUS_LABEL = { draft: 'Draft', ready: 'Ready', printed: 'Printed', delivered: 'Delivered' };

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', customer: '', unit: 'mm', pagePreset: 'a4', pageW: 210, pageH: 297, framePreset: '2.5x2.5', frameW: 63.5, frameH: 63.5 });

  const load = () =>
    api
      .listProjects()
      .then((d) => setProjects(d.projects))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const fp = FRAME_PRESETS.find((f) => f.id === form.framePreset);
      const frame = fp
        ? { preset: fp.id, width: fp.width, height: fp.height, shape: fp.shape, radius: fp.radius ?? 3, bleed: fp.bleed ?? 1.5, border: fp.border ?? 0, borderBottom: fp.borderBottom ?? 0 }
        : { preset: 'custom', width: form.frameW, height: form.frameH };
      const { project } = await api.createProject({
        name: form.name || 'Untitled magnet sheet',
        customer: form.customer,
        unit: form.unit,
        page: { preset: form.pagePreset, width: form.pageW, height: form.pageH },
        frame,
      });
      router.push(`/editor/${project._id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  const duplicate = async (p) => {
    await api.createProject({ duplicateOf: p._id });
    load();
  };
  const remove = async (p) => {
    if (!confirm(`Delete project "${p.name}"? Photos stay in the library.`)) return;
    await api.deleteProject(p._id);
    setProjects((list) => list.filter((x) => x._id !== p._id));
  };

  const visible = projects.filter(
    (p) => (!status || p.status === status) && (!q || `${p.name} ${p.customer}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <>
      <TopNav />
      <div className="page">
        <section className="card new-project">
          <h2>New magnet sheet</h2>
          <form onSubmit={create} className="new-form">
            <label className="field">
              <span className="field-label">Project name</span>
              <input className="input" placeholder="e.g. Sharma family order" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Customer</span>
              <input className="input" placeholder="optional" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Unit</span>
              <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Sheet / paper</span>
              <select
                className="input"
                value={form.pagePreset}
                onChange={(e) => {
                  const p = PAGE_PRESETS.find((x) => x.id === e.target.value);
                  setForm({ ...form, pagePreset: p.id, pageW: p.width || form.pageW, pageH: p.height || form.pageH });
                }}
              >
                {PAGE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {form.pagePreset === 'custom' && (
              <>
                <UnitInput label="Sheet width" unit={form.unit} valueMM={form.pageW} min={10} onChange={(v) => setForm((f) => ({ ...f, pageW: v }))} />
                <UnitInput label="Sheet height" unit={form.unit} valueMM={form.pageH} min={10} onChange={(v) => setForm((f) => ({ ...f, pageH: v }))} />
              </>
            )}
            <label className="field">
              <span className="field-label">Magnet size</span>
              <select className="input" value={form.framePreset} onChange={(e) => setForm({ ...form, framePreset: e.target.value })}>
                {FRAME_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="custom">Custom size</option>
              </select>
            </label>
            {form.framePreset === 'custom' && (
              <>
                <UnitInput label="Magnet width" unit={form.unit} valueMM={form.frameW} min={5} onChange={(v) => setForm((f) => ({ ...f, frameW: v }))} />
                <UnitInput label="Magnet height" unit={form.unit} valueMM={form.frameH} min={5} onChange={(v) => setForm((f) => ({ ...f, frameH: v }))} />
              </>
            )}
            <button className="btn primary" disabled={creating}>
              {creating ? 'Creating…' : '+ Create & open editor'}
            </button>
          </form>
        </section>

        <div className="row between list-head">
          <h2>Projects</h2>
          <div className="row">
            <input className="input" placeholder="Search name / customer" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="alert error">{error}</div>}
        {loading && <p className="muted">Loading…</p>}
        {!loading && !visible.length && <p className="muted">No projects yet — create your first magnet sheet above.</p>}

        <div className="project-grid">
          {visible.map((p) => (
            <div key={p._id} className="card project-card">
              <Link href={`/editor/${p._id}`} className="project-preview">
                {p.preview.length ? p.preview.map((u, i) => <img key={i} src={thumbUrl(u)} alt="" />) : <span>No photos yet</span>}
              </Link>
              <div className="project-info">
                <div className="row between">
                  <Link href={`/editor/${p._id}`}>
                    <b>{p.name}</b>
                  </Link>
                  <span className={`badge ${p.status}`}>{STATUS_LABEL[p.status] || p.status}</span>
                </div>
                {p.customer && <small>👤 {p.customer}</small>}
                <small>
                  {p.magnetCount} magnets · {p.frame?.width ? formatSize(p.frame.width, p.frame.height, p.unit || 'mm') : ''} on{' '}
                  {p.page?.width ? formatSize(p.page.width, p.page.height, p.unit || 'mm') : ''}
                </small>
                <small className="muted">Updated {new Date(p.updatedAt).toLocaleString()}</small>
                <div className="row card-actions">
                  <Link className="btn primary sm" href={`/editor/${p._id}`}>
                    Open
                  </Link>
                  <button className="btn ghost sm" onClick={() => duplicate(p)}>
                    Duplicate
                  </button>
                  <button className="btn danger sm" onClick={() => remove(p)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
