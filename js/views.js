// Phaser views: one class per screen. A view draws whatever state it is given and sends taps back as
// intents through `send`. Views never change game state themselves, so both players always see the same game.

import { sound } from './audio.js';

const FONT = '"Baloo 2", "Nunito", "Trebuchet MS", system-ui, sans-serif';
const AREA = { top: 110, bottom: 700, centerX: 640 };
const PAD_COLORS = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x51cf66];

const hex = (css) => parseInt(css.replace('#', ''), 16);

function roundedRect(scene, width, height, fill, stroke, radius = 24, strokeWidth = 6) {
  const g = scene.add.graphics();
  g.fillStyle(fill, 1).fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  if (stroke !== null) g.lineStyle(strokeWidth, stroke, 1).strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  return g;
}

function picture(scene, image, size) {
  return scene.add.image(0, 0, image).setDisplaySize(size, size);
}

function label(scene, text, size, color = '#2b2b3a') {
  return scene.add
    .text(0, 0, text, { fontFamily: FONT, fontSize: size + 'px', color, fontStyle: 'bold' })
    .setOrigin(0.5);
}

function shake(scene, target) {
  const x = target.x;
  scene.tweens.killTweensOf(target);
  scene.tweens.add({ targets: target, x: x + 12, duration: 55, yoyo: true, repeat: 3, onComplete: () => (target.x = x) });
}

function pop(scene, target, to = 1.08) {
  scene.tweens.add({ targets: target, scale: to, duration: 140, yoyo: true });
}

/** Shared base: keeps the scene, a way to send intents, and everything to clean up. */
class View {
  constructor(scene, send) {
    this.scene = scene;
    this.send = send;
    this.nodes = [];
  }
  track(node) {
    this.nodes.push(node);
    return node;
  }
  destroy() {
    this.nodes.forEach((n) => n.destroy());
    this.nodes = [];
  }
  hud() {
    return '';
  }
}

// ---------------------------------------------------------------------------------------------------------
// Speech card: the practice screen between games.

export class CardView extends View {
  build(state) {
    const s = this.scene;
    this.shown = -1;
    this.caption = this.track(
      s.add.text(AREA.centerX, 150, 'Say it with me!', { fontFamily: FONT, fontSize: '44px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5)
    );
    this.card = this.track(s.add.container(AREA.centerX, 410));
    this.card.add(roundedRect(s, 560, 460, 0xffffff, 0xffffff, 40));
    this.image = picture(s, state.targets[0].image, 250).setPosition(0, -50);
    this.word = label(s, '', 92).setPosition(0, 150);
    this.card.add([this.image, this.word]);
    this.dots = this.track(s.add.graphics());
  }

  update(state) {
    const target = state.targets[state.targetIndex];
    if (this.shown !== state.targetIndex) {
      if (this.shown !== -1) sound.card();
      this.shown = state.targetIndex;
      this.image.setTexture(target.image).setDisplaySize(250, 250);
      this.word.setText(target.label);
      this.card.setScale(0.9);
      this.scene.tweens.add({ targets: this.card, scale: 1, duration: 220, ease: 'Back.Out' });
    }
    const n = state.targets.length;
    this.dots.clear();
    for (let i = 0; i < n; i++) {
      this.dots.fillStyle(0xffffff, i === state.targetIndex ? 1 : 0.4);
      this.dots.fillCircle(AREA.centerX + (i - (n - 1) / 2) * 36, 668, i === state.targetIndex ? 11 : 8);
    }
  }

  hud(state) {
    return 'Speech card ' + (state.targetIndex + 1) + ' of ' + state.targets.length;
  }
}

// ---------------------------------------------------------------------------------------------------------
// Memory match.

export class MatchView extends View {
  build(state) {
    const s = this.scene;
    const game = state.game;
    const cols = game.columns;
    const rows = Math.ceil(game.cards.length / cols);
    const gap = 22;
    const size = Math.min(190, Math.floor((AREA.bottom - AREA.top - gap * (rows - 1)) / rows));
    const width = cols * size + (cols - 1) * gap;
    const left = AREA.centerX - width / 2 + size / 2;
    const top = AREA.top + (AREA.bottom - AREA.top - (rows * size + (rows - 1) * gap)) / 2 + size / 2;
    const back = hex(state.theme.back);
    this.cards = [];
    this.prev = null;

    game.cards.forEach((card, i) => {
      const container = this.track(s.add.container(left + (i % cols) * (size + gap), top + Math.floor(i / cols) * (size + gap)));
      const backG = roundedRect(s, size, size, back, 0xffffff, 26);
      const mark = label(s, '?', Math.floor(size * 0.55), '#ffffff');
      const backView = s.add.container(0, 0, [backG, mark]);
      const faceBg = s.add.graphics();
      const img = picture(s, card.image, size * 0.58).setPosition(0, -size * 0.1);
      const text = label(s, card.label, Math.floor(size * 0.15)).setPosition(0, size * 0.34);
      const faceView = s.add.container(0, 0, [faceBg, img, text]).setVisible(false);
      container.add([backView, faceView]);
      container.setSize(size, size).setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        sound.unlock();
        this.send({ type: 'game', action: { type: 'flip', cardId: card.id } });
      });
      const view = { container, backView, faceView, faceBg, size, shown: false, matched: false };
      this.drawFace(view, false);
      this.cards.push(view);
    });
  }

