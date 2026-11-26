// Client-side API helpers

async function json(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // params: { q, tag, project: orderId | 'none', stickers: 1 }
  listPhotos: (params = {}) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && p.set(k, v));
    return fetch(`/api/photos?${p}`).then(json);
  },
  findOrder: (orderNumber) => fetch(`/api/projects?order=${encodeURIComponent(orderNumber)}`).then(json),
  updatePhoto: (id, body) =>
    fetch(`/api/photos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(json),
  deletePhoto: (id) => fetch(`/api/photos/${id}`, { method: 'DELETE' }).then(json),
  savePhotos: (photos, tag, project) =>
    fetch('/api/photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photos, tag, project }) }).then(json),

  listProjects: () => fetch('/api/projects').then(json),
  getProject: (id) => fetch(`/api/projects/${id}`).then(json),
  createProject: (body) =>
    fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(json),
  saveProject: (id, body) =>
    fetch(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(json),
  deleteProject: (id, withPhotos = false) => fetch(`/api/projects/${id}${withPhotos ? '?photos=1' : ''}`, { method: 'DELETE' }).then(json),
};

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  window.location.href = '/login';
}

// Upload one file straight from the browser to Cloudinary (signed), with progress
function uploadToCloudinary(file, sig, onBytes) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', sig.timestamp);
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onBytes((e.loaded / e.total) * file.size);
    xhr.onload = () => {
      let body = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(`${file.name}: ${body.error?.message || `upload failed (${xhr.status})`}`));
    };
    xhr.onerror = () => reject(new Error(`${file.name}: network error`));
    xhr.send(form);
  });
}

// Uploads go browser -> Cloudinary directly (no server size limit), then metadata is saved to MongoDB.
// Upload a shipping label (image or PDF) to Cloudinary. Returns { url, publicId, format, preview }
export async function uploadLabel(file) {
  const sigRes = await fetch('/api/photos/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'label' }) });
  const sig = await sigRes.json().catch(() => ({}));
  if (!sigRes.ok) throw new Error(sig.error || 'Could not start label upload');
  const r = await uploadToCloudinary(file, sig, () => {});
  const isPdf = r.format === 'pdf';
  // Cloudinary can render page 1 of a PDF as a JPG, which always displays in the browser
  const preview = isPdf ? r.secure_url.replace('/upload/', '/upload/pg_1,w_1000/').replace(/\.pdf$/i, '.jpg') : r.secure_url;
  return { url: r.secure_url, publicId: r.public_id, format: r.format, preview, name: file.name };
}

export async function uploadPhotos(fileList, { tag = '', project = null, onProgress } = {}) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
  if (!files.length) return { photos: [], errors: ['No image files selected'] };

  const sigRes = await fetch('/api/photos/sign', { method: 'POST' });
  const sig = await sigRes.json().catch(() => ({}));
  if (!sigRes.ok) return { photos: [], errors: [sig.error || 'Could not start upload'] };

  const totalBytes = files.reduce((a, f) => a + f.size, 0) || 1;
  const loaded = new Array(files.length).fill(0);
  const report = () => onProgress && onProgress(Math.min(99, Math.round((loaded.reduce((a, b) => a + b, 0) / totalBytes) * 100)));
  const results = [];
  const errors = [];

  // 3 uploads at a time
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const i = next++;
      try {
        const r = await uploadToCloudinary(files[i], sig, (b) => {
          loaded[i] = b;
          report();
        });
        results.push({ name: files[i].name, url: r.secure_url, publicId: r.public_id, width: r.width, height: r.height, bytes: r.bytes, format: r.format });
      } catch (e) {
        errors.push(e.message);
      }
      loaded[i] = files[i].size;
      report();
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));

  let photos = [];
  if (results.length) {
    try {
      photos = (await api.savePhotos(results, tag, project)).photos || [];
    } catch (e) {
      errors.push(`Saving to database failed: ${e.message}`);
    }
  }
  onProgress && onProgress(100);
  return { photos, errors };
}
