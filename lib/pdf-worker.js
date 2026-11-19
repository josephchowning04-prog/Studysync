const { parentPort, workerData } = require('node:worker_threads');
const { limits } = require('./limits');

async function extract(bytes) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    useWasm: false,
    stopAtErrors: true,
    verbosity: 0
  });

  try {
    const pdf = await task.promise;
    if (pdf.numPages > limits.pages) throw new Error('Use a PDF with 30 pages or fewer.');
    const pages = [];
    let length = 0;
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
      length += text.length + (pages.length ? 2 : 0);
      if (length > limits.notes) throw new Error('This PDF contains more than 12,000 characters. Upload a shorter PDF.');
      pages.push(text);
      page.cleanup();
    }
    const text = pages.join('\n\n').trim();
    if (!text) throw new Error('No selectable text was found. Scanned or image-only PDFs need OCR first.');
    return text;
  } finally {
    await task.destroy();
  }
}

extract(workerData).then(
  (text) => parentPort.postMessage({ text }),
  (error) => parentPort.postMessage({
    error: error.name === 'PasswordException' ? 'Upload an unlocked PDF.' :
      /^(Use a PDF|This PDF|No selectable text)/.test(error.message) ? error.message :
        'This PDF is damaged or uses an unsupported format.'
  })
);
