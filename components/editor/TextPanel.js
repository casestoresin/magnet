'use client';

import { useState } from 'react';
import { UnitInput, Slider, ColorInput, Select, Toggle, Section } from '@/components/ui/Inputs';
import { TextArt } from './Layers';
import { cldTransform } from '@/lib/image-url';
import { EMOJI_STICKERS, TEXT_DEFAULTS, TEXT_FONTS, TEXT_PRESETS, emojiLayer, imageLayer, newTextLayer } from '@/lib/text';

const EFFECTS = [
  { value: 'none', label: 'None' },
  { value: 'soft', label: 'Soft shadow' },
  { value: 'hard', label: 'Hard shadow' },
  { value: '3d', label: '3D / long shadow' },
  { value: 'glow', label: 'Neon glow' },
];
const FILLS = [
  { value: 'solid', label: 'Solid colour' },
  { value: 'gradient', label: 'Gradient (2 colours)' },
  { value: 'none', label: 'Outline only' },
];
const BGS = [
  { value: 'none', label: 'None' },
  { value: 'pill', label: 'Pill' },
  { value: 'box', label: 'Box' },
  { value: 'ribbon', label: 'Ribbon' },
];

function PresetTile({ preset, text, onClick }) {
  const layer = { ...TEXT_DEFAULTS, ...preset.style, text: preset.sample && !text ? preset.sample : text || 'Goa', curve: preset.style.curve ? 70 : 0 };
  return (
    <button className="preset-tile" onClick={onClick} title={preset.name}>
      <svg viewBox="-30 -12 60 24" width="100%" height="100%">
        <TextArt layer={{ ...layer, size: Math.min(layer.size, 26) }} id={`pv-${preset.id}`} />
      </svg>
      <span>{preset.name}</span>
    </button>
  );
}

