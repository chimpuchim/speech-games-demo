// Small helpers shared by the game logic. Everything here is deterministic so a round can be rebuilt from its seed.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle(items, rnd) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Random generator for one round: same pack, template, round and level always give the same game. */
export function roundRandom(pack, template, round, level) {
  return mulberry32(hashString(pack.id + ':' + template) + round * 7919 + level * 104729);
}

/** Items of one category, in a fixed order. */
export function itemsOf(pack, categoryId) {
  return pack.items.filter((item) => item.category === categoryId);
}

/** Level (1-3) -> value, clamped. */
export function byLevel(level, values) {
  return values[Math.min(Math.max(level, 1), values.length) - 1];
}
