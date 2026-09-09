// Static file server for Wandermere + a tiny dependency-free multiplayer
// presence layer (Server-Sent Events). Players who hit the same server
// (e.g. two browser tabs) appear in each other's world.
// Run: node server.js   ->   http://localhost:5173
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 5173;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.webp': 'image/webp',
};

// ---------- multiplayer presence (in-memory) ----------
const rooms = new Map();              // room -> Map(id -> player)
const STALE = 8000;                   // drop players silent for 8s
function roomMap(room) { let m = rooms.get(room); if (!m) { m = new Map(); rooms.set(room, m); } return m; }
function roster(room) {
  const m = rooms.get(room); if (!m) return [];
  const now = Date.now(); const out = [];
  for (const [id, p] of m) { if (now - p.t > STALE) m.delete(id); else out.push(p); }
  return out;
}
function readBody(req) {
  return new Promise((resolve) => {
    let b = ''; req.on('data', (c) => { b += c; if (b.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
function sendJson(res, obj) { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }); res.end(JSON.stringify(obj)); }

async function handleMp(req, res, url) {
  const q = url.searchParams;
  if (url.pathname === '/mp/stream' && req.method === 'GET') {
    const room = q.get('room') || 'public';
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    res.write(': connected\n\n');
    const tick = setInterval(() => {
      try { res.write(`data: ${JSON.stringify({ players: roster(room) })}\n\n`); } catch (e) { clearInterval(tick); }
    }, 650);
    req.on('close', () => clearInterval(tick));
    return;
  }
  if (url.pathname === '/mp/update' && req.method === 'POST') {
    const b = await readBody(req);
    if (b && b.room && b.id) {
      roomMap(b.room).set(b.id, {
        id: String(b.id), name: String(b.name || 'Wanderer').slice(0, 16),
        x: +b.x || 0, y: +b.y || 0, shirt: +b.shirt || 0, hair: +b.hair || 0, skin: +b.skin || 0,
        lead: b.lead ? String(b.lead).slice(0, 24) : '', t: Date.now(),
      });
    }
    return sendJson(res, { ok: true, count: roster(b.room || 'public').length });
  }
  if (url.pathname === '/mp/leave' && req.method === 'POST') {
    const b = await readBody(req);
    if (b && b.room && rooms.get(b.room)) rooms.get(b.room).delete(String(b.id));
    return sendJson(res, { ok: true });
  }
  if (url.pathname === '/mp/room' && req.method === 'GET') {
    const room = q.get('room') || 'public';
    return sendJson(res, { count: roster(room).length });
  }
  if (url.pathname === '/mp/online' && req.method === 'GET') {
    let online = 0;
    for (const room of rooms.keys()) online += roster(room).length;
    return sendJson(res, { online });
  }
  res.writeHead(404); res.end('not found');
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/mp/')) return handleMp(req, res, url);

  let urlPath = decodeURIComponent(url.pathname);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404 Not Found: ' + urlPath); }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, () => console.log('Wandermere server (with multiplayer presence) on http://localhost:' + PORT));
