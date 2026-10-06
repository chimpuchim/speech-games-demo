// Entry point: picks the role from the URL, loads the content packs (the "backend API"), connects the
// transport, starts either the authority (therapist) or a thin client (student) and wires the controls.

import { Authority, MAX_LEVEL } from './authority.js';
import { TEMPLATES, TEMPLATE_IDS } from './logic/index.js';
import { connect } from './transport.js';
import { GameScene } from './scene.js';

const params = new URLSearchParams(location.search);
const role = params.get('role');
const room = params.get('room') || '';
const solo = params.get('solo') === '1';
// ?game=sort starts that game straight away in a clean full-screen view (for sharing a single game).
const autoGame = params.get('game');
const wsUrl = params.get('ws') || (location.protocol === 'http:' ? 'ws://' + location.hostname + ':8766' : '');

const $ = (id) => document.getElementById(id);

/** Content comes from JSON files here; the production version would call the platform's content API. */
async function loadPacks() {
  const index = await (await fetch('content/index.json')).json();
  const packs = {};
  for (const id of index.packs) packs[id] = await (await fetch('content/' + id + '.json')).json();
  return packs;
}

function allImages(packs) {
  const urls = new Set();
  for (const pack of Object.values(packs)) {
    pack.items.forEach((i) => urls.add(i.image));
    pack.categories.forEach((c) => urls.add(c.image));
  }
  return [...urls];
}

function newRoom() {
  return Math.random().toString(36).slice(2, 8);
}

function showStart() {
  $('start').hidden = false;
  $('startTherapist').onclick = () => (location.search = '?role=therapist&room=' + newRoom());
  $('startSolo').onclick = () => (location.search = '?role=therapist&solo=1&room=' + newRoom());
}

/** Student side: renders the latest snapshot from the therapist. */
function studentSession(transport) {
  const listeners = new Set();
  let state = null;
  const newer = (a, b) => !b || a.epoch > b.epoch || (a.epoch === b.epoch && a.version >= b.version);
  transport.on('state', (message) => {
    if (!newer(message.state, state)) return;
    state = message.state;
    listeners.forEach((fn) => fn(state));
  });
  return {
    send: (intent) => transport.send({ t: 'intent', intent }),
    subscribe: (fn) => {
      listeners.add(fn);
      if (state) fn(state);
      return () => listeners.delete(fn);
    },
  };
}

/** Therapist side: owns the authority, accepts the student's intents, publishes every change. */
function therapistSession(transport, packs) {
  const listeners = new Set();
  const authority = new Authority({
    packs,
    packId: Object.keys(packs)[0],
    rewardMs: autoGame ? 60 * 60 * 1000 : undefined,
    onChange: (state) => {
      listeners.forEach((fn) => fn(state));
      if (transport) transport.send({ t: 'state', state });
    },
  });
  if (transport) {
    transport.on('intent', (message) => authority.handle(message.intent, 'student'));
    transport.on('hello', () => transport.send({ t: 'state', state: authority.state }));
    transport.on('presence', () => transport.send({ t: 'state', state: authority.state }));
  }
  return {
    authority,
    send: (intent) => authority.handle(intent, 'therapist'),
    subscribe: (fn) => {
      listeners.add(fn);
      fn(authority.state);
      return () => listeners.delete(fn);
    },
  };
}

function wireStatus(transport) {
  const status = $('status');
  let presence = { therapist: role === 'therapist', students: 0 };
  let link = transport ? 'connected' : 'solo';
  const render = () => {
    let text;
    let ok = true;
    if (solo) text = 'Solo mode';
    else if (link === 'reconnecting') (text = 'Reconnecting…'), (ok = false);
    else if (role === 'therapist') (ok = presence.students > 0), (text = ok ? 'Student connected' : 'Waiting for the student…');
    else (ok = presence.therapist), (text = ok ? 'Therapist connected' : 'Waiting for the therapist…');
    status.textContent = text;
    status.dataset.ok = ok ? 'yes' : 'no';
    if (transport) $('mode').textContent = transport.mode === 'websocket' ? 'WebSocket' : 'Same-browser demo mode';
  };
  if (transport) {
    transport.on('presence', (p) => {
      presence = p;
      render();
    });
    transport.on('status', (s) => {
      link = s;
      render();
    });
  }
  render();
}

