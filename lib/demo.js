const sample = require('./sample');

const facts = [
  ['Cell membrane', 'controls which substances enter and leave the cell', 'Which structure controls what enters or leaves a cell?', ['Nucleus', 'Chloroplasts', 'Ribosomes']],
  ['Nucleus', 'holds most of the cell’s DNA', 'Which structure holds most of the DNA in most plant and animal cells?', ['Cell membrane', 'Ribosomes', 'Chloroplasts']],
  ['Ribosomes', 'build proteins by joining amino acids', 'Which structures build proteins by joining amino acids?', ['Chloroplasts', 'Cell membrane', 'Nucleus']],
  ['Mitochondria', 'use energy released from food molecules to make ATP', 'Which structures use energy from food molecules to make ATP?', ['Ribosomes', 'Nucleus', 'Cell membrane']],
  ['Chloroplasts', 'capture light energy for photosynthesis', 'Which structures capture light energy for photosynthesis?', ['Mitochondria', 'Ribosomes', 'Nucleus']]
];

function demoItems(mode, count) {
  const paragraphs = sample.notes.split('\n\n');
  return facts.slice(0, count).map(([concept, definition, prompt, distractors], index) => {
    const evidence = paragraphs[index].replace(/^\d+\. /, '');
    if (mode === 'cards') return { prompt, answer: concept, evidence };
    if (mode === 'guide') return { concept, definition, summary: evidence, evidence };
    const correct = index % 4;
    const options = [...distractors];
    options.splice(correct, 0, concept);
    return { prompt, options, correct, explanation: evidence, evidence };
  });
}

module.exports = { demoItems };
