'use client';

import { printUrl } from '@/lib/image-url';
import { MM_PER_PT } from '@/lib/units';
import { measureText } from '@/lib/text';

// Puffy cloud made of circles, centred on (cx, cy), roughly W × H
function Cloud({ cx, cy, W, H, fill, opacity = 1 }) {
  const c = [
    [-0.3, 0.1, 0.26],
    [-0.1, -0.12, 0.36],
    [0.14, -0.18, 0.4],
    [0.33, 0.04, 0.28],
    [-0.4, 0.2, 0.17],
    [0.42, 0.2, 0.16],
  ];
  return (
    <g fill={fill} opacity={opacity}>
      {c.map(([x, y, r], i) => (
        <circle key={i} cx={cx + x * W} cy={cy + y * H} r={r * H} />
      ))}
      <rect x={cx - 0.42 * W} y={cy + 0.02 * H} width={0.84 * W} height={0.34 * H} rx={0.17 * H} />
    </g>
  );
}

// Scenic background behind text. Returns { el, box }.
function sceneBg(layer, id, textW, fs, cy = 0) {
  const s = layer.bgScale || 1;
  const W = (textW + fs * 1.4) * s;
  const H = fs * 2.1 * s;
  const x0 = -W / 2;
  const y0 = cy - H / 2;
  const c1 = layer.bgColor;
  const c2 = layer.bgColor2 || layer.bgColor;
  const r = fs * 0.35 * s;
  const box = { x: x0, y: y0, w: W, h: H };
  const grad = (gid, a, b) => (
    <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={a} />
      <stop offset="100%" stopColor={b} />
    </linearGradient>
  );
  const wave = (top, amp, k, phase = 0) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push(`${(x0 + t * W).toFixed(3)},${(top + amp * Math.sin(2 * Math.PI * k * t + phase)).toFixed(3)}`);
    }
    return `M ${x0},${y0 + H} L ${pts.join(' L ')} L ${x0 + W},${y0 + H} Z`;
  };

  switch (layer.bg) {
    case 'sky':
      return {
        box,
        el: (
          <g>
            <defs>{grad(`${id}-sky`, c1, c2)}</defs>
            <rect x={x0} y={y0} width={W} height={H} rx={r} fill={`url(#${id}-sky)`} />
            <Cloud cx={x0 + W * 0.16} cy={y0 + H * 0.26} W={fs * 1.1 * s} H={fs * 0.55 * s} fill="#fff" opacity={0.9} />
            <Cloud cx={x0 + W * 0.85} cy={y0 + H * 0.74} W={fs * 1.3 * s} H={fs * 0.6 * s} fill="#fff" opacity={0.85} />
          </g>
        ),
      };
    case 'clouds':
      return {
        box,
        el: (
          <g>
            <Cloud cx={0} cy={cy + fs * 0.12 * s} W={W} H={H} fill={c2} />
            <Cloud cx={0} cy={cy} W={W} H={H} fill={c1} />
          </g>
        ),
      };
    case 'fog':
      return {
        box,
        el: (
          <g>
            <defs>
              <filter id={`${id}-fog`} x="-60%" y="-80%" width="220%" height="260%">
                <feGaussianBlur stdDeviation={fs * 0.28 * s} />
              </filter>
            </defs>
            <g filter={`url(#${id}-fog)`} fill={c1}>
              <ellipse cx={0} cy={cy} rx={W * 0.5} ry={H * 0.36} />
              <ellipse cx={-W * 0.28} cy={cy + H * 0.12} rx={W * 0.3} ry={H * 0.28} />
              <ellipse cx={W * 0.3} cy={cy - H * 0.06} rx={W * 0.3} ry={H * 0.3} />
            </g>
          </g>
        ),
      };
    case 'waves':
      return {
        box,
        el: (
          <g>
            <defs>
              {grad(`${id}-sea`, c1, c2)}
              <clipPath id={`${id}-clip`}>
                <rect x={x0} y={y0} width={W} height={H} rx={r} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${id}-clip)`}>
              <path d={wave(y0 + H * 0.3, H * 0.07, 2)} fill={`url(#${id}-sea)`} />
              <path d={wave(y0 + H * 0.55, H * 0.06, 2.5, 1.3)} fill="#ffffff" opacity={0.25} />
              <path d={wave(y0 + H * 0.72, H * 0.05, 3, 2.1)} fill={c2} opacity={0.7} />
            </g>
          </g>
        ),
      };
    case 'mountains': {
      // wider than the text so the peaks rise on both sides of it
      const MW = (textW + fs * 3) * s;
      const MH = fs * 2.3 * s;
      const mx = -MW / 2;
      const my = cy - MH * 0.55;
      const base = my + MH;
      const P = (fx, fy) => [mx + MW * fx, my + MH * fy];
      const back = [P(0, 1), P(0.22, 0.3), P(0.38, 0.5), P(0.55, 0.06), P(0.7, 0.42), P(0.86, 0.18), P(1, 1)];
      const front = [P(0, 1), P(0.16, 0.24), P(0.36, 0.7), P(0.5, 0.55), P(0.66, 0.72), P(0.85, 0.3), P(1, 1)];
      // snow cap that follows both slopes of a peak
      const cap = (L, Pk, R, depth) => {
        const at = (A, f) => [Pk[0] + (A[0] - Pk[0]) * f, Pk[1] + (A[1] - Pk[1]) * f];
        const fl = depth / (L[1] - Pk[1]);
        const fr = depth / (R[1] - Pk[1]);
        const a = at(L, fl);
        const b = at(R, fr);
        const mid = (u, v, k) => [u[0] + (v[0] - u[0]) * k, u[1] + (v[1] - u[1]) * k];
        const z1 = mid(a, b, 0.33);
        const z2 = mid(a, b, 0.66);
        return [a, Pk, b, [z2[0], z2[1] - depth * 0.3], z2, [z1[0], z1[1] - depth * 0.3], z1].map(([x, y]) => `${x},${y}`).join(' ');
      };
      const pts = (a) => a.map(([x, y]) => `${x},${y}`).join(' ');
      return {
        box: { x: mx, y: my, w: MW, h: base - my },
        el: (
          <g>
            <polygon points={pts(back)} fill={c2} />
            <polygon points={cap(back[2], back[3], back[4], MH * 0.14)} fill="#ffffff" opacity={0.85} />
            <polygon points={pts(front)} fill={c1} />
            <polygon points={cap(front[0], front[1], front[2], MH * 0.16)} fill="#ffffff" />
            <polygon points={cap(front[4], front[5], front[6], MH * 0.14)} fill="#ffffff" />
          </g>
        ),
      };
    }
    case 'sunset': {
      const horizon = y0 + H * 0.7;
      const R = H * 0.55;
      return {
        box,
        el: (
          <g>
            <defs>
              {grad(`${id}-sun`, c1, c2)}
              <clipPath id={`${id}-clip`}>
                <rect x={x0} y={y0 - H} width={W} height={horizon - y0 + H} />
              </clipPath>
            </defs>
            <circle cx={0} cy={horizon} r={R} fill={`url(#${id}-sun)`} clipPath={`url(#${id}-clip)`} />
            {[0, 1, 2].map((i) => (
              <rect key={i} x={-R * (0.9 - i * 0.25)} y={horizon + H * (0.05 + i * 0.09)} width={R * 2 * (0.9 - i * 0.25)} height={H * 0.045} rx={H * 0.02} fill={c2} opacity={0.75 - i * 0.2} />
            ))}
          </g>
        ),
      };
    }
    case 'beach':
      return {
        box,
        el: (
          <g>
            <defs>
              {grad(`${id}-sky`, c1, '#e7f5ff')}
              <clipPath id={`${id}-clip`}>
                <rect x={x0} y={y0} width={W} height={H} rx={r} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${id}-clip)`}>
              <rect x={x0} y={y0} width={W} height={H} fill={`url(#${id}-sky)`} />
              <circle cx={x0 + W * 0.84} cy={y0 + H * 0.24} r={H * 0.14} fill="#ffd166" />
              <path d={wave(y0 + H * 0.6, H * 0.03, 2)} fill={c2} />
              <path d={wave(y0 + H * 0.66, H * 0.02, 3, 1)} fill="#ffffff" opacity={0.5} />
              <path d={wave(y0 + H * 0.8, H * 0.025, 1.5, 2)} fill="#f4d6a0" />
            </g>
            <rect x={x0} y={y0} width={W} height={H} rx={r} fill="none" stroke="#ffffff" strokeWidth={fs * 0.08 * s} />
          </g>
        ),
      };
    case 'brush': {
      const h = H * 0.58;
      const top = [];
      const bot = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const x = x0 + t * W;
        const taper = Math.min(1, t * 6, (1 - t) * 6);
        top.push(`${x},${cy - (h / 2) * taper + Math.sin(i * 2.3) * h * 0.05}`);
        bot.unshift(`${x},${cy + (h / 2) * taper + Math.cos(i * 1.7) * h * 0.06}`);
      }
      return { box: { x: x0, y: cy - h / 2, w: W, h }, el: <polygon points={[...top, ...bot].join(' ')} fill={c1} /> };
    }
    default:
      return null;
  }
}

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

  // Background shapes: scenes work with curved text too, pill/box/ribbon only with straight text
  let bgEl = null;
  const scene = layer.bg && !['none', 'pill', 'box', 'ribbon'].includes(layer.bg) ? sceneBg(layer, id, curved ? box.w - fs * 0.6 : width, fs, curved ? box.y + box.h / 2 : 0) : null;
  if (scene) {
    bgEl = <g opacity={layer.bgOpacity ?? 1}>{scene.el}</g>;
    const b = scene.box;
    const x1 = Math.min(box.x, b.x);
    const y1 = Math.min(box.y, b.y);
    box = { x: x1, y: y1, w: Math.max(box.x + box.w, b.x + b.w) - x1, h: Math.max(box.y + box.h, b.y + b.h) - y1 };
  } else if (!curved && layer.bg && layer.bg !== 'none') {
    const padX = fs * 0.45 * (layer.bgScale || 1);
    const bw = width + padX * 2;
    const bh = fs * 1.35 * (layer.bgScale || 1);
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