  drawFace(view, matched) {
    const s = view.size;
    view.faceBg.clear();
    view.faceBg.fillStyle(matched ? 0xbdf5c9 : 0xffffff, 1).fillRoundedRect(-s / 2, -s / 2, s, s, 26);
    view.faceBg.lineStyle(6, matched ? 0x2ea84f : 0xffffff, 1).strokeRoundedRect(-s / 2, -s / 2, s, s, 26);
  }

  flipTo(view, show) {
    view.shown = show;
    const s = this.scene;
    s.tweens.killTweensOf(view.container);
    s.tweens.add({
      targets: view.container,
      scaleX: 0,
      duration: 110,
      onComplete: () => {
        view.backView.setVisible(!view.shown);
        view.faceView.setVisible(view.shown);
        s.tweens.add({ targets: view.container, scaleX: 1, duration: 110 });
      },
    });
  }

  update(state) {
    const game = state.game;
    let turnedUp = false;
    game.cards.forEach((card, i) => {
      const view = this.cards[i];
      const show = card.faceUp || card.matched;
      if (view.shown !== show) {
        this.flipTo(view, show);
        if (show) turnedUp = true;
      }
      if (card.matched && !view.matched) {
        view.matched = true;
        this.drawFace(view, true);
        this.scene.tweens.add({ targets: view.container, scale: 1.08, duration: 140, yoyo: true, delay: 220 });
      }
    });
    const prev = this.prev;
    if (prev) {
      if (game.matches > prev.matches) sound.good();
      else if (prev.flipped.length === 2 && game.flipped.length === 0) sound.oops();
      else if (turnedUp) sound.tap();
    }
    this.prev = game;
  }

  hud(state) {
    return 'Pairs ' + state.game.matches + ' / ' + state.game.pairs;
  }
}

// ---------------------------------------------------------------------------------------------------------
// Sort it: drag each picture into the right box.

