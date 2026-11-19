const { randomUUID } = require('node:crypto');
const { InputError } = require('./limits');
const StudyRules = require('../public/study-rules');

function createSessions() {
  const sessions = new Map();
  const writes = new Map();
  const lifetime = 2 * 60 * 60 * 1000;
  return {
    async write(setId, action) {
      // Order saves and resets for the same set even when requests overlap.
      const previous = writes.get(setId) || Promise.resolve();
      const next = previous.catch(() => {}).then(action);
      writes.set(setId, next);
      try {
        return await next;
      } finally {
        if (writes.get(setId) === next) writes.delete(setId);
      }
    },
    start(setId, mode, items) {
      if (!setId || mode === 'guide') return null;
      if (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
      const token = randomUUID();
      sessions.set(token, { setId, mode, items, expires: Date.now() + lifetime });
      return token;
    },
    grade(setId, body) {
      const { token, attempt, responses } = body || {};
      const session = sessions.get(token);
      if (!session || session.setId !== setId || session.expires < Date.now()) {
        throw new InputError('This study session expired or no longer belongs to this set. Start a new session to save progress.', 409);
      }
      if (!Number.isInteger(attempt) || attempt < 1 || attempt > 1000) throw new InputError('Invalid attempt number.');
      const grade = session.mode === 'quiz' ? StudyRules.quizSummary : StudyRules.cardSummary;
      const result = grade(session.items, responses);
      if (!result) throw new InputError('Finish every item before saving progress.');
      return { id: token + ':' + attempt, mode: session.mode, ...result };
    },
    clear(setId) {
      for (const [token, session] of sessions) {
        if (session.setId === setId) sessions.delete(token);
      }
    }
  };
}

module.exports = { createSessions };
