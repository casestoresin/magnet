'use client';

import { useRef, useState } from 'react';
import { uploadLabel } from '@/lib/api';
import { parseLabel } from '@/lib/label-parse';

export const ORDER_FIELDS = ['orderNumber', 'platform', 'customer', 'phone', 'address', 'city', 'state', 'pincode', 'courier', 'awb', 'payment', 'codAmount'];

const PLATFORMS = ['Meesho', 'Amazon', 'Flipkart', 'Shopify', 'Instagram', 'WhatsApp', 'Website', 'Offline / Shop'];

// parsed label keys -> order fields
function toFields(p) {
  return {
    orderNumber: p.orderNumber,
    platform: p.platform,
    customer: p.name,
    phone: p.phone,
    address: p.address,
    city: p.city,
    state: p.state,
    pincode: p.pincode,
    courier: p.courier,
    awb: p.awb,
    payment: p.payment,
    codAmount: p.codAmount,
  };
}

/**
 * value: the order fields + label; onChange(patch) merges into it.
 * Reading happens in the browser: PDF text directly, photos via OCR.
 */
export default function OrderDetails({ value, onChange, compact = false }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [filled, setFilled] = useState([]);
  const [rawText, setRawText] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const inputRef = useRef(null);
  const label = value.label;

  const applyText = (text) => {
    setRawText(text);
    const f = toFields(parseLabel(text));
    const found = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
    setFilled(Object.keys(found));
    onChange(found);
    return Object.keys(found).length;
  };

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setFilled([]);
    setStatus('Uploading label…');
    try {
      const { readLabelFile } = await import('@/lib/label-reader');
      // upload and read at the same time
      const [uploaded, read] = await Promise.all([
        uploadLabel(file),
        readLabelFile(file, setStatus).catch((e) => {
          console.error(e);
          return { text: '', method: 'failed' };
        }),
      ]);
      onChange({ label: uploaded });
      const n = read.text ? applyText(read.text) : 0;
      setStatus(
        n
          ? `✓ Filled ${n} field(s) from the label (${read.method === 'pdf-text' ? 'PDF text' : 'OCR'}). Please check them.`
          : 'Label saved, but no details could be read — type them below.'
      );
    } catch (e) {
      setStatus(`⚠ ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const reread = async () => {
    if (!label?.preview) return;
    setBusy(true);
    try {
      const { readLabelUrl } = await import('@/lib/label-reader');
      const r = await readLabelUrl(label.preview, setStatus);
      const n = applyText(r.text);
      setStatus(n ? `✓ Filled ${n} field(s). Please check them.` : 'Could not read details from this label.');
    } catch (e) {
      setStatus(`⚠ ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const field = (key, labelText, props = {}) => (
    <label className={`field ${filled.includes(key) ? 'auto-filled' : ''}`}>
      <span className="field-label">{labelText}</span>
      <input className="input" value={value[key] || ''} onChange={(e) => onChange({ [key]: e.target.value })} {...props} />
    </label>
  );

  return (
    <div className={`order-details ${compact ? 'compact' : ''}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {label?.url ? (
        <div className="label-box">
          <a href={label.preview || label.url} target="_blank" rel="noreferrer" title="Open label">
            <img src={label.preview || label.url} alt="Shipping label" />
          </a>
          <div className="label-actions">
            <b>📄 Label</b>
            <small>{label.name || label.format?.toUpperCase()}</small>
            <button type="button" className="btn ghost sm" disabled={busy} onClick={() => inputRef.current?.click()}>
              Replace
            </button>
            <button type="button" className="btn ghost sm" disabled={busy} onClick={reread} title="Read the details again (OCR)">
              Re-read
            </button>
            <button type="button" className="btn ghost sm" disabled={busy} onClick={() => confirm('Remove the label from this order?') && onChange({ label: null })}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className="dropzone label-drop"
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          <strong>📄 Upload shipping label</strong>
          <span>Photo or PDF — customer details fill in automatically</span>
        </div>
      )}
      {status && <div className={`label-status ${busy ? 'busy' : ''}`}>{status}</div>}
      {rawText && (
        <button type="button" className="link" onClick={() => setShowRaw(!showRaw)}>
          {showRaw ? 'Hide' : 'Show'} text read from label
        </button>
      )}
      {showRaw && <pre className="raw-text">{rawText}</pre>}

      <div className="order-grid">
        {field('orderNumber', 'Order number', { placeholder: 'e.g. 1456789012' })}
        <label className={`field ${filled.includes('platform') ? 'auto-filled' : ''}`}>
          <span className="field-label">Platform</span>
          <input className="input" list="platforms" value={value.platform || ''} onChange={(e) => onChange({ platform: e.target.value })} />
          <datalist id="platforms">
            {PLATFORMS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        {field('customer', 'Customer name')}
        {field('phone', 'Phone', { inputMode: 'tel' })}
      </div>
      <label className={`field ${filled.includes('address') ? 'auto-filled' : ''}`}>
        <span className="field-label">Address</span>
        <textarea className="input" rows={2} value={value.address || ''} onChange={(e) => onChange({ address: e.target.value })} />
      </label>
      <div className="order-grid three">
        {field('city', 'City')}
        {field('state', 'State')}
        {field('pincode', 'Pincode', { inputMode: 'numeric' })}
      </div>
      <div className="order-grid">
        {field('courier', 'Courier')}
        {field('awb', 'AWB / tracking no.')}
        <label className={`field ${filled.includes('payment') ? 'auto-filled' : ''}`}>
          <span className="field-label">Payment</span>
          <select className="input" value={value.payment || ''} onChange={(e) => onChange({ payment: e.target.value })}>
            <option value="">—</option>
            <option>Prepaid</option>
            <option>COD</option>
          </select>
        </label>
        {value.payment === 'COD' && field('codAmount', 'COD amount (₹)', { inputMode: 'decimal' })}
      </div>
    </div>
  );
}
