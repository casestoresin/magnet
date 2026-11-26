'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import OrderDetails, { ORDER_FIELDS } from '@/components/OrderDetails';
import { api } from '@/lib/api';
import { PAGE_PRESETS, FRAME_PRESETS } from '@/lib/presets';
import { thumbUrl } from '@/lib/image-url';
import { formatSize, UNITS } from '@/lib/units';
import { UnitInput } from '@/components/ui/Inputs';

const STATUS_LABEL = { draft: 'Draft', ready: 'Ready', printed: 'Printed', delivered: 'Delivered' };
const EMPTY_ORDER = Object.fromEntries(ORDER_FIELDS.map((k) => [k, ''])) ;

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [order, setOrder] = useState({ ...EMPTY_ORDER, label: null });
  const [form, setForm] = useState({ unit: 'mm', pagePreset: 'a4', pageW: 210, pageH: 297, framePreset: '2.5x3.5', frameW: 63.5, frameH: 88.9 });
  const [quickOrder, setQuickOrder] = useState('');

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
    setError('');
    const num = order.orderNumber.trim();
    if (num) {
      const { projects: dup } = await api.findOrder(num);
      if (dup.length) {
        if (confirm(`Order #${num} already exists (${dup[0].customer || dup[0].name}). Open it instead?`)) return router.push(`/editor/${dup[0]._id}`);
        if (!confirm('Create another project with the same order number?')) return;
      }
    }
    setCreating(true);
    try {
      const fp = FRAME_PRESETS.find((f) => f.id === form.framePreset);
      const frame = fp
        ? { preset: fp.id, width: fp.width, height: fp.height, shape: fp.shape, radius: fp.radius ?? 3, bleed: fp.bleed ?? 1.5, border: fp.border ?? 0, borderBottom: fp.borderBottom ?? 0 }
        : { preset: 'custom', width: form.frameW, height: form.frameH };
      const name = [num && `#${num}`, order.customer].filter(Boolean).join(' — ') || 'Untitled order';
      const { project } = await api.createProject({
        ...order,
        orderNumber: num,
        name,
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

  // Open an order straight from its number
  const openByNumber = async (e) => {
    e.preventDefault();
    const num = quickOrder.trim();
    if (!num) return;
    const { projects: found } = await api.findOrder(num);
    if (found.length) return router.push(`/editor/${found[0]._id}`);
    if (confirm(`No order #${num} yet. Start a new order with this number?`)) {
      setOrder((o) => ({ ...o, orderNumber: num }));
      document.getElementById('new-order')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const duplicate = async (p) => {
    await api.createProject({ duplicateOf: p._id });
    load();
  };
  const remove = async (p) => {
    if (!confirm(`Delete order "${p.name}"?`)) return;
    const withPhotos = p.photoCount > 0 && confirm(`Also permanently delete its ${p.photoCount} uploaded photo(s) and label from Cloudinary?\n\nOK = delete photos too · Cancel = keep photos in the library`);
    await api.deleteProject(p._id, withPhotos);
    setProjects((list) => list.filter((x) => x._id !== p._id));
  };

  const ql = q.toLowerCase();
  const visible = projects.filter(
    (p) =>
      (!status || p.status === status) &&
      (!q || [p.name, p.customer, p.orderNumber, p.phone, p.awb, p.city, p.pincode].join(' ').toLowerCase().includes(ql))
  );

  return (
    <>
      <TopNav />
      <div className="page">
        <form className="card quick-open" onSubmit={openByNumber}>
          <b>🔎 Open order by number</b>
          <input className="input" placeholder="Type order number…" value={quickOrder} onChange={(e) => setQuickOrder(e.target.value)} />
          <button className="btn primary">Open</button>
        </form>

        <section className="card new-project" id="new-order">
          <h2>New order</h2>
          <form onSubmit={create} className="new-order">
            <div className="new-order-left">
              <h4>1 · Customer & order</h4>
              <p className="hint">
                Upload the shipping label to fill this in automatically — or just type the order number, or only the customer&apos;s name.
                Nothing here is required.
              </p>
              <OrderDetails value={order} onChange={(patch) => setOrder((o) => ({ ...o, ...patch }))} />
            </div>
            <div className="new-order-right">
              <h4>2 · Magnet sheet</h4>
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
                <div className="grid-2">
                  <UnitInput label="Sheet width" unit={form.unit} valueMM={form.pageW} min={10} onChange={(v) => setForm((f) => ({ ...f, pageW: v }))} />
                  <UnitInput label="Sheet height" unit={form.unit} valueMM={form.pageH} min={10} onChange={(v) => setForm((f) => ({ ...f, pageH: v }))} />
                </div>
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
                <div className="grid-2">
                  <UnitInput label="Magnet width" unit={form.unit} valueMM={form.frameW} min={5} onChange={(v) => setForm((f) => ({ ...f, frameW: v }))} />
                  <UnitInput label="Magnet height" unit={form.unit} valueMM={form.frameH} min={5} onChange={(v) => setForm((f) => ({ ...f, frameH: v }))} />
                </div>
              )}
              <button className="btn primary block" disabled={creating}>
                {creating ? 'Creating…' : '+ Create order & open editor'}
              </button>
              {error && <div className="alert error">{error}</div>}
            </div>
          </form>
        </section>

        <div className="row between list-head">
          <h2>Orders</h2>
          <div className="row">
            <input className="input" placeholder="Search order no. / name / phone / AWB" value={q} onChange={(e) => setQ(e.target.value)} />
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

        {loading && <p className="muted">Loading…</p>}
        {!loading && !visible.length && <p className="muted">No orders yet — create your first one above.</p>}

        <div className="project-grid">
          {visible.map((p) => (
            <div key={p._id} className="card project-card">
              <Link href={`/editor/${p._id}`} className="project-preview">
                {p.preview.length ? p.preview.map((u, i) => <img key={i} src={thumbUrl(u)} alt="" />) : <span>No magnets yet</span>}
              </Link>
              <div className="project-info">
                <div className="row between">
                  <Link href={`/editor/${p._id}`}>
                    <b>{p.orderNumber ? `#${p.orderNumber}` : p.name}</b>
                  </Link>
                  <span className={`badge ${p.status}`}>{STATUS_LABEL[p.status] || p.status}</span>
                </div>
                {(p.customer || p.phone) && (
                  <small>
                    👤 {p.customer}
                    {p.phone ? ` · ${p.phone}` : ''}
                  </small>
                )}
                {(p.city || p.pincode) && (
                  <small>
                    📍 {p.city} {p.pincode}
                  </small>
                )}
                <small>
                  {p.magnetCount} magnets · {p.photoCount} photos {p.hasLabel ? '· 📄 label' : ''} {p.platform ? `· ${p.platform}` : ''}
                </small>
                <small className="muted">
                  {p.frame?.width ? formatSize(p.frame.width, p.frame.height, p.unit || 'mm') : ''} · Updated {new Date(p.updatedAt).toLocaleDateString()}
                </small>
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
