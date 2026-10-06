// Template 3: copy the pattern. Four pictures light up in an order; the players repeat it.
// The pattern grows by one each time it is repeated correctly. A wrong tap replays the same pattern.

import { roundRandom, shuffle, byLevel } from '../util.js';

const BUTTONS = 4;
const START_LENGTH = 2;
const TOP_LENGTH = [3, 4, 5]; // pattern length that wins the round, by level
const STEP_MS = 800;

function showMs(length) {
  return length * STEP_MS + 700;
}

export const sequence = {
  id: 'sequence',
  title: 'Copy the pattern',

  create(pack, round, level) {
    const rnd = roundRandom(pack, 'sequence', round, level);
    const buttons = shuffle(pack.items, rnd)
      .slice(0, BUTTONS)
      .map((item) => ({ id: item.id, label: item.label, image: item.image }));
    const top = byLevel(level, TOP_LENGTH);
    const pattern = Array.from({ length: top }, () => Math.floor(rnd() * BUTTONS));
    return {
      rev: 0,
      level,
      buttons,
      pattern,
      length: START_LENGTH,
      top,
      step: 0,
      showId: 1, // changes whenever the pattern should be played again
      status: 'showing',
      mistakes: 0,
      lastTap: null, // { idx, ok, n }
      tapCount: 0,
      pending: { action: { type: 'startInput' }, ms: showMs(START_LENGTH) },
    };
  },

  apply(game, action) {
    if (action.type === 'startInput') {
      if (game.status !== 'showing') return null;
      return { ...game, rev: game.rev + 1, status: 'input', step: 0, pending: null };
    }

    if (action.type === 'tap') {
      if (game.status !== 'input') return null;
      if (!Number.isInteger(action.idx) || action.idx < 0 || action.idx >= BUTTONS) return null;
      const tapCount = game.tapCount + 1;

      if (action.idx !== game.pattern[game.step]) {
        return {
          ...game,
          rev: game.rev + 1,
          mistakes: game.mistakes + 1,
          status: 'showing',
          step: 0,
          showId: game.showId + 1,
          tapCount,
          lastTap: { idx: action.idx, ok: false, n: tapCount },
          pending: { action: { type: 'startInput' }, ms: showMs(game.length) },
        };
      }

      const step = game.step + 1;
      const lastTap = { idx: action.idx, ok: true, n: tapCount };
      if (step < game.length) return { ...game, rev: game.rev + 1, step, tapCount, lastTap };
      if (game.length >= game.top) {
        return { ...game, rev: game.rev + 1, step, status: 'won', tapCount, lastTap };
      }
      const length = game.length + 1;
      return {
        ...game,
        rev: game.rev + 1,
        length,
        step: 0,
        status: 'showing',
        showId: game.showId + 1,
        tapCount,
        lastTap,
        pending: { action: { type: 'startInput' }, ms: showMs(length) },
      };
    }
    return null;
  },

  isDone: (game) => game.status === 'won',
  progress: (game) => ({ done: game.length - START_LENGTH + (game.status === 'won' ? 1 : 0), total: game.top - START_LENGTH + 1, label: 'Round' }),
  stepMs: STEP_MS,
};