export class SortView extends View {
  build(state) {
    const s = this.scene;
    const game = state.game;
    this.items = [];
    this.lastWrongN = 0;
    this.bins = game.categories.map((category, i) => {
      const cx = i === 0 ? 340 : 940;
      const cy = 280;
      const rect = new Phaser.Geom.Rectangle(cx - 240, cy - 150, 480, 300);
      const g = this.track(s.add.graphics());
      g.fillStyle(0xffffff, 0.22).fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 36);
      g.lineStyle(6, 0xffffff, 0.8).strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 36);
      this.track(s.add.image(cx - 110, cy - 112, category.image).setDisplaySize(56, 56));
      this.track(
        s.add.text(cx - 70, cy - 112, category.label, { fontFamily: FONT, fontSize: '36px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5)
      );
      return { category, cx, cy, rect, filled: 0 };
    });

    const count = game.items.length;
    const size = Math.min(130, Math.floor((1180 - 16 * (count - 1)) / count));
    const startX = AREA.centerX - ((count - 1) * (size + 16)) / 2;
    game.items.forEach((item, i) => {
      const home = { x: startX + i * (size + 16), y: 600 };
      const container = this.track(s.add.container(home.x, home.y));
      container.add(roundedRect(s, size, size, 0xffffff, 0xffffff, 22));
      container.add(picture(s, item.image, size * 0.66).setPosition(0, -size * 0.08));
      container.add(label(s, item.label, Math.floor(size * 0.14)).setPosition(0, size * 0.36));
      container.setSize(size, size).setInteractive({ useHandCursor: true, draggable: true });
      s.input.setDraggable(container);
      container.on('dragstart', () => {
        sound.unlock();
        container.setDepth(20).setScale(1.12);
      });
      container.on('drag', (pointer, x, y) => container.setPosition(x, y));
      container.on('dragend', (pointer) => {
        container.setScale(1).setDepth(0);
        const bin = this.bins.find((b) => Phaser.Geom.Rectangle.Contains(b.rect, pointer.x, pointer.y));
        if (bin && !view.placed) this.send({ type: 'game', action: { type: 'place', itemId: item.id, category: bin.category.id } });
        if (!view.placed) s.tweens.add({ targets: container, x: home.x, y: home.y, duration: 180, ease: 'Back.Out' });
      });
      const view = { container, home, size, placed: false };
      this.items.push(view);
    });
  }

  update(state) {
    const game = state.game;
    game.items.forEach((item, i) => {
      const view = this.items[i];
      if (item.placed && !view.placed) {
        view.placed = true;
        const bin = this.bins.find((b) => b.category.id === item.category);
        const slot = bin.filled++;
        const col = slot % 2;
        const row = Math.floor(slot / 2);
        view.container.disableInteractive();
        this.scene.tweens.add({
          targets: view.container,
          x: bin.cx - 62 + col * 124,
          y: bin.cy + 18 + row * 112,
          scale: 0.72,
          duration: 260,
          ease: 'Back.Out',
        });
        sound.good();
      }
    });
    if (game.lastWrong && game.lastWrong.n !== this.lastWrongN) {
      this.lastWrongN = game.lastWrong.n;
      const view = this.items[game.lastWrong.itemId];
      if (view && !view.placed) {
        view.container.setPosition(view.home.x, view.home.y);
        shake(this.scene, view.container);
      }
      sound.oops();
    }
  }

  hud(state) {
    return 'Sorted ' + state.game.placedCount + ' / ' + state.game.items.length;
  }
}

// ---------------------------------------------------------------------------------------------------------
// Copy the pattern.

