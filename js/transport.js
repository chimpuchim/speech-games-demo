// Transport between the therapist and student browsers.
//
// 1. WebSocket through the relay in server/relay.py (real network, works across devices).
// 2. BroadcastChannel fallback (two tabs in one browser), used when no relay is reachable.
//    This is what makes a static deployment such as GitHub Pages work for a quick demo.
//
// Both modes expose the same small API:
//   transport.on(type, fn)   types: 'state' (student), 'intent' (therapist), 'presence', 'status'
//   transport.send(message)  messages: { t: 'state', state } or { t: 'intent', intent }

const CONNECT_TIMEOUT_MS = 1500;
const BEAT_MS = 2000;
const ALIVE_MS = 5000;

class Emitter {
  constructor() {
    this.handlers = {};
  }
  on(type, fn) {
    (this.handlers[type] = this.handlers[type] || []).push(fn);
  }
  emit(type, payload) {
    (this.handlers[type] || []).forEach((fn) => fn(payload));
  }
}

function openSocket(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('timeout'));
    }, CONNECT_TIMEOUT_MS);
    socket.onopen = () => {
      clearTimeout(timer);
      resolve(socket);
    };
    socket.onerror = () => {
      clearTimeout(timer);
      reject(new Error('error'));
    };
  });
}

class SocketTransport extends Emitter {
  constructor(socket, { url, room, role }) {
    super();
    this.mode = 'websocket';
    this.url = url;
    this.room = room;
    this.role = role;
    this.attach(socket);
    this.retry = 1000;
  }

  attach(socket) {
    this.socket = socket;
    socket.send(JSON.stringify({ t: 'join', room: this.room, role: this.role }));
    socket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      if (message.t === 'presence') this.emit('presence', message);
      else if (message.t === 'joined') this.emit('joined', message);
      else this.emit(message.t, message);
    };
    socket.onclose = () => this.reconnect();
    this.emit('status', 'connected');
  }

  async reconnect() {
    this.emit('status', 'reconnecting');
    for (;;) {
      await new Promise((r) => setTimeout(r, this.retry));
      try {
        this.attach(await openSocket(this.url));
        this.retry = 1000;
        return;
      } catch (e) {
        this.retry = Math.min(this.retry * 2, 8000);
      }
    }
  }

  send(message) {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }
}

class LocalTransport extends Emitter {
  constructor({ room, role }) {
    super();
    this.mode = 'local';
    this.role = role;
    this.lastPeer = 0;
    this.lastShown = null;
    this.channel = new BroadcastChannel('speech-games-' + room);
    this.channel.onmessage = (event) => this.onMessage(event.data);
    // Heartbeats stand in for the relay's presence messages.
    setInterval(() => this.channel.postMessage({ t: role === 'therapist' ? 'beat' : 'ping' }), BEAT_MS);
    setInterval(() => this.updatePresence(), 1000);
    if (role === 'student') this.channel.postMessage({ t: 'hello' });
  }

  onMessage(message) {
    if (message.t === 'beat' || message.t === 'ping' || message.t === 'hello') this.lastPeer = Date.now();
    if (message.t === 'hello' || message.t === 'ping') this.emit('hello', message);
    if (message.t === 'state' || message.t === 'intent') {
      this.lastPeer = Date.now();
      this.emit(message.t, message);
    }
    this.updatePresence();
  }

  updatePresence() {
    const alive = Date.now() - this.lastPeer < ALIVE_MS;
    const presence =
      this.role === 'therapist' ? { therapist: true, students: alive ? 1 : 0 } : { therapist: alive, students: 1 };
    const key = JSON.stringify(presence);
    if (key !== this.lastShown) {
      this.lastShown = key;
      this.emit('presence', presence);
    }
  }

  send(message) {
    this.channel.postMessage(message);
  }
}

/**
 * Connects through the relay when it is reachable, otherwise falls back to a same-browser channel.
 * @returns {Promise<SocketTransport|LocalTransport>}
 */
export async function connect({ room, role, wsUrl }) {
  if (wsUrl) {
    try {
      const socket = await openSocket(wsUrl);
      return new SocketTransport(socket, { url: wsUrl, room, role });
    } catch (e) {
      // fall through to the local channel
    }
  }
  return new LocalTransport({ room, role });
}
