// Template 1: memory match. Flip two cards; matching pairs stay up.
// Pure functions: apply() returns the next game state or null if the action is not allowed.
// `pending` asks the session authority to apply a follow-up action after a delay (hide a mismatch).

import { roundRandom, shuffle, byLevel } from '../util.js';

const PAIRS = [3, 4, 6];
const COLUMNS = [3, 4, 4];
const HIDE_MISMATCH_MS = 900;

export const match = {
  id: 'match',
  title: 'Memory match',

  create(pack, round, level) {
    const rnd = roundRandom(pack, 'match', round, level);
    const pairs = byLevel(level, PAIRS);
    const chosen = shuffle(pack.items, rnd).slice(0, pairs);
    const cards = [];
    for (const item of chosen) {
      for (let copy = 0; copy < 2; copy++) {
        cards.push({ pairId: item.id, label: item.label, image: item.image, faceUp: false, matched: false });
      }
    }
    return {
      rev: 0,
      level,
      columns: byLevel(level, COLUMNS),
      cards: shuffle(cards, rnd).map((card, id) => ({ ...card, id })),
      flipped: [],
      pairs,
      matches: 0,
      moves: 0,
      mistakes: 0,
      status: 'playing',
      pending: null,
    };
  },

  apply(game, action) {
    if (action.type === 'flip') {
      if (game.status !== 'playing' || game.flipped.length >= 2) return null;
      const card = game.cards[action.cardId];
      if (!card || card.faceUp || card.matched) return null;

      let cards = game.cards.map((c) => (c.id === card.id ? { ...c, faceUp: true } : c));
      let flipped = [...game.flipped, card.id];
      let { moves, matches, mistakes, status } = game;
      let pending = null;

      if (flipped.length === 2) {
        moves += 1;
        const [a, b] = flipped.map((id) => cards[id]);
        if (a.pairId === b.pairId) {
          cards = cards.map((c) => (flipped.includes(c.id) ? { ...c, matched: true } : c));
          flipped = [];
          matches += 1;
          if (matches === game.pairs) status = 'won';
        } else {
          mistakes += 1;
          pending = { action: { type: 'hideMismatch' }, ms: HIDE_MISMATCH_MS };
        }
      }
      return { ...game, rev: game.rev + 1, cards, flipped, moves, matches, mistakes, status, pending };
    }

    if (action.type === 'hideMismatch') {
      if (game.flipped.length !== 2) return null;
      const cards = game.cards.map((c) => (game.flipped.includes(c.id) ? { ...c, faceUp: false } : c));
      return { ...game, rev: game.rev + 1, cards, flipped: [], pending: null };
    }
    return null;
  },

  isDone: (game) => game.status === 'won',
  progress: (game) => ({ done: game.matches, total: game.pairs, label: 'Pairs' }),
};
