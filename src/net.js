// ============================================================
// Multiplayer client: subscribes to the presence stream (SSE) of
// ONE room and POSTs the local player's position there. The server
// relays only the roster of players in the same room, so a private
// lobby of friends never sees the rest of the playerbase.
// The presence server is an always-on Node host (Railway), reached
// cross-origin; override with window.MYTHICA_SERVER for local dev.
// ============================================================

export const SERVER = (typeof window !== 'undefined' && window.MYTHICA_SERVER != null)
  ? window.MYTHICA_SERVER
  : 'https://mythalon-server-production.up.railway.app';

// quick lobby probe: how many players are already in a room
// (returns -1 if the server can't be reached)
export async function roomCount(room) {
  try {
    const r = await fetch(`${SERVER}/mp/room?room=${encodeURIComponent(room)}`, { cache: 'no-store' });
    const d = await r.json();
    return d.count || 0;
  } catch (e) { return -1; }
}

// total players currently online across all rooms (-1 if the server is unreachable)
export async function onlineCount() {
  try {
    const r = await fetch(`${SERVER}/mp/online`, { cache: 'no-store' });
    const d = await r.json();
    return d.online || 0;
  } catch (e) { return -1; }
}

export class Net {
  constructor(room, id, onState) {
    this.room = room; this.id = id; this.onState = onState;
    this.es = null; this.online = false;
  }
  connect() {
    try {
      this.es = new EventSource(`${SERVER}/mp/stream?room=${encodeURIComponent(this.room)}&id=${encodeURIComponent(this.id)}`);
      this.es.onopen = () => { this.online = true; };
      this.es.onmessage = (e) => {
        try { const d = JSON.parse(e.data); this.online = true; if (this.onState) this.onState(d.players || []); } catch (err) {}
      };
      this.es.onerror = () => { this.online = false; };
    } catch (e) { this.online = false; }
  }
  send(state) {
    try {
      fetch(`${SERVER}/mp/update`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ room: this.room, id: this.id, ...state }),
      }).catch(() => {});
    } catch (e) {}
  }
  close() {
    try { if (this.es) this.es.close(); } catch (e) {}
    try {
      fetch(`${SERVER}/mp/leave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ room: this.room, id: this.id }) }).catch(() => {});
    } catch (e) {}
  }
}
