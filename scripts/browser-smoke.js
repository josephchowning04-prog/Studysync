// Optional browser check with local Chrome and its DevTools protocol.
const { spawn } = require('node:child_process');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { openDatabase } = require('../lib/db');
const { createApp } = require('../server');
const { createProvider } = require('../lib/ai');

async function until(read) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const value = await read();
      if (value) return value;
    } catch {}
    await delay(100);
  }
  throw new Error('Timed out waiting for the browser.');
}

async function scenarios() {
  const get = (selector) => document.querySelector(selector);
  const click = (label) => {
    const control = [...document.querySelectorAll('button')].find((node) => node.textContent === label && !node.disabled && node.getClientRects().length);
    if (!control) throw new Error('Unavailable control: ' + label);
    control.click();
  };
  const wait = async (predicate) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    throw new Error('Timed out: ' + predicate.toString());
  };
  const check = (condition, label) => {
    if (!condition) throw new Error(label);
  };

  const results = [];
  await wait(() => get('#ai-status')?.textContent.includes('disabled'));
  check(get('[data-generate]').disabled, 'AI generation must be disabled');
  await wait(() => get('#sets-status').textContent.startsWith('No saved'));
  check(innerWidth <= 520 && document.documentElement.scrollWidth <= innerWidth, 'Mobile layout overflowed or viewport was too wide');
  results.push('Configured-off AI and mobile layout');

  const title = get('#study-title');
  const notes = get('#study-notes');
  click('Preview Notes');
  check(document.activeElement === title && !get('#title-error').hidden, 'Missing title did not show an error');
  title.value = 'Biology';
  notes.value = ' \n\t ';
  click('Preview Notes');
  check(document.activeElement === notes && !get('#notes-error').hidden, 'Whitespace notes did not show an error');

  const markup = '<script>window.smokeExecuted = true</script><b>Notes</b>';
  title.value = '<b>Biology</b>';
  notes.value = markup;
  click('Preview Notes');
  check(get('#preview-title').textContent === title.value && get('#preview-title').children.length === 0, 'Title was parsed as HTML');
  check(get('#preview-text').textContent === markup && get('#preview-text').children.length === 0 && !window.smokeExecuted, 'Notes were parsed or executed');
  check(get('#preview-count').textContent === Array.from(markup).length + ' characters', 'Character count failed');
  results.push('Validation, focus, literal preview, character count, and no script execution');

  window.confirm = () => true;
  click('Load Sample Notes');
  await wait(() => notes.value.includes('Chloroplasts'));
  click('Save Study Set');
  await wait(() => get('#set-list li') && !get('#save-set').disabled);
  click('Open');
  await wait(() => get('#form-status').textContent === 'Opened saved study set.' && !get('#save-set').disabled);
  title.value = 'Fictional Biology Review';
  click('Save Changes');
  await wait(() => get('#set-list').textContent.includes(title.value));
  get('#set-search').value = 'missing title';
  click('Search');
  await wait(() => get('#sets-status').textContent.startsWith('No saved'));
  get('#set-search').value = 'Biology Review';
  click('Search');
  await wait(() => get('#set-list li'));
  results.push('Sample, create, open, edit, and search');

  click('Try Demo Flashcards');
  await wait(() => get('#flip-card'));
  click('Flip Card');
  check(get('#card-answer').textContent === 'Cell membrane', 'Flashcard did not flip');
  click('Known');
  get('#session-heading').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  check(get('#card-position').textContent.startsWith('Card 2'), 'Keyboard did not advance card');
  click('Flip Card');
  click('Study Again');
  click('Next Card');
  click('Flip Card');
  click('Known');
  click('Finish Flashcards');
  await wait(() => get('#session-body').textContent.includes('Attempt saved.'));
  check(get('#session-body').textContent.includes('Known cards: 2 of 3'), 'Flashcard summary incorrect');
  click('Restart Session');
  check(get('#card-position').textContent.includes('0 reviewed'), 'Flashcard restart retained marks');
  results.push('Flashcard flip, keyboard navigation, marks, summary, restart, and saved attempt');

  click('Try Demo Quiz');
  await wait(() => get('#session-body fieldset'));
  click('Submit Answer');
  check(get('#session-body').textContent.includes('Select an answer'), 'Quiz graded missing input');
  for (const [index, choice] of [0, 0, 2].entries()) {
    get('#session-body input[value="' + choice + '"]').click();
    click('Submit Answer');
    check(get('#session-body [role="status"]').textContent.startsWith(index === 1 ? 'Incorrect.' : 'Correct.'), 'Unexpected quiz feedback');
    click(index === 2 ? 'See Quiz Score' : 'Next Question');
  }
  check(get('#session-body').textContent.includes('Quiz score: 2 of 3 (67%)'), 'Quiz score incorrect');
  check(get('#session-body li').textContent.includes('Nucleus'), 'Missed answer was not displayed');
  await wait(() => get('#session-body').textContent.includes('Attempt saved.'));
  click('Retry Quiz');
  check(get('#session-body').textContent.includes('Question 1 of 3'), 'Quiz retry did not reset');
  results.push('Quiz validation, immediate feedback, score, missed question, retry, and saved attempt');

  click('Try Demo Study Guide');
  await wait(() => get('#session-body dl'));
  check(get('#session-source').textContent.includes('Predefined Demo'), 'Demo not labeled');
  check(document.querySelectorAll('#session-body dt').length === 3, 'Study guide missing concepts');
  click('View Set Progress');
  await wait(() => get('#progress-list').children.length === 2);
  window.confirm = () => false;
  click('Reset Progress');
  check(get('#progress-list').children.length === 2, 'Cancel changed progress');
  window.confirm = () => true;
  click('Reset Progress');
  await wait(() => get('#progress-status').textContent === 'Progress reset.');
  click('Delete');
  await wait(() => get('#sets-status').textContent.startsWith('No saved'));
  results.push('Demo guide, two recorded attempts, reset confirmation, and set deletion');
  return results;
}

