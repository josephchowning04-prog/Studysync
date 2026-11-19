const StudyRules = {
  cardSummary(items, marks) {
    if (!Array.isArray(marks) || marks.length !== items.length ||
      marks.some((mark) => mark !== 'known' && mark !== 'again')) return null;

    return {
      score: marks.filter((mark) => mark === 'known').length,
      total: items.length,
      missed: items.filter((item, index) => marks[index] === 'again').map((item) => ({
        prompt: item.prompt, answer: item.answer
      }))
    };
  },

  quizAnswer(item, choice) {
    if (!Number.isInteger(choice) || choice < 0 || choice >= item.options.length) return null;
    return { correct: choice === item.correct, answer: item.options[item.correct], explanation: item.explanation };
  },

  quizSummary(items, choices) {
    if (!Array.isArray(choices) || choices.length !== items.length) return null;
    const graded = items.map((item, index) => StudyRules.quizAnswer(item, choices[index]));
    if (graded.some((answer) => answer === null)) return null;

    return {
      score: graded.filter((answer) => answer.correct).length,
      total: items.length,
      missed: items.flatMap((item, index) => graded[index].correct ? [] : [{
        prompt: item.prompt, answer: graded[index].answer
      }])
    };
  }
};

if (typeof module !== 'undefined') module.exports = StudyRules;
