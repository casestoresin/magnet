'use client';

import { useEffect, useRef, useState } from 'react';
import { displayValue, toMM, STEP } from '@/lib/units';

// Number input that shows a mm value in the current display unit
export function UnitInput({ label, valueMM, unit, onChange, min = 0, max, title, disabled }) {
  const [text, setText] = useState(String(displayValue(valueMM ?? 0, unit)));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(displayValue(valueMM ?? 0, unit)));
  }, [valueMM, unit]);

  const commit = (v) => {
    setText(v);
    const n = parseFloat(v);
    if (Number.isNaN(n)) return;
    let mm = toMM(n, unit);
    if (min != null) mm = Math.max(min, mm);
    if (max != null) mm = Math.min(max, mm);
    onChange(mm);
  };

  return (
    <label className="field" title={title}>
      {label && <span className="field-label">{label}</span>}
      <span className="unit-input">
        <input
          type="number"
          step={STEP[unit]}
          value={text}
          disabled={disabled}
          onFocus={() => (focused.current = true)}
          onBlur={() => {
            focused.current = false;
            setText(String(displayValue(valueMM ?? 0, unit)));
          }}
          onChange={(e) => commit(e.target.value)}
        />
        <span className="unit-suffix">{unit}</span>
      </span>
    </label>
  );
}

export function NumberInput({ label, value, onChange, min, max, step = 1, suffix, title }) {
  const [text, setText] = useState(String(value ?? ''));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(value ?? ''));
  }, [value]);
  return (
    <label className="field" title={title}>
      {label && <span className="field-label">{label}</span>}
      <span className="unit-input">
        <input
          type="number"
          value={text}
          min={min}
          max={max}
          step={step}
          onFocus={() => (focused.current = true)}
          onBlur={() => {
            focused.current = false;
            setText(String(value ?? ''));
          }}
          onChange={(e) => {
            setText(e.target.value);
            let n = parseFloat(e.target.value);
            if (Number.isNaN(n)) return;
            if (min != null) n = Math.max(min, n);
            if (max != null) n = Math.min(max, n);
            onChange(n);
          }}
        />
        {suffix && <span className="unit-suffix">{suffix}</span>}
      </span>
    </label>
  );
}

export function Slider({ label, value, onChange, min, max, step = 1, format }) {
  return (
    <label className="field slider-field">
      <span className="field-label">
        {label}
        <b>{format ? format(value) : value}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  );
}

export function ColorInput({ label, value, onChange }) {
  return (
    <label className="field color-field">
      <span className="field-label">{label}</span>
      <span className="color-wrap">
        <input type="color" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)} />
        <code>{value}</code>
      </span>
    </label>
  );
}

export function Select({ label, value, onChange, options }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="toggle" title={hint}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" />
      <span>{label}</span>
    </label>
  );
}

export function Section({ title, children, right }) {
  return (
    <section className="panel-section">
      <div className="panel-section-head">
        <h4>{title}</h4>
        {right}
      </div>
      {children}
    </section>
  );
}