async function run() {
  const chromePath = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const folder = await mkdtemp(path.join(os.tmpdir(), 'studysync-browser-'));
  const db = await openDatabase({ url: '', file: ':memory:' });
  const app = createApp(db, createProvider({ model: '' })).listen(0, '127.0.0.1');
  let browser;
  let socket;
  let closed;
  try {
    await new Promise((resolve, reject) => app.once('listening', resolve).once('error', reject));
    const url = 'http://127.0.0.1:' + app.address().port;
    browser = spawn(chromePath, ['--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0',
      '--window-size=480,850', '--user-data-dir=' + folder, url], { stdio: 'ignore' });
    closed = new Promise((resolve) => {
      browser.once('exit', resolve);
      browser.once('error', resolve);
    });
    const port = await until(async () => (await readFile(path.join(folder, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
    const page = await until(async () => (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find((target) => target.url === url + '/'));
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let command = 0;
    function call(method, params) {
      return new Promise((resolve, reject) => {
        const id = ++command;
        const timer = setTimeout(() => {
          socket.removeEventListener('message', receive);
          reject(new Error('Browser command timed out.'));
        }, 35000);
        function receive({ data }) {
          const response = JSON.parse(data);
          if (response.id !== id) return;
          socket.removeEventListener('message', receive);
          clearTimeout(timer);
          const problem = response.error || response.result.exceptionDetails;
          if (problem) reject(new Error(problem.message || problem.exception.description));
          else resolve(response.result.result?.value);
        }
        socket.addEventListener('message', receive);
        socket.send(JSON.stringify({ id, method, params }));
      });
    }
    const evaluate = (expression) => call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    await until(() => evaluate("document.readyState === 'complete' && !!document.querySelector('#ai-status')"));
    const results = await evaluate('(' + scenarios.toString() + ')()');
    for (const check of results) console.log('PASS ' + check);
    await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await until(() => evaluate("matchMedia('(min-width: 52rem)').matches && getComputedStyle(document.querySelector('.workspace')).gridTemplateColumns.split(' ').length === 2 && document.documentElement.scrollWidth <= innerWidth"));
    console.log('PASS desktop two-column workspace');
  } finally {
    socket?.close();
    browser?.kill();
    await closed;
    await new Promise((resolve) => app.close(resolve));
    await db.close();
    await rm(folder, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
