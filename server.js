const express = require('express');
const path = require('node:path');
const { openDatabase } = require('./lib/db');
const { limits, InputError, studyInput } = require('./lib/limits');
const { extractPdf } = require('./lib/pdf');

const sample = require('./lib/sample');
const { demoItems } = require('./lib/demo');
const { createProvider, modeInput } = require('./lib/ai');
const { createSessions } = require('./lib/sessions');

function createApp(db, provider = createProvider()) {
  const app = express();
  const sessions = createSessions();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    });
    next();
  });
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && req.get('Sec-Fetch-Site') === 'cross-site') {
      return next(new InputError('Open StudySync directly to make changes.', 403));
    }
    next();
  });
  app.use('/api', express.json({ limit: '80kb' }));

  app.get('/api/sets', async (req, res) => {
    const search = req.query.q ?? '';
    if (typeof search !== 'string' || search.length > limits.title || search.includes('\0')) {
      throw new InputError('Enter a valid search term up to 120 characters.');
    }
    res.json(await db.list(search.trim()));
  });

  app.post('/api/sets', async (req, res) => {
    const { title, notes } = studyInput(req.body);
    res.status(201).json(await db.create(title, notes));
  });

  app.get('/api/sets/:id', async (req, res) => {
    const set = await db.get(req.params.id);
    if (!set) throw new InputError('Study set was not found.', 404);
    res.json(set);
  });

  app.put('/api/sets/:id', async (req, res) => {
    const { title, notes } = studyInput(req.body);
    const set = await db.update(req.params.id, title, notes);
    if (!set) throw new InputError('Study set was not found.', 404);
    res.json(set);
  });

  app.delete('/api/sets/:id', async (req, res) => {
    const id = req.params.id;
    await sessions.write(id, async () => {
      if (!(await db.remove(id))) throw new InputError('Study set was not found.', 404);
      sessions.clear(id);
    });
    res.status(204).end();
  });

  app.post('/api/pdf', express.raw({ type: 'application/pdf', limit: limits.pdf, inflate: false }), async (req, res) => {
    res.json({ notes: await extractPdf(req.body) });
  });

  app.get('/api/sample', (req, res) => res.json(sample));
  app.get('/api/ai/status', async (req, res) => res.json(await provider.status()));

  app.post('/api/sets/:id/generate', async (req, res) => {
    const { mode, count } = req.body || {};
    modeInput(mode, count);
    const set = await db.get(req.params.id);
    if (!set) throw new InputError('Study set was not found.', 404);
    const items = await provider.generate(set.notes, mode, count);
    res.json({ source: 'ai', mode, items, setId: set.id, token: sessions.start(set.id, mode, items) });
  });

  app.post('/api/demo', async (req, res) => {
    const { mode, count, requestedSetId } = req.body || {};
    modeInput(mode, count);
    const set = typeof requestedSetId === 'string' ? await db.get(requestedSetId) : null;
    const setId = set?.notes === sample.notes ? set.id : null;
    const items = demoItems(mode, Math.min(count, 5));
    res.json({ source: 'demo', mode, items, setId, token: sessions.start(setId, mode, items) });
  });

  app.get('/api/sets/:id/progress', async (req, res) => {
    if (!(await db.get(req.params.id))) throw new InputError('Study set was not found.', 404);
    res.json(await db.progress(req.params.id));
  });

  app.post('/api/sets/:id/progress', async (req, res) => {
    const id = req.params.id;
    const saved = await sessions.write(id, () => db.addAttempt(id, sessions.grade(id, req.body)));
    if (!saved) throw new InputError('Study set was not found.', 404);
    res.status(201).json(saved);
  });

  app.delete('/api/sets/:id/progress', async (req, res) => {
    const id = req.params.id;
    await sessions.write(id, async () => {
      if (!(await db.get(id))) throw new InputError('Study set was not found.', 404);
      await db.reset(id);
      sessions.clear(id);
    });
    res.status(204).end();
  });

  app.use('/api', (req, res, next) => next(new InputError('API endpoint was not found.', 404)));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof InputError) return res.status(error.status).json({ error: error.message });
    if (error.status === 413) return res.status(413).json({ error: 'The submitted file or text is too large.' });
    if (error.status === 400 || error.status === 415) return res.status(error.status).json({ error: 'The request format is invalid.' });
    console.error('StudySync could not complete a request.');
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  });
  return app;
}

async function start() {
  const db = await openDatabase();
  const port = Number(process.env.PORT || 3000);
  const host = '0.0.0.0';
  const server = createApp(db).listen(port, host, async (error) => {
    if (error) {
      await db.close();
      console.error('Could not listen on the configured port.');
      process.exitCode = 1;
      return;
    }
    console.log(`StudySync is running at http://localhost:${server.address().port}`);
  });
}

if (require.main === module) {
  start().catch(() => {
    console.error('Could not initialize the StudySync database. Check the database settings.');
    process.exitCode = 1;
  });
}

module.exports = { createApp };
