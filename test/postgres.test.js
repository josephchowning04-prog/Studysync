const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { openDatabase } = require('../lib/db');

const url = process.env.STUDYSYNC_TEST_POSTGRES_URL;
test('PostgreSQL schema is idempotent and preserves sets and attempts after reconnect', {
  skip: !url && 'Set STUDYSYNC_TEST_POSTGRES_URL for a disposable PostgreSQL database.'
}, async () => {
  let db = await openDatabase({ url });
  let set;
  try {
    const title = 'Fictional cells %_' + randomUUID();
    set = await db.create(title, 'Original notes.');
    assert.equal((await db.list(title))[0].id, set.id);
    await db.update(set.id, title, 'Edited notes.');
    const attemptId = randomUUID();
    const attempt = { id: attemptId, mode: 'quiz', score: 1, total: 2, missed: [{ prompt: 'Example', answer: 'ATP' }] };
    assert.equal((await db.addAttempt(set.id, attempt)).score, 1);
    assert.equal((await db.addAttempt(set.id, { ...attempt, score: 2 })).score, 1);
    await db.close();
    db = await openDatabase({ url });
    assert.equal((await db.get(set.id)).notes, 'Edited notes.');
    assert.deepEqual((await db.progress(set.id))[0].missed, attempt.missed);
    assert.equal(await db.remove(set.id), true);
    assert.deepEqual(await db.progress(set.id), []);
  } finally {
    if (set) await db.remove(set.id);
    await db.close();
  }
});
