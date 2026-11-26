'use client';

// Read the text of a shipping label in the browser (free, no API key):
//  - PDF with real text  -> exact text via pdf.js
//  - scanned PDF / photo -> OCR via tesseract.js (English + Hindi)

async function loadPdf(data) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  return pdfjs.getDocument({ data }).promise;
}

// Text in the PDF's own reading order. (Grouping by height would merge side-by-side boxes,
// e.g. the customer address with the courier box on Meesho labels.)
export function pdfItemsToText(items) {
  let out = '';
  let lastY = null;
  let lastEnd = null;
  for (const it of items) {
    if (typeof it.str !== 'string') continue;
    const x = it.transform[4];
    const y = it.transform[5];
    if (lastY !== null && Math.abs(y - lastY) > 2 && !out.endsWith('\n')) out += '\n';
    else if (lastEnd !== null && x - lastEnd > 1 && it.str && !/[\s\n]$/.test(out) && !it.str.startsWith(' ')) out += ' ';
    out += it.str;
    if (it.hasEOL) out += '\n';
    lastY = y;
    lastEnd = x + (it.width || 0);
  }
  return out;
}

async function pdfPageText(page) {
  return pdfItemsToText((await page.getTextContent()).items);
}

async function pdfPageToCanvas(page, scale = 2.5) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  return canvas;
}

async function ocr(image, onProgress) {
  const Tesseract = (await import('tesseract.js')).default;
  const { data } = await Tesseract.recognize(image, 'eng+hin', {
    logger: (m) => m.status === 'recognizing text' && onProgress?.(`Reading label… ${Math.round(m.progress * 100)}%`),
  });
  return data.text || '';
}

// Returns { text, method, preview } where preview is a data URL of page 1 (for PDFs) or null
export async function readLabelFile(file, onProgress) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (isPdf) {
    onProgress?.('Opening PDF…');
    const pdf = await loadPdf(new Uint8Array(await file.arrayBuffer()));
    // Only page 1: label PDFs often hold one order per page
    const page = await pdf.getPage(1);
    const text = await pdfPageText(page);
    const canvas = await pdfPageToCanvas(page);
    const preview = canvas.toDataURL('image/jpeg', 0.85);
    // Enough real text? Then no OCR needed.
    if (text.replace(/\s/g, '').length > 40) return { text, method: 'pdf-text', preview, pages: pdf.numPages };
    onProgress?.('Scanned PDF — reading with OCR…');
    return { text: await ocr(canvas, onProgress), method: 'ocr', preview };
  }
  onProgress?.('Reading label photo…');
  return { text: await ocr(file, onProgress), method: 'ocr', preview: null };
}

// Re-read a label that is already uploaded (uses Cloudinary's JPG render of page 1)
export async function readLabelUrl(url, onProgress) {
  return { text: await ocr(url, onProgress), method: 'ocr', preview: null };
}
