// ============================================================
// Start screen: shown before the game. Customise your avatar
// (name + clothes), then choose Offline (no login) or
// Multiplayer (join a room code, or log in with email).
// ============================================================

import { startGame } from './game.js?v=51';
import { onlineCount } from './net.js?v=51';

const $ = (id) => document.getElementById(id);

// customisation palettes
const SKINS  = [0xe8b890, 0xf2cda0, 0xd9a066, 0xc98d5a, 0x8d5a32, 0x5e3a1e];
const HAIRS  = [0x2a2018, 0x6a4a2a, 0xb08040, 0xd8c060, 0xc23a3a, 0x3a4a8a, 0xe6e6e6];
const SHIRTS = [0x2a9d9d, 0xc23a3a, 0x3a7ad8, 0x58c04a, 0xe0a020, 0x9a4ae0, 0xe7f3ea, 0x171b28];
const PANTSC = [0x2a3550, 0x3a2a1a, 0x444a52, 0x2f6b39, 0x6a2a4a, 0x14110e];

const DEFAULT = { skin: SKINS[0], hair: HAIRS[0], shirt: SHIRTS[0], pants: PANTSC[0] };

const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
function shade(n, f = 0.78) { const r = ((n >> 16) & 255) * f | 0, g = ((n >> 8) & 255) * f | 0, b = (n & 255) * f | 0; return (r << 16) | (g << 8) | b; }

let avatar = loadAvatar();
let launched = false;

function loadAvatar() {
  try { const a = JSON.parse(localStorage.getItem('wandermere_avatar') || 'null'); if (a) return { ...DEFAULT, ...a }; } catch (e) {}
  return { ...DEFAULT };
}

// draw the avatar into the preview canvas (mirrors the in-game player sprite)
function drawAvatar() {
  const cv = $('avatar-preview'); if (!cv) return;
  const ctx = cv.getContext('2d'); const S = 3;
  ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, cv.width, cv.height);
  const R = (c, x, y, w, h) => { ctx.fillStyle = hex(c); ctx.fillRect(x * S, y * S, w * S, h * S); };
  const sd = shade(avatar.shirt);
  ctx.fillStyle = 'rgba(20,28,18,0.35)'; ctx.beginPath(); ctx.ellipse(16 * S, 45 * S, 9 * S, 3 * S, 0, 0, 7); ctx.fill();
  R(avatar.pants, 11, 33, 4, 9); R(avatar.pants, 17, 33, 4, 9);          // legs
  R(0x171b28, 10, 41, 5, 3); R(0x171b28, 17, 41, 5, 3);                  // shoes
  R(sd, 6, 23, 4, 8); R(sd, 22, 23, 4, 8);                              // sleeves
  R(avatar.skin, 6, 30, 4, 3); R(avatar.skin, 22, 30, 4, 3);            // hands
  R(avatar.shirt, 9, 22, 14, 13); R(sd, 9, 32, 14, 3);                  // torso
  R(avatar.skin, 14, 19, 4, 3); R(avatar.skin, 10, 8, 12, 12);          // neck + head
  R(avatar.hair, 9, 5, 14, 6); R(avatar.hair, 9, 11, 2, 5); R(avatar.hair, 21, 11, 2, 5);
  R(avatar.hair, 11, 3, 4, 2); R(avatar.hair, 16, 4, 4, 2);             // hair
  R(0x2a2018, 13, 14, 2, 2); R(0x2a2018, 17, 14, 2, 2);                 // eyes
}

function buildSwatches(elId, colors, field) {
  const el = $(elId); if (!el) return; el.innerHTML = '';
  colors.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'swatch' + (avatar[field] === c ? ' on' : '');
    b.style.background = hex(c);
    b.onclick = () => { avatar[field] = c; el.querySelectorAll('.swatch').forEach((s) => s.classList.remove('on')); b.classList.add('on'); drawAvatar(); };
    el.appendChild(b);
  });
}

