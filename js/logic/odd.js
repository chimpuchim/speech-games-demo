// Template 4: find the odd one out. Several pictures share a category; one does not. Tap the odd one.
// Harder levels show more pictures per question and ask more questions.

import { roundRandom, shuffle, itemsOf, byLevel } from '../util.js';

const CHOICES = [3, 4, 4];
const QUESTIONS = [3, 4, 5];

export const odd = {
  id: 'odd',
  title: 'Odd one out',

  create(pack, round, level) {
    const rnd = roundRandom(pack, 'odd', round, level);
    const choices = byLevel(level, CHOICES);
    const total = byLevel(level, QUESTIONS);
    const questions = [];

    for (let q = 0; q < total; q++) {
      // Alternate which category is the majority so the answer is not always the same kind.
      const [majorCat, minorCat] = q % 2 === 0 ? pack.categories : [pack.categories[1], pack.categories[0]];
      const major = shuffle(itemsOf(pack, majorCat.id), rnd).slice(0, choices - 1);
      const minor = shuffle(itemsOf(pack, minorCat.id), rnd)[0];
      const options = shuffle([...major.map((i) => ({ ...i, oddOne: false })), { ...minor, oddOne: true }], rnd);
      questions.push({
        options: options.map((o) => ({ label: o.label, image: o.image })),
        answer: options.findIndex((o) => o.oddOne),
        groupLabel: majorCat.label,
      });
    }
    return { rev: 0, level, questions, current: 0, mistakes: 0, lastWrong: null, status: 'playing', pending: null };
  },

  apply(game, action) {
    if (action.type !== 'pick' || game.status !== 'playing') return null;
    const question = game.questions[game.current];
    if (!Number.isInteger(action.idx) || action.idx < 0 || action.idx >= question.options.length) return null;

    if (action.idx === question.answer) {
      const current = game.current + 1;
      return {
        ...game,
        rev: game.rev + 1,
        current,
        lastWrong: null,
        status: current === game.questions.length ? 'won' : 'playing',
      };
    }
    const mistakes = game.mistakes + 1;
    return { ...game, rev: game.rev + 1, mistakes, lastWrong: { idx: action.idx, n: mistakes } };
  },

  isDone: (game) => game.status === 'won',
  progress: (game) => ({ done: game.current, total: game.questions.length, label: 'Question' }),
};
