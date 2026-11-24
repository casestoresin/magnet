'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, uploadPhotos } from '@/lib/api';
import { thumbUrl } from '@/lib/image-url';

export function usePhotos() {
  const [photos, setPhotos] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listPhotos();
      setPhotos(data.photos);
      setTags(data.tags || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { photos, setPhotos, tags, loading, error, refresh };
}

// Upload drop zone + photo grid. Used on /photos and inside the editor.
export default function PhotoLibrary({
  lib,
  compact = false,
  selected = [],
  onToggleSelect,
  onPhotoClick,
  usage = {},
  draggable = false,
}) {
  const { photos, setPhotos, tags, loading, error, refresh } = lib;
  const [progress, setProgress] = useState(null);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [tag, setTag] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [q, setQ] = useState('');
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);

  const doUpload = async (files) => {
    if (!files || !files.length) return;
    setProgress(0);
    setUploadErrors([]);
    const { photos: added, errors } = await uploadPhotos(files, { tag, onProgress: setProgress });
    setPhotos((p) => [...added, ...p]);
    setUploadErrors(errors);
    setProgress(null);
    if (tag) refresh();
  };

  const remove = async (photo) => {
    if (!confirm(`Delete "${photo.name}" permanently from Cloudinary?`)) return;
    await api.deletePhoto(photo._id);
    setPhotos((p) => p.filter((x) => x._id !== photo._id));
  };

  const visible = photos.filter(
    (p) => (!filterTag || p.tag === filterTag) && (!q || `${p.name} ${p.tag}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className={`library ${compact ? 'compact' : ''}`}>
      <div
        className={`dropzone ${over ? 'over' : ''}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          doUpload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => doUpload(e.target.files)} />
        {progress !== null ? (
          <div className="progress">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
            <span>Uploading… {progress}%</span>
          </div>
        ) : (
          <>
            <strong>⬆ Upload photos</strong>
            <span>Click or drop images here</span>
          </>
        )}
      </div>
      <div className="library-tools">
        <input className="input" placeholder="Tag for new uploads (customer / order)" value={tag} onChange={(e) => setTag(e.target.value)} />
      </div>
      {uploadErrors.length > 0 && <div className="alert error">{uploadErrors.join(' · ')}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="library-tools">
        <input className="input" placeholder="Search photos…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="muted">Loading photos…</p>}
      {!loading && visible.length === 0 && <p className="muted">No photos yet. Upload some to get started.</p>}

      <div className="photo-grid">
        {visible.map((p) => {
          const isSel = selected.includes(p._id);
          const lowRes = Math.min(p.width || 0, p.height || 0) < 600;
          return (
            <div
              key={p._id}
              className={`photo-tile ${isSel ? 'selected' : ''}`}
              draggable={draggable}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-magnet-photo', JSON.stringify(p));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={(e) => (onPhotoClick ? onPhotoClick(p, e) : onToggleSelect?.(p))}
              title={`${p.name}\n${p.width}×${p.height}px${p.tag ? `\nTag: ${p.tag}` : ''}`}
            >
              <img src={thumbUrl(p.url)} alt={p.name} loading="lazy" draggable={false} />
              {onToggleSelect && (
                <button
                  className={`tile-check ${isSel ? 'on' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(p);
                  }}
                  title="Select"
                >
                  {isSel ? '✓' : ''}
                </button>
              )}
              {usage[p._id] > 0 && <span className="tile-badge">×{usage[p._id]}</span>}
              {lowRes && <span className="tile-warn" title="Low resolution — may print blurry">!</span>}
              <button
                className="tile-del"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(p);
                }}
                title="Delete photo"
              >
                ✕
              </button>
              {!compact && (
                <div className="tile-meta">
                  <span>{p.name}</span>
                  <small>
                    {p.width}×{p.height}
                    {p.tag ? ` · ${p.tag}` : ''}
                  </small>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
