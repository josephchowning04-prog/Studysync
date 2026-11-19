const { Worker } = require('node:worker_threads');
const path = require('node:path');
const { InputError } = require('./limits');

let active = false;

async function extractPdf(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.subarray(0, 5).toString() !== '%PDF-') {
    throw new InputError('Choose a valid PDF file.', 415);
  }
  if (active) throw new InputError('A PDF is already being processed. Try again shortly.', 429);

  active = true;
  try {
    return await new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'pdf-worker.js'), {
        workerData: new Uint8Array(bytes),
        resourceLimits: { maxOldGenerationSizeMb: 96 }
      });
      const timer = setTimeout(() => {
        reject(new InputError('PDF processing timed out. Try a smaller text-based file.', 422));
        worker.terminate();
      }, 8000);
      worker.once('message', ({ text, error }) => {
        clearTimeout(timer);
        if (error) reject(new InputError(error, 422));
        else resolve(text);
      });
      worker.once('exit', () => {
        clearTimeout(timer);
        reject(new InputError('Could not extract text from this PDF.', 422));
      });
      worker.once('error', () => {
        clearTimeout(timer);
        reject(new InputError('Could not extract text from this PDF.', 422));
      });
    });
  } finally {
    active = false;
  }
}

module.exports = { extractPdf };
