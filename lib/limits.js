const limits = { title: 120, notes: 12000, pdf: 2 * 1024 * 1024, pages: 30, minItems: 2, maxItems: 6 };

class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function studyInput(body) {
  const { title, notes } = body || {};
  if (typeof title !== 'string' || !title.trim()) throw new InputError('Enter a subject or title.');
  if (typeof notes !== 'string' || !notes.trim()) throw new InputError('Enter some study notes.');
  if (title.length > limits.title || notes.length > limits.notes) {
    throw new InputError('Use up to 120 characters for the title and 12,000 for notes.');
  }
  if (title.includes('\0') || notes.includes('\0')) throw new InputError('Remove null characters from the input.');
  return { title: title.trim(), notes };
}

module.exports = { limits, InputError, studyInput };
