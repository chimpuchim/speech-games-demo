// Sound effects generated with the Web Audio API, so the demo needs no audio files.
// Browsers keep audio locked until the first tap; every call is wrapped so a blocked context never breaks the game.

let context = null;

function audio() {
  if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
  return context;
}

function tone(freq, duration = 0.12, delay = 0, type = 'sine', volume = 0.13) {
  try {
    const c = audio();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const start = c.currentTime + delay;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch (e) {
    // audio is optional
  }
}

const PAD_NOTES = [392, 494, 587, 698];

export const sound = {
  unlock() {
    try {
      audio().resume();
    } catch (e) {
      // ignore
    }
  },
  tap: () => tone(520, 0.07),
  good: () => {
    tone(660, 0.12);
    tone(880, 0.18, 0.1);
  },
  oops: () => tone(210, 0.2, 0, 'triangle'),
  pad: (index) => tone(PAD_NOTES[index] || 440, 0.28, 0, 'triangle', 0.16),
  card: () => tone(740, 0.1, 0, 'sine', 0.1),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, i * 0.12)),
  levelUp: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.16, i * 0.09, 'square', 0.07)),
};
