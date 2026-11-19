const aiStatus = document.querySelector('#ai-status');
const aiCheck = document.querySelector('#check-ai');
const itemCount = document.querySelector('#item-count');
const studySource = document.querySelector('#study-source');
const studyStatus = document.querySelector('#study-status');
const sessionPanel = document.querySelector('#study-session');
const sessionHeading = document.querySelector('#session-heading');
const sessionSource = document.querySelector('#session-source');
const reviewNotice = document.querySelector('#review-notice');
const sessionBody = document.querySelector('#session-body');
const generationButtons = [...document.querySelectorAll('[data-generate]')];
const demoButtons = [...document.querySelectorAll('[data-demo]')];
let aiAvailable = false;
let studyBusy = false;
let session = null;
const progressPanel = document.querySelector('#progress-panel');
const progressHeading = document.querySelector('#progress-heading');
const progressStatus = document.querySelector('#progress-status');
const progressList = document.querySelector('#progress-list');
const progressButton = document.querySelector('#view-progress');
const resetProgressButton = document.querySelector('#reset-progress');
let progressSet = null;
let progressVersion = 0;

function updateStudyControls() {
  generationButtons.forEach((control) => { control.disabled = studyBusy || !selectedSet || !aiAvailable; });
  demoButtons.forEach((control) => { control.disabled = studyBusy; });
  itemCount.disabled = studyBusy;
  progressButton.disabled = !selectedSet;
  studySource.textContent = selectedSet
    ? `AI source: saved notes for “${selectedSet.title}”. Save edits before generating. Demo uses fictional biology notes.`
    : 'Open or save a study set to generate AI material. Demo uses fictional biology notes.';
}

async function checkAI() {
  aiCheck.disabled = true;
  aiStatus.textContent = 'Checking Ollama…';
  try {
    const status = await api('/api/ai/status');
    aiAvailable = status.available;
    aiStatus.textContent = status.message;
  } catch (error) {
    aiAvailable = false;
    aiStatus.textContent = error.message;
  } finally {
    aiCheck.disabled = false;
    updateStudyControls();
  }
}

async function beginStudy(mode, demo) {
  if (studyBusy) return;
  const sourceSet = selectedSet;
  if (!demo && (!sourceSet || !aiAvailable)) return;
  studyBusy = true;
  updateStudyControls();
  studyStatus.textContent = demo ? 'Loading predefined demo…' : 'Generating study material with Ollama…';
  try {
    const route = demo ? '/api/demo' : '/api/sets/' + sourceSet.id + '/generate';
    const count = demo ? 3 : Number(itemCount.value);
    const material = await api(route, jsonRequest('POST', { mode, count, requestedSetId: demo ? sourceSet?.id : undefined }));
    session = { ...material, attempt: 0, sourceTitle: demo ? 'Fictional cell biology notes' : sourceSet.title };
    restartSession();
    studyStatus.textContent = '';
    sessionHeading.focus();
  } catch (error) {
    studyStatus.textContent = error.message;
  } finally {
    studyBusy = false;
    updateStudyControls();
  }
}

function actions(...controls) {
  const group = document.createElement('div');
  group.className = 'form-actions';
  group.append(...controls);
  return group;
}

function showFocused(node) {
  node.tabIndex = -1;
  sessionBody.replaceChildren(node);
  node.focus();
}

function restartSession() {
  session.index = 0;
  session.attempt++;
  session.flipped = false;
  session.marks = session.items.map(() => null);
  session.choices = [];
  sessionHeading.textContent = { cards: 'Flashcards', quiz: 'Practice Quiz', guide: 'Study Guide' }[session.mode];
  sessionSource.textContent = (session.source === 'ai' ? 'AI-generated' : 'Predefined Demo') + ' · ' + session.sourceTitle;
  if (session.source === 'ai' && session.mode !== 'guide') {
    sessionSource.textContent += ' · Use the same answer for each blank in an item.';
  }
  reviewNotice.hidden = session.source !== 'ai';
  sessionPanel.hidden = false;
  if (session.mode === 'cards') renderCard();
  else if (session.mode === 'quiz') renderQuiz();
  else renderGuide();
}

