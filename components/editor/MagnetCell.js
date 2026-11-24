'use client';

import { createElement, memo } from 'react';
import { imageArea, placeImage, shapeGeometry } from '@/lib/layout';
import { printUrl } from '@/lib/image-url';
import { LayersView } from './Layers';

const Shape = ({ g, ...rest }) => createElement(g.tag, { ...g.attrs, ...rest });

// fontTick is only here so cells re-measure text once web fonts finish loading
// eslint-disable-next-line no-unused-vars
function MagnetCell({ slot, frame, marks, uid, x, y, selected, problem, index, activeLayerId, fontTick, onPointerDown, onLayerPointerDown, onDropPhoto, onDoubleClick }) {
  const b = frame.bleed;
  const cw = frame.width + 2 * b;
  const ch = frame.height + 2 * b;
  const radius = frame.radius || 0;

  const outer = shapeGeometry(frame.shape, 0, 0, cw, ch, radius + b);
  const area = imageArea(frame);
  const inner = area.inset ? shapeGeometry(frame.shape, area.x, area.y, area.w, area.h, Math.max(0, radius - (frame.border || 0))) : outer;
  const cut = shapeGeometry(frame.shape, b, b, frame.width, frame.height, radius);
  const s = marks.safeMargin || 0;
  const safe = shapeGeometry(frame.shape, b + s, b + s, frame.width - 2 * s, frame.height - 2 * s, Math.max(0, radius - s));

  const hasPhoto = !!(slot && slot.url);
  const place = hasPhoto ? placeImage(slot, area) : null;
  const lowDpi = place && place.dpi < 150;

  const filter = hasPhoto
    ? `brightness(${slot.brightness ?? 100}%) contrast(${slot.contrast ?? 100}%) saturate(${slot.saturate ?? 100}%) grayscale(${slot.grayscale ?? 0}%) sepia(${slot.sepia ?? 0}%)`
    : undefined;

  return (
    <div
      className={`cell ${selected ? 'is-selected' : ''} ${hasPhoto ? 'has-photo' : 'is-empty'} ${problem ? 'is-problem' : ''}`}
      style={{ left: `${x}mm`, top: `${y}mm`, width: `${cw}mm`, height: `${ch}mm` }}
      onPointerDown={(e) => onPointerDown?.(e, index)}
      onDoubleClick={() => onDoubleClick?.(index)}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-magnet-photo')) {
          e.preventDefault();
          e.currentTarget.classList.add('drop-over');
        }
      }}
      onDragLeave={(e) => e.currentTarget.classList.remove('drop-over')}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drop-over');
        const raw = e.dataTransfer.getData('application/x-magnet-photo');
        if (raw) onDropPhoto?.(index, JSON.parse(raw));
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${cw} ${ch}`} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <clipPath id={`o-${uid}`}>
            <Shape g={outer} />
          </clipPath>
          <clipPath id={`i-${uid}`}>
            <Shape g={inner} />
          </clipPath>
        </defs>

        {hasPhoto && (
          <g clipPath={`url(#o-${uid})`}>
            <rect x={0} y={0} width={cw} height={ch} fill={area.inset ? frame.borderColor || '#fff' : slot.bg || '#fff'} />
            {area.inset && <Shape g={inner} fill={slot.bg || '#fff'} />}
            <g clipPath={`url(#i-${uid})`}>
              <image
                href={printUrl(slot.url)}
                x={place.x}
                y={place.y}
                width={place.width}
                height={place.height}
                transform={place.transform}
                preserveAspectRatio="none"
                style={{ filter }}
              />
            </g>
            <LayersView
              layers={slot.layers}
              frame={frame}
              uid={uid}
              index={index}
              activeLayerId={activeLayerId}
              onLayerPointerDown={onLayerPointerDown}
            />
          </g>
        )}

        {marks.outline && hasPhoto && (
          <Shape g={cut} fill="none" stroke={marks.outlineColor || '#999'} strokeWidth={marks.outlineWidth || 0.2} />
        )}
        <Shape g={cut} className="screen-only cut-guide" fill="none" strokeWidth={0.3} />
        {marks.safeArea && (
          <Shape g={safe} className="screen-only safe-guide" fill="none" strokeWidth={0.3} strokeDasharray="1.5 1" />
        )}
      </svg>

      {!hasPhoto && (
        <div className="cell-empty screen-only">
          <span>+</span>
          <small>Drop photo</small>
        </div>
      )}
      {lowDpi && (
        <div className="cell-warn screen-only" title={`Only ${Math.round(place.dpi)} DPI — may print blurry`}>
          Low DPI
        </div>
      )}
    </div>
  );
}

export default memo(MagnetCell);
