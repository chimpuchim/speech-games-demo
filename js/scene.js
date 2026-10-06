// The one Phaser scene. It picks the right view for the session phase (speech card or game template),
// draws the themed background, the top bar (title, level, countdown) and the "great job" banner.

import { TEMPLATES } from './logic/index.js';
import { CardView, VIEWS } from './views.js';
import { sound } from './audio.js';

const FONT = '"Baloo 2", "Nunito", "Trebuchet MS", system-ui, sans-serif';

const hex = (css) => parseInt(css.replace('#', ''), 16);

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

export class GameScene extends Phaser.Scene {
  /**
   * @param {{ role: string, send: Function, subscribe: Function, images: string[] }} options
   * `images` are the picture URLs of every content pack; they are loaded once before the first frame.
   */
  constructor({ role, send, subscribe, images }) {
    super('game');
    this.role = role;
    this.send = send;
    this.subscribe = subscribe;
    this.images = images;
    this.view = null;
    this.viewKey = '';
    this.last = null;
    this.deadline = 0;
    this.deadlineFor = -1;
    this.sceneKey = '';
  }

  preload() {
    this.images.forEach((url) => this.load.svg(url, url, { width: 256, height: 256 }));
  }

  create() {
    this.cameras.main.setBackgroundColor('#7fd1ae');
    this.decor = this.add.graphics().setDepth(-10);
    this.title = this.add.text(36, 26, '', { fontFamily: FONT, fontSize: '38px', color: '#ffffff', fontStyle: 'bold' }).setDepth(5);
    this.sub = this.add.text(36, 70, '', { fontFamily: FONT, fontSize: '26px', color: '#ffffff' }).setDepth(5).setAlpha(0.9);
    this.timer = this.add.text(1244, 24, '', { fontFamily: FONT, fontSize: '46px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(5);
    this.level = this.add.text(1244, 78, '', { fontFamily: FONT, fontSize: '28px', color: '#fff3b0', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(5);
    this.waiting = this.add
      .text(640, 360, this.role === 'student' ? 'Waiting for the therapist…' : '', { fontFamily: FONT, fontSize: '48px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(5);
    this.bannerBg = this.add.rectangle(640, 380, 860, 220, 0x000000, 0.55).setDepth(30).setVisible(false);
    this.banner = this.add
      .text(640, 360, '', { fontFamily: FONT, fontSize: '78px', color: '#ffffff', fontStyle: 'bold', align: 'center' })
      .setOrigin(0.5)
      .setDepth(31)
      .setVisible(false);
    this.bannerSub = this.add
      .text(640, 440, '', { fontFamily: FONT, fontSize: '36px', color: '#fff3b0', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(31)
      .setVisible(false);

    this.input.once('pointerdown', () => sound.unlock());
    this.unsubscribe = this.subscribe((state) => this.onState(state));
    this.events.once('shutdown', () => this.unsubscribe());
  }

  update() {
    if (!this.last || this.last.phase !== 'game') {
      this.timer.setText('');
      return;
    }
    // A very long countdown (single-game share links) is not worth showing.
    this.timer.setText(this.last.endsInMs > 10 * 60 * 1000 ? '' : '⏱ ' + formatTime(Math.max(0, this.deadline - Date.now())));
  }

  onState(state) {
    if (state.phase === 'game' && !state.game) return; // never draw a game that does not exist yet
    this.waiting.setVisible(false);
    this.drawBackground(state);

    if (state.phase === 'game' && state.rewardId !== this.deadlineFor) {
      this.deadlineFor = state.rewardId;
      this.deadline = Date.now() + state.endsInMs;
    }

    const key = [state.phase, state.template, state.packId, state.round, state.phase === 'game' ? state.level : ''].join(':');
    if (key !== this.viewKey) {
      if (this.view) this.view.destroy();
      this.viewKey = key;
      const ViewClass = state.phase === 'cards' ? CardView : VIEWS[state.template];
      this.view = new ViewClass(this, this.send);
      this.view.build(state);
    }
    this.view.update(state, TEMPLATES[state.template]);
    this.updateHud(state);
    this.updateBanner(state);
    this.last = state;
  }

  updateHud(state) {
    this.title.setText(state.packTitle);
    const inGame = state.phase === 'game' && state.game;
    this.sub.setText(inGame ? state.templateTitle + '   ·   ' + this.view.hud(state) : this.view.hud(state));
    const stars = '★'.repeat(state.level) + '☆'.repeat(3 - state.level);
    this.level.setText(inGame ? 'Level ' + state.level + '  ' + stars : '');
  }

  updateBanner(state) {
    const won = state.phase === 'game' && state.game && TEMPLATES[state.template].isDone(state.game);
    const prevWon = this.last && this.last.phase === 'game' && this.last.game && TEMPLATES[this.last.template].isDone(this.last.game);
    this.bannerBg.setVisible(!!won);
    this.banner.setVisible(!!won).setText('Great job!');
    const result = state.lastResult;
    const text = result ? (result.to > result.from ? 'Level up!' : result.to < result.from ? 'Let’s try an easier one' : 'Nice and steady') : '';
    this.bannerSub.setVisible(!!won).setText(text);
    if (won && !prevWon) {
      if (result && result.to > result.from) sound.levelUp();
      else sound.win();
      this.banner.setScale(0.6);
      this.tweens.add({ targets: this.banner, scale: 1, duration: 320, ease: 'Back.Out' });
    }
  }

  /** Themed scenery behind the game: sky, hills and clouds for "meadow", a striped tablecloth for "kitchen". */
  drawBackground(state) {
    const key = state.scene + ':' + state.theme.bg;
    if (key === this.sceneKey) return;
    this.sceneKey = key;
    this.cameras.main.setBackgroundColor(state.theme.bg);
    const g = this.decor;
    g.clear();
    if (state.scene === 'kitchen') {
      g.fillStyle(0xffffff, 0.16);
      for (let x = -60; x < 1340; x += 120) g.fillRect(x, 0, 60, 720);
      g.fillStyle(0xffffff, 0.2).fillRoundedRect(-40, 640, 1360, 120, 30);
    } else {
      g.fillStyle(0xffffff, 0.45);
      [[200, 110, 150], [620, 80, 120], [1080, 120, 170]].forEach(([x, y, w]) => {
        g.fillEllipse(x, y, w, w * 0.4).fillEllipse(x + w * 0.3, y + 10, w * 0.7, w * 0.3);
      });
      g.fillStyle(0xfff3a8, 0.9).fillCircle(1190, 190, 40);
      g.fillStyle(hex('#4fae7e'), 0.55).fillEllipse(260, 760, 900, 300).fillEllipse(1020, 780, 1000, 340);
      g.fillStyle(hex('#3f9b6c'), 0.5).fillEllipse(640, 800, 1100, 280);
    }
  }
}
