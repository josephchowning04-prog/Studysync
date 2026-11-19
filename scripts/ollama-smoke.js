// Optional end-to-end check using the configured local model and fictional notes.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { openDatabase } = require('../lib/db');
const { createApp } = require('../server');
const sample = require('../lib/sample');

async function run() {
  const db = await openDatabase({ url: '', file: ':memory:' });
  const app = createApp(db).listen(0, '127.0.0.1');
  try {
    await once(app, 'listening');
    const base = 'http://127.0.0.1:' + app.address().port;
    const status = await (await fetch(base + '/api/ai/status')).json();
    assert.ok(status.available, status.message);
    console.log('PASS configured model is available');
    const set = await db.create(sample.title, sample.notes);
    for (const mode of ['cards', 'quiz', 'guide']) {
      const count = Number(process.env.STUDYSYNC_SMOKE_COUNT || 2);
      const response = await fetch(base + '/api/sets/' + set.id + '/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, count })
      });
      const result = await response.json();
      if (response.status !== 200) {
        console.error(`FAIL ${mode}: HTTP ${response.status}, ${result.error}`);
        process.exitCode = 1;
        continue;
      }
      assert.equal(result.source, 'ai');
      assert.equal(result.items.length, count);
      assert.ok(result.items.every((item) => sample.notes.includes(item.evidence)));
      console.log(`PASS ${mode}: ${count} items with source excerpts`);
    }
  } finally {
    await new Promise((resolve) => app.close(resolve));
    await db.close();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
