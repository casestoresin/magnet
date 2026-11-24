// Client-safe Cloudinary URL helpers (insert a transformation into a delivery URL)

export function cldTransform(url, transformation) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/${transformation}/`);
}

// Small square thumbnail for the library
export const thumbUrl = (url) => cldTransform(url, 'c_fill,w_300,h_300,g_auto,f_auto,q_auto');

// Full-resolution, browser-friendly (handles HEIC etc.) — used for editing & printing
export const printUrl = (url) => cldTransform(url, 'f_auto,q_auto:best');