export class SequenceView extends View {
  build(state) {
    const s = this.scene;
    const game = state.game;
    const size = 220;
    const gap = 36;
    const startX = AREA.centerX - (3 * (size + gap)) / 2;
    this.lastShowId = 0;
    this.lastTapN = 0;
    this.pads = game.buttons.map((button, i) => {
      const container = this.track(s.add.container(startX + i * (size + gap), 400));
      const base = roundedRect(s, size, size, PAD_COLORS[i], 0xffffff, 34);
      const glow = roundedRect(s, size + 22, size + 22, 0xffffff, null, 40).setAlpha(0);
      container.add([glow, base, picture(s, button.image, size * 0.62)]);
      container.setSize(size, size).setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        sound.unlock();
        this.send({ type: 'game', action: { type: 'tap', idx: i } });
      });
      return { container, glow };
    });
    this.message = this.track(s.add.text(AREA.centerX, 175, '', { fontFamily: FONT, fontSize: '54px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
    this.dots = this.track(s.add.graphics());
  }

  flash(index, silent = false) {
    const pad = this.pads[index];
    if (!pad) return;
    if (!silent) sound.pad(index);
    pad.glow.setAlpha(1);
    this.scene.tweens.add({ targets: pad.container, scale: 1.1, duration: 140, yoyo: true });
    this.scene.tweens.add({ targets: pad.glow, alpha: 0, duration: 380, delay: 120 });
  }

  update(state, template) {
    const game = state.game;
    if (game.showId !== this.lastShowId) {
      this.lastShowId = game.showId;
      for (let i = 0; i < game.length; i++) {
        this.scene.time.delayedCall(350 + i * template.stepMs, () => this.flash(game.pattern[i]));
      }
    }
    if (game.lastTap && game.lastTap.n !== this.lastTapN) {
      this.lastTapN = game.lastTap.n;
      if (game.lastTap.ok) this.flash(game.lastTap.idx);
      else {
        shake(this.scene, this.pads[game.lastTap.idx].container);
        sound.oops();
      }
    }
    this.message.setText(game.status === 'showing' ? 'Watch…' : game.status === 'input' ? 'Your turn!' : '');
    this.dots.clear();
    for (let i = 0; i < game.length; i++) {
      this.dots.fillStyle(0xffffff, i < game.step ? 1 : 0.35);
      this.dots.fillCircle(AREA.centerX + (i - (game.length - 1) / 2) * 40, 640, 12);
    }
  }

  hud(state) {
    return 'Pattern of ' + state.game.length;
  }
}

// ---------------------------------------------------------------------------------------------------------
// Odd one out.

export class OddView extends View {
  build() {
    const s = this.scene;
    this.shownQuestion = -1;
    this.lastWrongN = 0;
    this.options = [];
    this.title = this.track(
      s.add.text(AREA.centerX, 165, 'Which one is different?', { fontFamily: FONT, fontSize: '54px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5)
    );
  }

  showQuestion(game) {
    const s = this.scene;
    this.options.forEach((o) => o.container.destroy());
    this.options = [];
    const question = game.questions[game.current];
    const count = question.options.length;
    const size = count === 3 ? 270 : 230;
    const gap = 30;
    const startX = AREA.centerX - ((count - 1) * (size + gap)) / 2;
    question.options.forEach((option, i) => {
      const container = s.add.container(startX + i * (size + gap), 410);
      container.add(roundedRect(s, size, size + 40, 0xffffff, 0xffffff, 34));
      container.add(picture(s, option.image, size * 0.68).setPosition(0, -28));
      container.add(label(s, option.label, 34).setPosition(0, size * 0.44));
      container.setSize(size, size + 40).setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        sound.unlock();
        this.send({ type: 'game', action: { type: 'pick', idx: i } });
      });
      container.setScale(0.85);
      s.tweens.add({ targets: container, scale: 1, duration: 240, ease: 'Back.Out', delay: i * 60 });
      this.options.push({ container });
    });
  }

  update(state) {
    const game = state.game;
    if (game.current !== this.shownQuestion && game.status === 'playing') {
      if (this.shownQuestion !== -1) sound.good();
      this.shownQuestion = game.current;
      this.lastWrongN = game.mistakes;
      this.showQuestion(game);
    }
    if (game.status === 'won' && this.shownQuestion !== game.questions.length) {
      this.shownQuestion = game.questions.length;
      sound.good();
    }
    if (game.lastWrong && game.lastWrong.n !== this.lastWrongN) {
      this.lastWrongN = game.lastWrong.n;
      const option = this.options[game.lastWrong.idx];
      if (option) shake(this.scene, option.container);
      sound.oops();
    }
  }

  destroy() {
    this.options.forEach((o) => o.container.destroy());
    this.options = [];
    super.destroy();
  }

  hud(state) {
    return 'Question ' + Math.min(state.game.current + 1, state.game.questions.length) + ' of ' + state.game.questions.length;
  }
}

export const VIEWS = { match: MatchView, sort: SortView, sequence: SequenceView, odd: OddView };
