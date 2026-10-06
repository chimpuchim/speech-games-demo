// Session authority. Holds the single source of truth for one therapy session and validates every intent.
// In this demo it runs in the therapist's browser; the same class could run on a server unchanged.
//
// Session flow: speech "cards" phase -> reward game (timed) -> next card.
// Difficulty adapts: a clean win raises the level, many mistakes lower it.

import { TEMPLATES, TEMPLATE_IDS } from './logic/index.js';
import { shuffle, mulberry32, hashString } from './util.js';

const THERAPIST_ONLY = new Set([
  'setPack', 'setTemplate', 'setLevel', 'target', 'startReward', 'backToCards', 'newGame',
]);
export const MAX_LEVEL = 3;
const TARGETS_PER_PACK = 6;
const REWARD_MS = 60000;
const WIN_PAUSE_MS = 2800;
const MISTAKES_TO_LEVEL_DOWN = 3;

/** Level after a finished game: 0 mistakes goes up, many mistakes go down. */
export function nextLevel(level, mistakes) {
  if (mistakes === 0) return Math.min(level + 1, MAX_LEVEL);
  if (mistakes >= MISTAKES_TO_LEVEL_DOWN) return Math.max(level - 1, 1);
  return level;
}

function targetsFor(pack, round) {
  const rnd = mulberry32(hashString(pack.id) + round * 31);
  return shuffle(pack.items, rnd)
    .slice(0, TARGETS_PER_PACK)
    .map((item) => ({ id: item.id, label: item.label, image: item.image }));
}

export class Authority {
  /**
   * @param {{packs: Object, packId: string, template?: string, onChange: Function, rewardMs?: number}} options
   */
  constructor({ packs, packId, template = 'match', onChange, rewardMs = REWARD_MS }) {
    this.packs = packs;
    this.onChange = onChange;
    this.rewardMs = rewardMs;
    this.gameTimer = null;
    this.rewardTimer = null;
    this.rewardCount = 0;
    this.state = this.freshState(packId, template, 1, 0);
    this.state.epoch = Date.now(); // lets students tell a restarted session from an old one
    this.publish(this.state);
  }

  freshState(packId, template, level, round) {
    const pack = this.packs[packId];
    return {
      version: 0,
      epoch: this.state ? this.state.epoch : 0,
      packId,
      packTitle: pack.title,
      scene: pack.scene,
      theme: { bg: pack.bg, back: pack.back },
      template,
      templateTitle: TEMPLATES[template].title,
      level,
      round,
      phase: 'cards',
      targets: targetsFor(pack, round),
      targetIndex: 0,
      game: null,
      rewardId: this.rewardCount,
      endsInMs: 0,
      lastResult: null,
    };
  }

  publish(next) {
    this.state = { ...next, version: this.state ? this.state.version + 1 : 1 };
    this.onChange(this.state);
  }

  /** Returns true when the intent was accepted. */
  handle(intent, role) {
    if (role !== 'therapist' && role !== 'student') return false;
    if (intent.type === 'game') return this.handleGame(intent.action);
    if (role !== 'therapist' || !THERAPIST_ONLY.has(intent.type)) return false;
    const s = this.state;

    switch (intent.type) {
      case 'setPack':
        if (!this.packs[intent.packId]) return false;
        this.clearTimers();
        this.publish(this.freshState(intent.packId, s.template, s.level, s.round + 1));
        return true;
      case 'setTemplate': {
        if (!TEMPLATES[intent.template]) return false;
        const patch = { template: intent.template, templateTitle: TEMPLATES[intent.template].title };
        if (s.phase === 'game') this.startGame(s.round, patch);
        else this.publish({ ...s, ...patch });
        return true;
      }
      case 'setLevel': {
        if (!Number.isInteger(intent.level) || intent.level < 1 || intent.level > MAX_LEVEL) return false;
        if (s.phase === 'game') this.startGame(s.round, { level: intent.level });
        else this.publish({ ...s, level: intent.level });
        return true;
      }
      case 'target': {
        if (s.phase !== 'cards') return false;
        const n = s.targets.length;
        this.publish({ ...s, targetIndex: (s.targetIndex + (intent.delta < 0 ? -1 : 1) + n) % n });
        return true;
      }
      case 'startReward':
        this.startReward();
        return true;
      case 'backToCards':
        this.endReward(false);
        return true;
      case 'newGame':
        if (s.phase !== 'game') return false;
        this.startGame(s.round + 1);
        return true;
      default:
        return false;
    }
  }

  startReward() {
    this.clearTimers();
    this.rewardCount += 1;
    this.rewardTimer = setTimeout(() => this.endReward(true), this.rewardMs);
    this.startGame(this.state.round, {
      phase: 'game',
      rewardId: this.rewardCount,
      endsInMs: this.rewardMs,
      lastResult: null,
    });
  }

  endReward(advanceTarget) {
    this.clearTimers();
    const s = this.state;
    const n = s.targets.length;
    this.publish({
      ...s,
      phase: 'cards',
      game: null,
      round: s.round + 1,
      targetIndex: advanceTarget ? (s.targetIndex + 1) % n : s.targetIndex,
      endsInMs: 0,
    });
  }

  /** Builds a new game and publishes it together with `patch` in ONE state, so no client ever sees a half-made one. */
  startGame(round = this.state.round, patch = {}) {
    clearTimeout(this.gameTimer);
    const s = { ...this.state, ...patch };
    const game = TEMPLATES[s.template].create(this.packs[s.packId], round, s.level);
    this.publish({ ...s, round, game });
    this.schedule();
  }

  handleGame(action) {
    const s = this.state;
    if (s.phase !== 'game' || !s.game) return false;
    const next = TEMPLATES[s.template].apply(s.game, action);
    if (!next) return false;
    this.publish({ ...s, game: next });
    this.schedule();
    return true;
  }

  /** Runs delayed follow-ups the game asks for, and restarts after a win with an adapted level. */
  schedule() {
    clearTimeout(this.gameTimer);
    const s = this.state;
    const game = s.game;
    if (!game) return;
    const template = TEMPLATES[s.template];
    const rev = game.rev;

    if (game.pending) {
      this.gameTimer = setTimeout(() => {
        if (this.state.game && this.state.game.rev === rev) this.handleGame(game.pending.action);
      }, game.pending.ms);
    } else if (template.isDone(game)) {
      const level = nextLevel(s.level, game.mistakes);
      this.publish({ ...s, lastResult: { mistakes: game.mistakes, from: s.level, to: level } });
      this.gameTimer = setTimeout(() => {
        if (this.state.game && this.state.game.rev === rev) this.startGame(this.state.round + 1, { level });
      }, WIN_PAUSE_MS);
    }
  }

  clearTimers() {
    clearTimeout(this.gameTimer);
    clearTimeout(this.rewardTimer);
  }

  dispose() {
    this.clearTimers();
  }
}

export { TEMPLATE_IDS };