export default function TextPanel({ slot, index, frame, unit, actions, activeLayer, setActiveLayer, photos }) {
  const [picker, setPicker] = useState(false);
  const [stickersOnly, setStickersOnly] = useState(true);
  const layers = slot.layers || [];
  const active = activeLayer && activeLayer.index === index ? layers.find((l) => l.id === activeLayer.id) : null;
  const setL = (obj) => active && actions.patchLayer(index, active.id, obj);

  const applyPreset = (preset) => {
    const style = { ...TEXT_DEFAULTS, ...preset.style };
    delete style.type;
    delete style.text;
    if (active && active.type === 'text') {
      // keep the text and position unless the preset needs its own spot (e.g. arc goes to the top)
      const { x, y, ...rest } = style;
      setL({ ...rest, ...(preset.style.y !== undefined ? { y: preset.style.y } : {}) });
    } else {
      actions.addLayer(index, newTextLayer({ ...style, text: preset.sample || 'Goa' }));
    }
  };

  const stickerPhotos = photos.filter((p) => !stickersOnly || p.tag?.toLowerCase().includes('sticker') || p.format === 'png');

  return (
    <>
      <Section title="Text & stickers">
        <div className="btn-row">
          <button className="btn primary" onClick={() => actions.addLayer(index, newTextLayer({ text: 'Goa' }))}>
            + Add text
          </button>
          <button className={`btn ghost ${picker ? 'on' : ''}`} onClick={() => setPicker(!picker)}>
            + Sticker
          </button>
        </div>
        <div className="emoji-row">
          {EMOJI_STICKERS.map((em) => (
            <button key={em} onClick={() => actions.addLayer(index, emojiLayer(em))} title="Add emoji sticker">
              {em}
            </button>
          ))}
        </div>

        {picker && (
          <div className="sticker-picker">
            <Toggle label="Only PNG / tagged “sticker”" checked={stickersOnly} onChange={setStickersOnly} />
            {stickerPhotos.length ? (
              <div className="sticker-grid">
                {stickerPhotos.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => {
                      actions.addLayer(index, imageLayer(p, frame.width));
                      setPicker(false);
                    }}
                    title={p.name}
                  >
                    <img src={cldTransform(p.url, 'c_pad,w_200,h_200,b_rgb:f0f1f6,f_auto,q_auto')} alt="" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="hint">
                No stickers yet. Upload transparent <b>PNG</b> images (logos, frames, “Goa” art) in the Photos tab — add the tag
                <b> sticker</b> to find them fast.
              </p>
            )}
          </div>
        )}

        {layers.length > 0 && (
          <ul className="layer-list">
            {[...layers].reverse().map((l) => (
              <li key={l.id} className={active?.id === l.id ? 'active' : ''} onClick={() => setActiveLayer({ index, id: l.id })}>
                <span className="layer-kind">{l.type === 'image' ? '🖼' : 'T'}</span>
                <span className="layer-name">{l.type === 'image' ? l.name || 'Sticker' : l.text || '(empty)'}</span>
                <button title="Bring forward" onClick={(e) => (e.stopPropagation(), actions.moveLayer(index, l.id, 1))}>
                  ↑
                </button>
                <button title="Send backward" onClick={(e) => (e.stopPropagation(), actions.moveLayer(index, l.id, -1))}>
                  ↓
                </button>
                <button title="Delete" onClick={(e) => (e.stopPropagation(), actions.removeLayer(index, l.id))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={active?.type === 'text' ? 'Text styles — click to apply' : 'Text styles — click to add'}>
        <div className="preset-grid">
          {TEXT_PRESETS.map((p) => (
            <PresetTile key={p.id} preset={p} text={active?.type === 'text' && active.text.length <= 12 ? active.text : ''} onClick={() => applyPreset(p)} />
          ))}
        </div>
      </Section>

      {active && active.type === 'text' && (
        <Section title="Edit text">
          <textarea className="input" rows={2} value={active.text} onChange={(e) => setL({ text: e.target.value.replace(/\n/g, ' ') })} />
          <Select label="Font" value={active.font} onChange={(v) => setL({ font: v })} options={TEXT_FONTS} />
          <Slider label="Size" min={6} max={160} value={active.size} onChange={(v) => setL({ size: v })} format={(v) => `${v} pt`} />
          <div className="btn-row">
            <button className={`btn ghost ${active.weight >= 700 ? 'on' : ''}`} onClick={() => setL({ weight: active.weight >= 700 ? 400 : 700 })}>
              <b>B</b> Bold
            </button>
            <button className={`btn ghost ${active.italic ? 'on' : ''}`} onClick={() => setL({ italic: !active.italic })}>
              <i>I</i> Italic
            </button>
            <button className={`btn ghost ${active.upper ? 'on' : ''}`} onClick={() => setL({ upper: !active.upper })}>
              AA Caps
            </button>
            <button className="btn ghost" onClick={() => setL({ x: 0.5 })}>
              ⇔ Center
            </button>
          </div>

          <Select label="Fill" value={active.fillType} onChange={(v) => setL({ fillType: v })} options={FILLS} />
          {active.fillType !== 'none' && (
            <div className="grid-2">
              <ColorInput label={active.fillType === 'gradient' ? 'Top colour' : 'Colour'} value={active.color} onChange={(v) => setL({ color: v })} />
              {active.fillType === 'gradient' && <ColorInput label="Bottom colour" value={active.color2} onChange={(v) => setL({ color2: v })} />}
            </div>
          )}
          <div className="grid-2">
            <UnitInput label="Outline" unit={unit} valueMM={active.strokeW || 0} onChange={(v) => setL({ strokeW: v })} />
            <ColorInput label="Outline colour" value={active.strokeColor?.startsWith('#') ? active.strokeColor : '#000000'} onChange={(v) => setL({ strokeColor: v })} />
          </div>

          <Select label="Effect" value={active.effect} onChange={(v) => setL({ effect: v })} options={EFFECTS} />
          {active.effect !== 'none' && (
            <ColorInput label={active.effect === 'glow' ? 'Glow colour' : 'Shadow colour'} value={active.effectColor} onChange={(v) => setL({ effectColor: v })} />
          )}

          <Slider
            label="Curve"
            min={-270}
            max={270}
            value={active.curve || 0}
            onChange={(v) => setL({ curve: Math.abs(v) < 5 ? 0 : v })}
            format={(v) => (v > 0 ? `∩ ${v}°` : v < 0 ? `∪ ${-v}°` : 'Straight')}
          />
          <Slider label="Letter spacing" min={-10} max={60} value={active.spacing || 0} onChange={(v) => setL({ spacing: v })} format={(v) => `${v}%`} />
          <Slider label="Rotate" min={-180} max={180} value={active.rotate || 0} onChange={(v) => setL({ rotate: v })} format={(v) => `${v}°`} />
          <Slider label="Opacity" min={0.1} max={1} step={0.05} value={active.opacity ?? 1} onChange={(v) => setL({ opacity: v })} format={(v) => `${Math.round(v * 100)}%`} />

          <Select label="Background" value={active.bg || 'none'} onChange={(v) => setL({ bg: v })} options={BGS} />
          {active.bg && active.bg !== 'none' && <ColorInput label="Background colour" value={active.bgColor} onChange={(v) => setL({ bgColor: v })} />}
          {active.bg !== 'none' && active.curve ? <p className="hint">Backgrounds show on straight text only.</p> : null}

          <LayerPosition active={active} setL={setL} />
          <LayerActions index={index} active={active} actions={actions} />
        </Section>
      )}

      {active && active.type === 'image' && (
        <Section title="Edit sticker">
          <UnitInput label="Width" unit={unit} min={2} valueMM={active.width} onChange={(v) => setL({ width: v })} />
          <Slider label="Rotate" min={-180} max={180} value={active.rotate || 0} onChange={(v) => setL({ rotate: v })} format={(v) => `${v}°`} />
          <Slider label="Opacity" min={0.1} max={1} step={0.05} value={active.opacity ?? 1} onChange={(v) => setL({ opacity: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Toggle label="Flip horizontally" checked={active.flipX} onChange={(v) => setL({ flipX: v })} />
          <LayerPosition active={active} setL={setL} />
          <LayerActions index={index} active={active} actions={actions} />
        </Section>
      )}
    </>
  );
}

function LayerPosition({ active, setL }) {
  return (
    <>
      <div className="pos-grid" title="Quick position">
        {[0.15, 0.5, 0.85].map((y) =>
          [0.2, 0.5, 0.8].map((x) => (
            <button
              key={`${x}-${y}`}
              className={Math.abs(active.x - x) < 0.02 && Math.abs(active.y - y) < 0.02 ? 'on' : ''}
              onClick={() => setL({ x, y })}
            />
          ))
        )}
      </div>
      <div className="grid-2">
        <Slider label="Left ↔ right" min={0} max={100} value={Math.round(active.x * 100)} onChange={(v) => setL({ x: v / 100 })} format={(v) => `${v}%`} />
        <Slider label="Top ↕ bottom" min={0} max={100} value={Math.round(active.y * 100)} onChange={(v) => setL({ y: v / 100 })} format={(v) => `${v}%`} />
      </div>
      <p className="hint">Tip: drag it on the magnet. Arrow keys nudge, Delete removes, Esc deselects.</p>
    </>
  );
}

function LayerActions({ index, active, actions }) {
  return (
    <div className="btn-col">
      <button className="btn ghost block" onClick={() => actions.duplicateLayer(index, active.id)}>
        ⧉ Duplicate
      </button>
      <button className="btn ghost block" onClick={() => actions.copyLayerToAll(index, active.id)} title="Puts the same text/sticker on every magnet that has a photo">
        ⇉ Copy to all magnets
      </button>
      <button className="btn danger block" onClick={() => actions.removeLayer(index, active.id)}>
        Delete
      </button>
    </div>
  );
}
