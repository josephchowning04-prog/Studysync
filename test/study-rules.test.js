const assert = require('node:assert/strict');
const test = require('node:test');
const { demoItems } = require('../lib/demo');
const { cardSummary } = require('../public/study-rules');

test('flashcards require each mark and summarize known and study-again items', () => {
  const cards = demoItems('cards', 3);
  assert.equal(cardSummary(cards, ['known', null, 'again']), null);
  assert.deepEqual(cardSummary(cards, ['known', 'known', 'again']), {
    score: 2,
    total: 3,
    missed: [{ prompt: cards[2].prompt, answer: 'Ribosomes' }]
  });
});

const { quizAnswer, quizSummary } = require('../public/study-rules');
const questions = demoItems('quiz', 3);

test('quiz missing input does not grade or advance a question', () => {
  assert.equal(quizAnswer(questions[0], null), null);
  assert.equal(quizAnswer(questions[0], 4), null);
  assert.equal(quizSummary(questions, [0, null, 2]), null);
});

test('correct and incorrect answers show deterministic feedback and explanation', () => {
  assert.deepEqual(quizAnswer(questions[0], 0), {
    correct: true, answer: 'Cell membrane', explanation: questions[0].evidence
  });
  assert.deepEqual(quizAnswer(questions[0], 1), {
    correct: false, answer: 'Cell membrane', explanation: questions[0].evidence
  });
});

test('quiz awards 2 of 3 points and lists the missed question and correct answer', () => {
  const result = quizSummary(questions, [0, 0, 2]);
  assert.equal(result.score, 2);
  assert.equal(result.total, 3);
  assert.equal(Math.round(result.score / result.total * 100), 67);
  assert.deepEqual(result.missed, [{ prompt: questions[1].prompt, answer: 'Nucleus' }]);
});