function renderCard(focusId) {
  const { items, index, marks, flipped } = session;
  const card = items[index];
  const reviewed = marks.filter(Boolean).length;
  const position = element('p', `Card ${index + 1} of ${items.length} · ${reviewed} reviewed · ${marks.filter((mark) => mark === 'known').length} known`);
  position.tabIndex = -1;
  const question = element('h3', card.prompt);
  position.id = 'card-position';
  const answer = element('p', flipped ? card.answer : 'Flip the card to reveal the answer.');
  answer.id = 'card-answer';
  answer.className = 'study-answer';
  const flip = button(flipped ? 'Show Question' : 'Flip Card', () => {
    session.flipped = !session.flipped;
    renderCard('flip-card');
  });
  flip.id = 'flip-card';
  flip.setAttribute('aria-controls', 'card-answer');
  flip.setAttribute('aria-expanded', String(flipped));
  const previous = button('Previous Card', () => moveCard(-1));
  previous.disabled = index === 0;
  const next = button('Next Card', () => moveCard(1));
  next.disabled = index === items.length - 1;
  const known = button('Known', () => markCard('known'));
  known.id = 'known-card';
  known.disabled = !flipped;
  known.setAttribute('aria-pressed', String(marks[index] === 'known'));
  const again = button('Study Again', () => markCard('again'));
  again.id = 'again-card';
  again.disabled = !flipped;
  again.setAttribute('aria-pressed', String(marks[index] === 'again'));
  const finish = button('Finish Flashcards', () => {
    const summary = StudyRules.cardSummary(items, marks);
    if (summary) renderSummary(summary, 'Known cards');
  });
  finish.disabled = reviewed !== items.length;
  sessionBody.replaceChildren(position, question, answer);
  if (flipped) sessionBody.append(element('p', 'From the notes: ' + card.evidence));
  sessionBody.append(actions(previous, flip, next), actions(known, again, finish));
  if (focusId) (document.getElementById(focusId) || position).focus();
}

function moveCard(change) {
  const index = session.index + change;
  if (index < 0 || index >= session.items.length) return;
  session.index = index;
  session.flipped = false;
  renderCard('card-position');
}

function markCard(mark) {
  session.marks[session.index] = mark;
  renderCard(mark === 'known' ? 'known-card' : 'again-card');
}

function renderQuiz(focusQuestion = false) {
  const { items, index } = session;
  const question = items[index];
  const position = element('p', `Question ${index + 1} of ${items.length}`);
  const quizForm = document.createElement('form');
  const fieldset = document.createElement('fieldset');
  const legend = element('legend', question.prompt);
  legend.tabIndex = -1;
  fieldset.append(legend);
  question.options.forEach((option, optionIndex) => {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'answer';
    input.value = String(optionIndex);
    const label = document.createElement('label');
    label.append(input, element('span', option));
    fieldset.append(label);
  });

  const submit = element('button', 'Submit Answer');
  submit.type = 'submit';
  const feedback = element('p', '');
  feedback.setAttribute('role', 'status');
  feedback.tabIndex = -1;
  quizForm.append(fieldset, actions(submit), feedback);
  quizForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (submit.disabled) return;

    const radio = fieldset.querySelector(':checked');
    const choice = radio ? Number(radio.value) : null;
    const result = StudyRules.quizAnswer(question, choice);
    if (!result) {
      feedback.textContent = 'Select an answer before submitting.';
      fieldset.querySelector('input').focus();
      return;
    }

    session.choices[index] = choice;
    fieldset.disabled = true;
    submit.disabled = true;
    feedback.textContent = (result.correct ? 'Correct. ' : 'Incorrect. Correct answer: ' + result.answer + '. ') + result.explanation;
    const last = index === items.length - 1;
    quizForm.append(actions(button(last ? 'See Quiz Score' : 'Next Question', () => {
      if (last) {
        const summary = StudyRules.quizSummary(items, session.choices);
        renderSummary(summary, 'Quiz score', true);
      } else {
        session.index++;
        renderQuiz(true);
      }
    })));
    feedback.focus();
  });
  sessionBody.replaceChildren(position, quizForm);
  if (focusQuestion) legend.focus();
}

function renderGuide() {
  const list = document.createElement('dl');
  for (const item of session.items) {
    const concept = element('dt', item.concept);
    const description = document.createElement('dd');
    description.append(element('p', 'Definition: ' + item.definition), element('p', 'Summary from the notes: ' + item.summary));
    list.append(concept, description);
  }
  sessionBody.replaceChildren(element('h3', 'Key concepts, definitions, and summaries'), list);
}

