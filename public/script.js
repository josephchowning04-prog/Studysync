const form = document.querySelector('#study-form');
const titleInput = document.querySelector('#study-title');
const notesInput = document.querySelector('#study-notes');
const titleError = document.querySelector('#title-error');
const notesError = document.querySelector('#notes-error');
const formStatus = document.querySelector('#form-status');
const preview = document.querySelector('#notes-preview');
const previewTitle = document.querySelector('#preview-title');
const previewText = document.querySelector('#preview-text');
const previewCount = document.querySelector('#preview-count');
const sampleButton = document.querySelector('#load-sample');

function showFieldError(input, message, invalid) {
  message.hidden = !invalid;

  if (invalid) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', message.id);
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}

function showPreview() {

  const title = titleInput.value.trim();
  const notes = notesInput.value;
  const missingTitle = title === '';
  const missingNotes = notes.trim() === '';

  showFieldError(titleInput, titleError, missingTitle);
  showFieldError(notesInput, notesError, missingNotes);

  if (missingTitle || missingNotes) {
    preview.hidden = true;
    formStatus.textContent = '';
    const firstInvalidField = missingTitle ? titleInput : notesInput;
    firstInvalidField.focus();
    formStatus.textContent = 'Fill in the required fields to preview your notes.';
    return false;
  }

  const characterCount = Array.from(notes).length;
  const unit = characterCount === 1 ? 'character' : 'characters';
  previewTitle.textContent = title;
  previewText.textContent = notes;
  previewCount.textContent = `${characterCount.toLocaleString()} ${unit}`;
  preview.hidden = false;
  formStatus.textContent = 'Notes preview updated.';
  return true;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!formBusy) showPreview();
});

sampleButton.addEventListener('click', () => {
  if (!mayReplaceDraft()) return;
  withFormTask(async () => {
    const sample = await api('/api/sample');
    selectSet(null);
    fillForm(sample.title, sample.notes);
    formStatus.textContent = 'Sample notes loaded. Choose Preview Notes to see them.';
  }).then(() => titleInput.focus());
});

const saveButton = document.querySelector('#save-set');
const newButton = document.querySelector('#new-set');
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#set-search');
const setList = document.querySelector('#set-list');
const setsStatus = document.querySelector('#sets-status');
const pdfInput = document.querySelector('#pdf-file');
const pdfButton = document.querySelector('#import-pdf');
let selectedSet = null;
let searchVersion = 0;
let formBusy = false;

async function api(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Could not reach StudySync. Check the server and try again.');
  }
  if (response.status === 204) return;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function jsonRequest(method, body) {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function element(tag, content) {
  const node = document.createElement(tag);
  node.textContent = content;
  return node;
}

function button(label, action) {
  const node = element('button', label);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

function selectSet(set) {
  selectedSet = set;
  newButton.hidden = !set;
  saveButton.textContent = set ? 'Save Changes' : 'Save Study Set';
  document.dispatchEvent(new Event('study-set-changed'));
}

function fillForm(title, notes) {
  titleInput.value = title;
  notesInput.value = notes;
  preview.hidden = true;
  showFieldError(titleInput, titleError, false);
  showFieldError(notesInput, notesError, false);
}

function mayReplaceDraft() {
  const changed = titleInput.value !== (selectedSet?.title ?? '') || notesInput.value !== (selectedSet?.notes ?? '');
  return !changed || window.confirm('Discard unsaved changes in the editor?');
}

async function withFormTask(action, status = formStatus) {
  if (formBusy) return;
  formBusy = true;
  const controls = [titleInput, notesInput, sampleButton, newButton, saveButton, pdfInput, pdfButton];
  controls.forEach((control) => { control.disabled = true; });
  try {
    await action();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    formBusy = false;
    controls.forEach((control) => { control.disabled = false; });
  }
}

async function refreshSets() {
  const version = ++searchVersion;
  setsStatus.textContent = 'Loading saved sets…';
  try {
    const sets = await api('/api/sets?q=' + encodeURIComponent(searchInput.value.trim()));
    if (version !== searchVersion) return;
    setList.replaceChildren();
    for (const set of sets) {
      const row = document.createElement('li');
      const open = button('Open', () => {
        if (formBusy || !mayReplaceDraft()) return;
        withFormTask(async () => {
          const record = await api('/api/sets/' + set.id);
          selectSet(record);
          fillForm(record.title, record.notes);
          formStatus.textContent = 'Opened saved study set.';
        }).then(() => titleInput.focus());
      });
      open.setAttribute('aria-label', 'Open ' + set.title);
      const remove = button('Delete', () => {
        if (formBusy || !window.confirm('Delete this set and its progress?')) return;
        withFormTask(async () => {
          await api('/api/sets/' + set.id, { method: 'DELETE' });
          if (selectedSet?.id === set.id) {
            selectSet(null);
            fillForm('', '');
          }
          await refreshSets();
          searchInput.focus();
        }, setsStatus);
      });
      remove.setAttribute('aria-label', 'Delete ' + set.title);
      row.append(element('strong', set.title), open, remove);
      setList.append(row);
    }
    setsStatus.textContent = sets.length
      ? `${sets.length} saved ${sets.length === 1 ? 'set' : 'sets'} found.`
      : 'No saved sets match this search.';
  } catch (error) {
    if (version === searchVersion) setsStatus.textContent = error.message;
  }
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  refreshSets();
});

saveButton.addEventListener('click', () => {
  if (!showPreview()) return;
  const record = { title: titleInput.value, notes: notesInput.value };
  withFormTask(async () => {
    const id = selectedSet?.id;
    const set = await api(id ? '/api/sets/' + id : '/api/sets', jsonRequest(id ? 'PUT' : 'POST', record));
    selectSet(set);
    titleInput.value = set.title;
    formStatus.textContent = 'Study set saved.';
    await refreshSets();
  }).then(() => saveButton.focus());
});

newButton.addEventListener('click', () => {
  if (!mayReplaceDraft()) return;
  selectSet(null);
  fillForm('', '');
  formStatus.textContent = 'Ready for a new study set.';
  titleInput.focus();
});

pdfButton.addEventListener('click', () => {
  const file = pdfInput.files[0];
  if (!file || !/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) {
    formStatus.textContent = 'Choose a PDF file.';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    formStatus.textContent = 'Choose a PDF no larger than 2 MB.';
    return;
  }
  if (notesInput.value.trim() && !window.confirm('Replace the notes in the editor with extracted text?')) return;
  withFormTask(async () => {
    formStatus.textContent = 'Extracting PDF text…';
    const { notes } = await api('/api/pdf', { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: file });
    fillForm(titleInput.value || file.name.slice(0, -4).slice(0, 120), notes);
    showPreview();
    formStatus.textContent = 'PDF text extracted. Review it before saving.';
  });
});

refreshSets();
