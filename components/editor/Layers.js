'use client';

import { printUrl } from '@/lib/image-url';
import { MM_PER_PT } from '@/lib/units';
import { measureText } from '@/lib/text';

// Text art drawn around (0,0). Everything in mm. `id` must be unique in the document.
export function TextArt({ layer, id, showBox = false }) {
  const fs = (layer.size || 24) * MM_PER_PT;
  const str = layer.upper ? (layer.text || '').toUpperCase() : layer.text || '';
  const width = Math.max(fs * 0.5, measureText(str, layer, fs));
  const h = fs * 1.3;
  const curve = Math.max(-300, Math.min(300, layer.curve || 0));
  const curved = Math.abs(curve) >= 5 && str.length > 1;

  const fill = layer.fillType === 'gradient' ? `url(#${id}-grad)` : layer.fillType === 'none' ? 'none' : layer.color;
  const stroke = layer.strokeW > 0 ? layer.strokeColor : 'none';
  const common = {
    fontSize: fs,
    fontFamily: layer.font,
    fontWeight: layer.weight || 400,
    fontStyle: layer.italic ? 'italic' : 'normal',
    letterSpacing: ((layer.spacing || 0) / 100) * fs,
    textAnchor: 'middle',
    dominantBaseline: 'central',
    paintOrder: 'stroke',
    strokeLinejoin: 'round',
  };

  // Curved text path: an arc whose length matches the text width
  let pathD = null;
  let box = { x: -width / 2, y: -h / 2, w: width, h };
  if (curved) {
    const theta = (Math.abs(curve) * Math.PI) / 180;
    const R = width / theta;
    const span = Math.min(theta * 1.3, Math.PI * 1.95);
    const sx = R * Math.sin(span / 2);
    const dy = R - R * Math.cos(span / 2);
    const large = span > Math.PI ? 1 : 0;
    if (curve > 0) pathD = `M ${-sx} ${dy} A ${R} ${R} 0 ${large} 1 ${sx} ${dy}`; // arch ∩
    else pathD = `M ${-sx} ${-dy} A ${R} ${R} 0 ${large} 0 ${sx} ${-dy}`; // smile ∪
    const hgt = theta > Math.PI ? R * 2 : R - R * Math.cos(theta / 2);
    box = { x: -Math.min(R, width / 2) - fs * 0.3, y: curve > 0 ? -h / 2 : -hgt - h / 2, w: Math.min(2 * R, width) + fs * 0.6, h: hgt + h };
  }

  const glyphs = (extra = {}, key) =>
    curved ? (
      <text key={key} {...common} {...extra}>
        <textPath href={`#${id}-path`} startOffset="50%">
          {str}
        </textPath>
      </text>
    ) : (
      <text key={key} x={0} y={0} {...common} {...extra}>
        {str}
      </text>
    );

  const eff = layer.effect || 'none';
  const ec = layer.effectColor || '#000';
  const shadowCopies = [];
  if (eff === 'hard') shadowCopies.push([fs * 0.06, fs * 0.06]);
  if (eff === '3d') for (let i = 12; i >= 1; i--) shadowCopies.push([fs * 0.012 * i, fs * 0.012 * i]);

  // Background shapes (straight text only)
  let bgEl = null;
  if (!curved && layer.bg && layer.bg !== 'none') {
    const padX = fs * 0.45;
    const bw = width + padX * 2;
    const bh = fs * 1.35;
    if (layer.bg === 'pill') bgEl = <rect x={-bw / 2} y={-bh / 2} width={bw} height={bh} rx={bh / 2} fill={layer.bgColor} />;
    else if (layer.bg === 'box') bgEl = <rect x={-bw / 2} y={-bh / 2} width={bw} height={bh} rx={fs * 0.1} fill={layer.bgColor} />;
    else if (layer.bg === 'ribbon') {
      const n = bh * 0.5;
      const L = -bw / 2 - n;
      const Rr = bw / 2 + n;
      bgEl = (
        <polygon
          points={`${L},${-bh / 2} ${Rr},${-bh / 2} ${Rr - n * 0.8},0 ${Rr},${bh / 2} ${L},${bh / 2} ${L + n * 0.8},0`}
          fill={layer.bgColor}
        />
      );
    }
    box = { x: -bw / 2 - (layer.bg === 'ribbon' ? bh * 0.5 : 0), y: -bh / 2, w: bw + (layer.bg === 'ribbon' ? bh : 0), h: bh };
  }

  const filter = eff === 'soft' || eff === 'glow' ? `url(#${id}-fx)` : undefined;

  return (
    <g opacity={layer.opacity ?? 1}>
      <defs>
        {layer.fillType === 'gradient' && (
          <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={layer.color} />
            <stop offset="100%" stopColor={layer.color2 || layer.color} />
          </linearGradient>
        )}
        {curved && <path id={`${id}-path`} d={pathD} />}
        {eff === 'soft' && (
          <filter id={`${id}-fx`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx={fs * 0.03} dy={fs * 0.05} stdDeviation={fs * 0.05} floodColor={ec} floodOpacity="0.75" />
          </filter>
        )}
        {eff === 'glow' && (
          <filter id={`${id}-fx`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation={fs * 0.09} result="blur" />
            <feFlood floodColor={ec} />
            <feComposite in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      {bgEl}
      {shadowCopies.map(([dx, dy], i) => (
        <g key={i} transform={`translate(${dx} ${dy})`}>
          {glyphs({ fill: ec, stroke: layer.strokeW > 0 ? ec : 'none', strokeWidth: layer.strokeW * 2 })}
        </g>
      ))}
      <g filter={filter}>{glyphs({ fill, stroke, strokeWidth: (layer.strokeW || 0) * 2 })}</g>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="transparent" pointerEvents="all" />
      {showBox && (
        <rect className="screen-only layer-box" x={box.x} y={box.y} width={box.w} height={box.h} fill="none" strokeWidth={0.3} strokeDasharray="1 0.7" />
      )}
    </g>
  );
}

function ImageArt({ layer, showBox }) {
  const w = layer.width || 20;
  const h = layer.w && layer.h ? (w * layer.h) / layer.w : w;
  return (
    <g opacity={layer.opacity ?? 1}>
      <image
        href={printUrl(layer.url)}
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        preserveAspectRatio="none"
        transform={layer.flipX ? 'scale(-1 1)' : undefined}
      />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="transparent" pointerEvents="all" />
      {showBox && <rect className="screen-only layer-box" x={-w / 2} y={-h / 2} width={w} height={h} fill="none" strokeWidth={0.3} strokeDasharray="1 0.7" />}
    </g>
  );
}

// All layers of one magnet, positioned inside its cut frame
export function LayersView({ layers, frame, uid, index, activeLayerId, onLayerPointerDown }) {
  if (!layers || !layers.length) return null;
  const b = frame.bleed;
  return layers.map((layer) => {
    const cx = b + layer.x * frame.width;
    const cy = b + layer.y * frame.height;
    const active = layer.id === activeLayerId;
    return (
      <g
        key={layer.id}
        className="layer"
        transform={`translate(${cx} ${cy}) rotate(${layer.rotate || 0})`}
        onPointerDown={(e) => onLayerPointerDown?.(e, index, layer.id)}
      >
        {layer.type === 'image' ? <ImageArt layer={layer} showBox={active} /> : <TextArt layer={layer} id={`${uid}-${layer.id}`} showBox={active} />}
      </g>
    );
  });
}
