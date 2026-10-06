// Template 2: sort it. Drag each picture into the box of its category.
// Items of one pack carry a `category`; the two categories of the pack become the two boxes.

import { roundRandom, shuffle, itemsOf, byLevel } from '../util.js';

const PER_CATEGORY = [2, 3, 4];

export const sort = {
  id: 'sort',
  title: 'Sort it',

  create(pack, round, level) {
    const rnd = roundRandom(pack, 'sort', round, level);
    const [catA, catB] = pack.categories;
    const count = byLevel(level, PER_CATEGORY);
    const pick = (cat) => shuffle(itemsOf(pack, cat.id), rnd).slice(0, count);
    const items = shuffle([...pick(catA), ...pick(catB)], rnd).map((item, id) => ({
      id,
      label: item.label,
      image: item.image,
      category: item.category,
      placed: false,
    }));
    return {
      rev: 0,
      level,
      categories: pack.categories.slice(0, 2),
      items,
      placedCount: 0,
      mistakes: 0,
      lastWrong: null, // { itemId, n } so every client can play the "try again" feedback once
      status: 'playing',
      pending: null,
    };
  },

  apply(game, action) {
    if (action.type !== 'place' || game.status !== 'playing') return null;
    const item = game.items[action.itemId];
    if (!item || item.placed) return null;
    if (!game.categories.some((c) => c.id === action.category)) return null;

    if (item.category === action.category) {
      const items = game.items.map((it) => (it.id === item.id ? { ...it, placed: true } : it));
      const placedCount = game.placedCount + 1;
      return {
        ...game,
        rev: game.rev + 1,
        items,
        placedCount,
        status: placedCount === game.items.length ? 'won' : 'playing',
      };
    }
    const mistakes = game.mistakes + 1;
    return { ...game, rev: game.rev + 1, mistakes, lastWrong: { itemId: item.id, n: mistakes } };
  },

  isDone: (game) => game.status === 'won',
  progress: (game) => ({ done: game.placedCount, total: game.items.length, label: 'Sorted' }),
};