function setMsg(t, color = '#9ab2a2') { const m = $('start-msg'); if (m) { m.textContent = t || ''; m.style.color = color; } }

function currentName() { return ($('avatar-name').value || '').trim().slice(0, 16) || 'Wanderer'; }

function launch(mode, identity, room) {
  if (launched) return; launched = true;
  avatar.name = currentName();
  try { localStorage.setItem('wandermere_avatar', JSON.stringify(avatar)); } catch (e) {}
  try { localStorage.setItem('wandermere_identity', JSON.stringify(identity || { type: 'guest', value: avatar.name })); } catch (e) {}
  const ss = $('start-screen'); if (ss) ss.classList.add('hidden');
  startGame({ mode, avatar, name: avatar.name, identity: identity || { type: 'guest', value: avatar.name }, room });
}

// the player's multiplayer identity — their chosen avatar name
function mpIdentity() {
  return { type: 'guest', value: currentName(), label: currentName() };
}
// short, friendly, unambiguous room code (no 0/O/1/I)
function randCode(n = 4) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = '';
  for (let i = 0; i < n; i++) s += A[(Math.random() * A.length) | 0];
  return s;
}
function cleanCode(s) { return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); }

function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

export function initStart() {
  // if there's no start screen markup (shouldn't happen), just launch offline
  if (!$('start-screen')) { startGame({ mode: 'offline', avatar }); return; }

  $('avatar-name').value = avatar.name || '';
  buildSwatches('sw-skin', SKINS, 'skin');
  buildSwatches('sw-hair', HAIRS, 'hair');
  buildSwatches('sw-shirt', SHIRTS, 'shirt');
  buildSwatches('sw-pants', PANTSC, 'pants');
  drawAvatar();

  $('play-offline').onclick = () => launch('offline', { type: 'guest', value: currentName() });
  // Multiplayer → open the lobby (create a private room or join a friend's code)
  $('play-mp').onclick = () => { $('lobby-box').classList.remove('hidden'); $('login-box').classList.add('hidden'); setMsg('Create a private room, or join a friend with their code.'); };

  // create a private room with a fresh code
  if ($('create-room')) $('create-room').onclick = () => launch('multiplayer', mpIdentity(), randCode());
  // join a friend's room by code
  const joinByCode = () => {
    const code = cleanCode($('join-code').value);
    if (code.length < 3) { setMsg('Enter your friend’s room code (e.g. K7Q2).', '#ff8787'); return; }
    launch('multiplayer', mpIdentity(), code);
  };
  if ($('join-room')) $('join-room').onclick = joinByCode;
  if ($('join-code')) {
    $('join-code').addEventListener('input', (e) => { e.target.value = cleanCode(e.target.value); });
    $('join-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinByCode(); });
  }
  // optional open/public world (see anyone online) — kept for the curious
  if ($('join-public')) $('join-public').onclick = () => launch('multiplayer', mpIdentity(), 'PUBLIC');

  // legacy email login box (still wired if shown) → joins a private room
  $('login-email-btn').onclick = () => {
    const em = ($('login-email').value || '').trim();
    if (!validEmail(em)) { setMsg('Enter a valid email to continue.', '#ff8787'); return; }
    launch('multiplayer', { type: 'email', value: em, label: em.split('@')[0] }, randCode());
  };
  $('login-email').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('login-email-btn').click(); });

  // live "playing now" counter (polls the presence server every ~10s)
  const updateOnline = async () => {
    const el = $('online-count'); if (!el) return;
    const n = await onlineCount();
    if (n < 0) el.innerHTML = '<span class="oc-dot off"></span> server offline';
    else el.innerHTML = `<span class="oc-dot"></span> <b>${n}</b> ${n === 1 ? 'player' : 'players'} online now`;
  };
  updateOnline();
  setInterval(updateOnline, 10000);
}
