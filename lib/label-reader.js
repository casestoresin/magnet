'use client';

// Read the text of a shipping label in the browser (free, no API key):
//  - PDF with real text  -> exact text via pdf.js
//  - scanned PDF / photo -> OCR via tesseract.js (English + Hindi)

async function loadPdf(data) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  return pdfjs.getDocument({ data }).promise;
}

// Group pdf.js text items into lines using their y position
async function pdfPageText(page) {
  const content = await page.getTextContent();
  const rows = [];
  content.items.forEach((it) => {
    if (!it.str || !it.str.trim()) return;
    const y = Math.round(it.transform[5]);
    const x = it.transform[4];
    let row = rows.find((r) => Math.abs(r.y - y) <= 3);
    if (!row) rows.push((row = { y, items: [] }));
    row.items.push({ x, s: it.str });
  });
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => r.items.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ')).join('\n');
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
    const page = await pdf.getPage(1);
    let text = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 2); i++) text += `${await pdfPageText(await pdf.getPage(i))}\n`;
    const canvas = await pdfPageToCanvas(page);
    const preview = canvas.toDataURL('image/jpeg', 0.85);
    // Enough real text? Then no OCR needed.
    if (text.replace(/\s/g, '').length > 40) return { text, method: 'pdf-text', preview };
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
