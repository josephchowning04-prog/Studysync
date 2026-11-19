const assert = require('node:assert/strict');
const test = require('node:test');
const { mkdtemp, rm } = require('node:fs/promises');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server');
const { openDatabase } = require('../lib/db');

async function serverFor(t, options = {}) {
  const db = await openDatabase({ url: '', file: ':memory:', ...options.database });
  const server = createApp(db, options.provider).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => server.once('listening', resolve).once('error', reject));
  const url = 'http://127.0.0.1:' + server.address().port;
  async function close() {
    if (!server.listening) return;
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  }
  t.after(close);
  return { close, request: (route, options) => fetch(url + route, options) };
}

const json = (method, data) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

function pdfFixture(text = '') {
  const content = text ? `BT /F1 12 Tf 20 50 Td (${text}) Tj ET` : '';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return String(offset).padStart(10, '0') + ' 00000 n \n';
  });
  const xref = pdf.length;
  return pdf + `xref\n0 6\n0000000000 65535 f \n${offsets.join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}

test('create, read, literal search, edit, restart and delete a study set', async (t) => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'studysync-'));
  const options = { database: { file: path.join(folder, 'test.sqlite') } };
  try {
    let app = await serverFor(t, options);
    const notes = '<script>window.executed = true</script>';
    const created = await app.request('/api/sets', json('POST', { title: 'Biology 100%_A', notes }));
    assert.equal(created.status, 201);
    const { id } = await created.json();
    const route = '/api/sets/' + id;
    assert.equal((await (await app.request(route)).json()).notes, notes);
    assert.equal((await (await app.request('/api/sets?q=100%25_')).json()).length, 1);
    assert.equal((await (await app.request('/api/sets?q=100_')).json()).length, 0);
    assert.equal((await (await app.request(route, json('PUT', { title: 'Updated', notes }))).json()).title, 'Updated');
    await app.close();
    app = await serverFor(t, options);
    assert.equal((await (await app.request(route)).json()).title, 'Updated');
    assert.equal((await app.request(route, { method: 'DELETE' })).status, 204);
    assert.equal((await app.request(route)).status, 404);
    await app.close();
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test('blank and oversized study material is rejected', async (t) => {
  const { request } = await serverFor(t);
  for (const data of [
    { title: '', notes: 'Cells' }, { title: 'Cells', notes: '' }, { title: 'Cells', notes: ' \t\n' },
    { title: 'x'.repeat(121), notes: 'Cells' }, { title: 'Cells', notes: 'x'.repeat(12001) }
  ]) {
    const response = await request('/api/sets', json('POST', data));
    assert.equal(response.status, 400);
    assert.ok((await response.json()).error);
  }
});

test('PDF text extracts, while no-text, corrupt, wrong-type and oversized files are rejected', async (t) => {
  const { request } = await serverFor(t);
  const upload = (body, type = 'application/pdf') => request('/api/pdf', { method: 'POST', headers: { 'Content-Type': type }, body });
  const good = await upload(pdfFixture('Cells contain ribosomes.'));
  assert.equal(good.status, 200);
  assert.match((await good.json()).notes, /Cells contain ribosomes/);
  const empty = await upload(pdfFixture());
  assert.equal(empty.status, 422);
  assert.match((await empty.json()).error, /No selectable text/);
  assert.equal((await upload('%PDF-1.4 Broken')).status, 422);
  assert.equal((await upload('plain text')).status, 415);
  assert.equal((await upload(pdfFixture(), 'text/plain')).status, 415);
  assert.equal((await upload(Buffer.alloc(2 * 1024 * 1024 + 1))).status, 413);
});

test('generation uses saved notes and separate demo mode remains available', async (t) => {
  const provider = {
    status: async () => ({ available: true }),
    generate: async (notes, mode, count) => {
      assert.equal(notes, 'These are the saved notes.');
      assert.equal(mode, 'cards');
      assert.equal(count, 2);
      return [{ prompt: 'Which notes?', answer: 'Saved notes', evidence: notes }];
    }
  };
  const { request } = await serverFor(t, { provider });
  assert.equal((await (await request('/api/ai/status')).json()).available, true);
  const set = await (await request('/api/sets', json('POST', { title: 'Saved', notes: 'These are the saved notes.' }))).json();
  const route = '/api/sets/' + set.id + '/generate';
  assert.equal((await request(route, json('POST', { mode: 'cards', count: 100 }))).status, 400);
  assert.equal((await request(route, json('POST', { mode: 'toString', count: 2 }))).status, 400);
  const generated = await (await request(route, json('POST', { mode: 'cards', count: 2, notes: 'Unofficial notes' }))).json();
  assert.equal(generated.source, 'ai');
  assert.equal(generated.setId, set.id);
  assert.ok(generated.token);

  const demo = await (await request('/api/demo', json('POST', { mode: 'guide', count: 3, requestedSetId: set.id }))).json();
  assert.equal(demo.source, 'demo');
  assert.equal(demo.items.length, 3);
  assert.equal(demo.setId, null);
  assert.equal(demo.token, null);
});

test('completed quiz and cards persist through restart, reject incomplete answers and reset on request', async (t) => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'studysync-progress-'));
  const options = { database: { file: path.join(folder, 'progress.sqlite') } };
  try {
    let app = await serverFor(t, options);
    const sample = await (await app.request('/api/sample')).json();
    const set = await (await app.request('/api/sets', json('POST', sample))).json();
    const route = '/api/sets/' + set.id + '/progress';
    const demo = async (mode) => (await app.request('/api/demo', json('POST', { mode, count: 3, requestedSetId: set.id }))).json();
    const quiz = await demo('quiz');
    const cards = await demo('cards');
    const submit = (token, responses) => app.request(route, json('POST', { token, attempt: 1, responses, score: 100 }));
    assert.equal((await submit(quiz.token, [0, null, 2])).status, 400);
    assert.equal((await submit(quiz.token, [0, 0, 2])).status, 201);
    assert.equal((await submit(quiz.token, [0, 1, 2])).status, 201); // Same attempt cannot overwrite its score.
    assert.equal((await submit(cards.token, ['known', 'again', 'known'])).status, 201);
    await app.close();
    app = await serverFor(t, options);
    const records = await (await app.request(route)).json();
    assert.equal(records.length, 2);
    assert.deepEqual(records.map((record) => [record.score, record.total, record.missed[0].answer]), [[2, 3, 'Nucleus'], [2, 3, 'Nucleus']]);
    assert.equal((await submit(quiz.token, [0, 0, 2])).status, 409);
    const resetSession = await demo('quiz');
    const [reset, overlappingSave] = await Promise.all([
      app.request(route, { method: 'DELETE' }), submit(resetSession.token, [0, 0, 2])
    ]);
    assert.equal(reset.status, 204);
    assert.ok([201, 409].includes(overlappingSave.status));
    assert.deepEqual(await (await app.request(route)).json(), []);
    assert.equal((await submit(resetSession.token, [0, 0, 2])).status, 409);
    await app.close();
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test('oversized JSON and cross-site writes fail without exposing internal details', async (t) => {
  const { request } = await serverFor(t);
  assert.equal((await request('/api/sets', json('POST', { notes: 'x'.repeat(100000) }))).status, 413);
  const options = json('POST', { title: 'Cells', notes: 'Some notes' });
  options.headers['Sec-Fetch-Site'] = 'cross-site';
  assert.equal((await request('/api/sets', options)).status, 403);
  assert.deepEqual(await (await request('/api/sets')).json(), []);
  const page = await request('/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
});

test('the production server process reloads saved records after restart', { timeout: 10000 }, async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'studysync-restart-'));
  let child;
  let stopped;

  async function start() {
    child = spawn(process.execPath, [path.join(__dirname, '../server.js')], {
      env: { ...process.env, DATABASE_URL: '', PORT: '0', SQLITE_PATH: path.join(folder, 'restart.sqlite') },
      stdio: ['ignore', 'pipe', 'ignore']
    });
    stopped = once(child, 'exit');
    const reader = require('node:readline').createInterface({ input: child.stdout });
    try {
      const [line] = await Promise.race([
        once(reader, 'line', { signal: AbortSignal.timeout(4000) }),
        stopped.then(() => { throw new Error('Production server exited before listening.'); })
      ]);
      const port = /localhost:(\d+)/.exec(line);
      assert.ok(port);
      return 'http://127.0.0.1:' + port[1];
    } finally {
      reader.close();
    }
  }

  async function stop() {
    if (!child) return;
    child.kill();
    await stopped;
    child = null;
  }

  try {
    let base = await start();
    const created = await fetch(base + '/api/sets', json('POST', { title: 'Fictional restart check', notes: 'A synthetic example.' }));
    assert.equal(created.status, 201);
    const { id } = await created.json();
    await stop();
    base = await start();
    const reopened = await fetch(base + '/api/sets/' + id);
    assert.equal(reopened.status, 200);
    assert.equal((await reopened.json()).notes, 'A synthetic example.');
  } finally {
    await stop();
    await rm(folder, { recursive: true, force: true });
  }
});