function renderSummary(summary, label, percentage = false) {
  const heading = element('h3', 'Session summary');
  showFocused(heading);
  const percent = percentage ? ` (${Math.round(100 * summary.score / summary.total)}%)` : '';
  sessionBody.append(element('p', `${label}: ${summary.score} of ${summary.total}${percent}`));
  if (summary.missed.length) {
    const list = document.createElement('ul');
    for (const item of summary.missed) list.append(element('li', item.prompt + ' — ' + item.answer));
    sessionBody.append(element('h4', 'Review these items'), list);
  }
  showSaveProgress();
  sessionBody.append(actions(button(percentage ? 'Retry Quiz' : 'Restart Session', () => {
    restartSession();
    sessionHeading.focus();
  })));
}

for (const control of generationButtons) {
  control.addEventListener('click', () => beginStudy(control.dataset.generate, false));
}
for (const control of demoButtons) {
  control.addEventListener('click', () => beginStudy(control.dataset.demo, true));
}
aiCheck.addEventListener('click', checkAI);
document.addEventListener('study-set-changed', () => {
  updateStudyControls();
  if (progressSet?.id !== selectedSet?.id) {
    progressVersion++;
    progressSet = null;
    progressPanel.hidden = true;
  }
});
sessionPanel.addEventListener('keydown', (event) => {
  if (session?.mode !== 'cards' || !sessionBody.querySelector('#flip-card') || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    moveCard(event.key === 'ArrowLeft' ? -1 : 1);
  }
});
checkAI();

function showSaveProgress() {
  if (!session.token) {
    sessionBody.append(element('p', 'To track demo progress, load and save the sample notes, then start the demo from that set.'));
    return;
  }

  const completed = session;
  const payload = {
    token: completed.token, attempt: completed.attempt,
    responses: [...(completed.mode === 'quiz' ? completed.choices : completed.marks)]
  };
  const status = element('p', '');
  status.setAttribute('role', 'status');
  const save = button('Save Attempt', saveAttempt);

  async function saveAttempt() {
    save.disabled = true;
    status.textContent = 'Saving progress…';
    try {
      await api('/api/sets/' + completed.setId + '/progress', jsonRequest('POST', payload));
      status.textContent = 'Attempt saved.';
      save.hidden = true;
      if (progressSet?.id === completed.setId) await showProgress(progressSet);
    } catch (error) {
      status.textContent = error.message;
      save.disabled = false;
    }
  }

  sessionBody.append(save, status);
  saveAttempt();
}

async function showProgress(set, focus = false, notice = '') {
  const version = ++progressVersion;
  progressSet = set;
  progressPanel.hidden = false;
  progressHeading.textContent = 'Study progress · ' + set.title;
  progressStatus.textContent = 'Loading progress…';
  progressList.replaceChildren();
  resetProgressButton.hidden = true;
  if (focus) progressHeading.focus();
  try {
    const records = await api('/api/sets/' + set.id + '/progress');
    if (version !== progressVersion) return;
    for (const record of records) {
      const date = new Date(record.created_at).toLocaleString();
      const name = record.mode === 'quiz' ? 'Quiz score' : 'Known flashcards';
      const row = document.createElement('li');
      row.append(element('strong', `${name}: ${record.score} of ${record.total}`), element('p', date));
      if (record.missed.length) {
        row.append(element('p', record.mode === 'quiz' ? 'Missed questions' : 'Study again'));
        const missed = document.createElement('ul');
        for (const item of record.missed) missed.append(element('li', item.prompt + ' — ' + item.answer));
        row.append(missed);
      }
      progressList.append(row);
    }
    progressStatus.textContent = notice || (records.length ? 'Showing up to 50 recent attempts.' : 'No completed attempts for this set yet.');
    resetProgressButton.hidden = records.length === 0;
  } catch (error) {
    if (version === progressVersion) progressStatus.textContent = error.message;
  }
}

progressButton.addEventListener('click', () => {
  if (selectedSet) showProgress(selectedSet, true);
});

resetProgressButton.addEventListener('click', async () => {
  const set = progressSet;
  if (!set || !window.confirm('Reset all saved progress for this set?')) return;
  resetProgressButton.disabled = true;
  try {
    await api('/api/sets/' + set.id + '/progress', { method: 'DELETE' });
    if (progressSet?.id === set.id) await showProgress(set, true, 'Progress reset.');
  } catch (error) {
    if (progressSet?.id === set.id) progressStatus.textContent = error.message;
  } finally {
    resetProgressButton.disabled = false;
  }
});