function wireControls(session, packs) {
  const controls = $('controls');
  controls.hidden = false;
  const button = (parent, text, onClick) => {
    const el = document.createElement('button');
    el.textContent = text;
    el.onclick = onClick;
    parent.appendChild(el);
    return el;
  };

  const packButtons = {};
  Object.values(packs).forEach((pack) => (packButtons[pack.id] = button($('packs'), pack.title, () => session.send({ type: 'setPack', packId: pack.id }))));
  const templateButtons = {};
  TEMPLATE_IDS.forEach((id) => (templateButtons[id] = button($('templates'), TEMPLATES[id].title, () => session.send({ type: 'setTemplate', template: id }))));
  const levelButtons = {};
  for (let level = 1; level <= MAX_LEVEL; level++) levelButtons[level] = button($('levels'), String(level), () => session.send({ type: 'setLevel', level }));

  $('prev').onclick = () => session.send({ type: 'target', delta: -1 });
  $('next').onclick = () => session.send({ type: 'target', delta: 1 });
  $('startReward').onclick = () => session.send({ type: 'startReward' });
  $('backToCards').onclick = () => session.send({ type: 'backToCards' });
  $('newGame').onclick = () => session.send({ type: 'newGame' });
  $('copyLink').onclick = async () => {
    const url = location.origin + location.pathname + '?role=student&room=' + room + (params.get('ws') ? '&ws=' + encodeURIComponent(params.get('ws')) : '');
    try {
      await navigator.clipboard.writeText(url);
      $('copyLink').textContent = 'Link copied';
    } catch (e) {
      $('copyLink').textContent = url;
    }
  };
  $('openStudent').onclick = () => window.open('?role=student&room=' + room + (params.get('ws') ? '&ws=' + encodeURIComponent(params.get('ws')) : ''), '_blank');
  if (solo) {
    $('copyLink').hidden = true;
    $('openStudent').hidden = true;
  }

  session.subscribe((state) => {
    Object.entries(packButtons).forEach(([id, el]) => el.classList.toggle('on', id === state.packId));
    Object.entries(templateButtons).forEach(([id, el]) => el.classList.toggle('on', id === state.template));
    Object.entries(levelButtons).forEach(([lvl, el]) => el.classList.toggle('on', Number(lvl) === state.level));
    const inGame = state.phase === 'game';
    $('targetName').textContent = state.targets[state.targetIndex].label;
    $('prev').disabled = $('next').disabled = inGame;
    $('startReward').hidden = inGame;
    $('backToCards').hidden = !inGame;
    $('newGame').hidden = !inGame;
  });
}

async function main() {
  if (role !== 'therapist' && role !== 'student') return showStart();
  const packs = await loadPacks();
  const transport = solo ? null : await connect({ room, role, wsUrl });
  const session = role === 'therapist' ? therapistSession(transport, packs) : studentSession(transport);

  $('start').hidden = true;
  $('bar').hidden = !!autoGame;
  if (autoGame) document.body.classList.add('single');
  $('game').hidden = false;
  $('roleLabel').textContent = role === 'therapist' ? 'Therapist view' : 'Student view';
  wireStatus(transport);
  if (role === 'therapist' && autoGame && TEMPLATES[autoGame]) {
    session.send({ type: 'setTemplate', template: autoGame });
    session.send({ type: 'startReward' });
  } else if (role === 'therapist') wireControls(session, packs);
  else {
    $('copyLink').hidden = true;
    $('openStudent').hidden = true;
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#7fd1ae',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: new GameScene({ role, send: session.send, subscribe: session.subscribe, images: allImages(packs) }),
  });
}

main();
