// ============================================================
// UI: HUD bars, hotbar, toasts, target nameplate and overlay
// panels (inventory, crafting, dex, party, shop, how-to-play,
// starter select). All icons are hand-drawn (SVG / colour chips)
// — no emoji. DOM lives in index.html + here.
// ============================================================

import { ITEMS, RECIPES, SPECIES, SHOP_OFFERS, SELL_PRICES, GOLD_SHOP, ACHIEVEMENTS, BUFFS, TYPE_COLORS, spriteUrl, UPGRADES, ASCENSION } from './data.js?v=51';
import { SFX } from './sfx.js?v=51';

const $ = (id) => document.getElementById(id);
const PANELS = ['inventory', 'dex', 'party', 'craft', 'shop', 'ach', 'upgrades', 'daily'];  // howto is a non-blocking sidebar

const hex = (n) => '#' + (n || 0).toString(16).padStart(6, '0');
const typeChip = (t) => `<span class="tchip" title="${t}" style="background:${hex(TYPE_COLORS[t])}"></span>`;
// hand-drawn sun / crescent-moon (inline SVG, not emoji)
const SUN = `<svg class="ico" viewBox="0 0 16 16"><g stroke="#ffd24a" stroke-width="1.4"><line x1="8" y1="1" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="1" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="15" y2="8"/><line x1="3" y1="3" x2="4.5" y2="4.5"/><line x1="11.5" y1="11.5" x2="13" y2="13"/><line x1="13" y1="3" x2="11.5" y2="4.5"/><line x1="4.5" y1="11.5" x2="3" y2="13"/></g><circle cx="8" cy="8" r="3.4" fill="#ffd24a"/></svg>`;
const MOON = `<svg class="ico" viewBox="0 0 16 16"><path d="M11 2a6 6 0 1 0 3 11 5 5 0 0 1-3-11z" fill="#cdd9e8"/></svg>`;
const STAR = '<span class="star">✦</span>'; // four-point star marker for shinies

// hand-drawn pixel item icons → cached data URLs (so items show a "model", not text)
const _iconCache = {};
const BALL_ASSET = { ball: 'assets/itm_ball.png?v=51', greatball: 'assets/itm_greatball.png?v=51', ultraball: 'assets/itm_ultraball.png?v=51' };
function itemIcon(item) {
  if (BALL_ASSET[item]) return BALL_ASSET[item];
  if (_iconCache[item]) return _iconCache[item];
  const cv = document.createElement('canvas'); cv.width = 24; cv.height = 24;
  const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  const R = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  const disc = (c, cx, cy, r) => { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
  const ring = (c, cx, cy, r, lw) => { x.strokeStyle = c; x.lineWidth = lw; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke(); };
  const poly = (c, pts) => { x.fillStyle = c; x.beginPath(); x.moveTo(pts[0], pts[1]); for (let p = 2; p < pts.length; p += 2) x.lineTo(pts[p], pts[p + 1]); x.closePath(); x.fill(); };
  switch (item) {
    case 'berry': // glossy red berry with a leaf
      R('#3f6e2a', 12, 1, 2, 4); poly('#5aa83e', [13, 3, 18, 0, 16, 5]);     // stem + leaf
      disc('#7a2236', 12, 15, 8);                                            // outline
      disc('#e34f63', 12, 15, 6.6); disc('#c93a52', 14, 17, 4);              // body + shade
      disc('#ff8a98', 9.5, 12, 2.4); disc('#ffe2e6', 9, 11, 1.1);           // highlight + shine
      break;
    case 'wood': { // chopped log with end-grain rings
      R('#2e1d10', 4, 7, 17, 12); R('#7a552e', 5, 8, 15, 10); R('#674527', 5, 14, 15, 4); // body + lower shade
      R('#5a3e22', 13, 8, 1, 10); R('#5a3e22', 16, 8, 1, 10);                // bark grooves
      disc('#3a2614', 8, 13, 4.4); disc('#b07c3e', 8, 13, 3.4); ring('#7a542a', 8, 13, 2, 1); disc('#c8966a', 8, 13, 0.8); // rings
      break;
    }
    case 'stone': // faceted ore boulder
      poly('#39362f', [6, 8, 12, 4, 20, 10, 18, 19, 8, 19, 3, 12]);          // outline
      poly('#938d82', [7, 9, 12, 5.5, 18.5, 11, 16.5, 17.5, 9, 17.5, 5, 12]); // body
      poly('#b0a99c', [12, 5.5, 18.5, 11, 13, 11]);                          // light facet
      poly('#6f695f', [9, 17.5, 16.5, 17.5, 13, 11]);                        // shadow facet
      R('#6f695f', 9, 12, 2, 2); R('#b0a99c', 14, 13, 1.5, 1.5);             // speckles
      break;
    case 'fiber': // bundle of plant fibres tied in the middle
      x.lineCap = 'round'; x.lineWidth = 2;
      x.strokeStyle = '#3f7a2e'; [[6, 3, 8, 21], [18, 3, 16, 21]].forEach(([a, b, c, d]) => { x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo(12, 12, c, d); x.stroke(); });
      x.strokeStyle = '#5fae44'; [[10, 3, 11, 21], [14, 3, 13, 21]].forEach(([a, b, c, d]) => { x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo(12, 12, c, d); x.stroke(); });
      R('#3a2614', 7, 10, 10, 5); R('#6b4a2a', 8, 11, 8, 3); R('#8a6038', 8, 11, 8, 1); // tie
      break;
    case 'axe': // woodcutter axe — bearded steel head top-left, diagonal handle
      x.lineCap = 'round';
      x.strokeStyle = '#241a10'; x.lineWidth = 5; x.beginPath(); x.moveTo(11, 9); x.lineTo(21, 22); x.stroke();   // handle outline
      x.strokeStyle = '#7a4a26'; x.lineWidth = 3; x.beginPath(); x.moveTo(11, 9); x.lineTo(20, 21); x.stroke();   // wood
      x.strokeStyle = '#9a6a38'; x.lineWidth = 1; x.beginPath(); x.moveTo(11, 9); x.lineTo(20, 21); x.stroke();   // grain
      poly('#1f2226', [3, 3, 13, 4, 14, 14, 3, 12]);                         // head outline
      poly('#cfd4dc', [4, 4.5, 12, 5.5, 12.5, 12.5, 4.5, 11]);               // steel
      poly('#9aa1ad', [4.5, 11, 12.5, 12.5, 12, 9.5]);                       // bevel shade
      poly('#ffffff', [5, 5, 9, 5.5, 8, 8]);                                 // shine
      break;
    case 'pickaxe': // T-shaped pickaxe — vertical handle, double-curved head
      R('#241a10', 10, 8, 5, 15); R('#7a4a26', 11, 9, 3, 13); R('#9a6a38', 11, 9, 1, 13); // handle
      R('#1f2226', 9, 6, 7, 4); R('#aab0bb', 10, 7, 5, 2);                   // collar
      poly('#1f2226', [2, 12, 6, 6, 12, 8, 12, 11]);                         // left arm outline
      poly('#1f2226', [22, 12, 18, 6, 12, 8, 12, 11]);                       // right arm outline
      poly('#cfd4dc', [3.5, 11.2, 6.5, 7, 11, 8.6, 11, 10.6]);               // left steel
      poly('#cfd4dc', [20.5, 11.2, 17.5, 7, 13, 8.6, 13, 10.6]);             // right steel
      poly('#ffffff', [4.5, 10, 6.5, 7.6, 8, 8.4, 6, 9.6]);                  // shine
      break;
    case 'evostone': // 8-bit purple gem (from the water-stone design)
      poly('#15102e', [12, 1, 21, 9, 16, 23, 8, 23, 3, 9]);
      poly('#8a78ea', [12, 3, 19, 10, 15, 21, 9, 21, 5, 10]);
      poly('#5a46c8', [12, 3, 19, 10, 15, 21, 12, 12]);
      poly('#bcacff', [12, 3, 5, 10, 12, 12]);
      R('#ffffff', 9, 6, 4, 2); R('#dcd2ff', 8, 14, 2, 2); R('#dcd2ff', 13, 16, 2, 2);
      break;
    case 'iron': // grey ingot
      poly('#3a3d44', [3, 16, 7, 12, 21, 12, 17, 16]); R('#9aa1ad', 5, 12, 14, 5);
      R('#c2c8d2', 7, 12, 10, 2); R('#6f7782', 4, 15, 16, 2); break;
    case 'crystal': // cyan gem cluster
      poly('#0e2b33', [12, 1, 20, 11, 12, 23, 4, 11]);
      poly('#3fd2e6', [12, 3, 18, 11, 12, 21, 6, 11]); poly('#9af0fb', [12, 3, 6, 11, 12, 12]);
      R('#ffffff', 9, 6, 3, 2); break;
    case 'hide': // tan pelt
      disc('#7a4a26', 12, 13, 9); disc('#9a6a38', 12, 12, 7); disc('#c89a5a', 10, 9, 2.4);
      R('#5a3418', 6, 4, 3, 4); R('#5a3418', 15, 4, 3, 4); break;
    case 'herb': // green sprig
      x.lineCap = 'round'; x.strokeStyle = '#2f6e2a'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(12, 22); x.lineTo(12, 6); x.stroke();
      x.strokeStyle = '#5fae44'; [[12, 12, 5, 7], [12, 12, 19, 7], [12, 9, 6, 4], [12, 9, 18, 4]].forEach(([a, b, c2, d]) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.stroke(); });
      disc('#7fd05a', 12, 5, 2.4); break;
    case 'mushroom': // red-cap toadstool
      R('#efe6d2', 10, 12, 4, 9); disc('#d83a3a', 12, 11, 8); disc('#e85a5a', 12, 10, 6.5);
      disc('#ffffff', 9, 9, 1.5); disc('#ffffff', 15, 11, 1.4); disc('#ffffff', 12, 7, 1.3); break;
    case 'fish': // blue fish
      poly('#2a6e9a', [4, 12, 9, 7, 9, 17]); disc('#3a9ad8', 14, 12, 7); disc('#5ab8f0', 13, 10, 3);
      poly('#2a6e9a', [20, 8, 23, 12, 20, 16]); disc('#0e1f2e', 16, 11, 1.4); break;
    case 'pearl': // white pearl in shell
      poly('#d8a0b0', [2, 16, 12, 20, 22, 16, 12, 8]); disc('#ffffff', 12, 13, 5.5);
      disc('#eef2f8', 12, 13, 4); disc('#ffffff', 10, 11, 1.5); break;
    case 'gold': // stacked coins
      disc('#8a6a1a', 12, 17, 8); disc('#ffd24a', 12, 16, 7); disc('#e8b020', 12, 17, 5);
      disc('#ffe88a', 10, 14, 2); R('#8a6a1a', 5, 9, 14, 3); R('#ffd24a', 5, 8, 14, 2); break;
    case 'stew': // bowl of stew
      disc('#c8c2b6', 12, 15, 9); disc('#0e1812', 12, 14, 7); disc('#8a4a22', 12, 14, 6);
      disc('#b9683a', 10, 12, 1.6); disc('#5fae44', 14, 13, 1.4); R('#8a8276', 2, 16, 20, 2); break;
    case 'jerky': // strip of dried meat
      poly('#7c3a1a', [4, 8, 20, 6, 22, 14, 6, 18]); poly('#9c5a28', [6, 9, 18, 8, 20, 13, 8, 16]);
      R('#5a2a12', 9, 10, 1.5, 1.5); R('#5a2a12', 14, 9, 1.5, 1.5); break;
    case 'berrypie': // pie slice
      poly('#d8a85a', [3, 18, 21, 18, 12, 5]); poly('#e8c078', [5, 17, 19, 17, 12, 7]);
      disc('#c93a52', 12, 14, 2); disc('#c93a52', 9, 16, 1.6); disc('#c93a52', 15, 16, 1.6); break;
    case 'grilledfish': // fish on a skewer
      x.strokeStyle = '#8a6038'; x.lineWidth = 2; x.beginPath(); x.moveTo(3, 20); x.lineTo(21, 4); x.stroke();
      disc('#caa56a', 12, 12, 6); disc('#a8814a', 13, 13, 4); poly('#caa56a', [18, 8, 22, 11, 18, 14]);
      disc('#2a1810', 10, 10, 1.2); break;
    case 'potion': // small red flask
      R('#cfd4dc', 10, 3, 4, 4); poly('#9aa1ad', [8, 8, 16, 8, 18, 21, 6, 21]);
      poly('#e34f63', [8, 13, 16, 13, 17, 20, 7, 20]); disc('#ff8a98', 10, 16, 1.4); break;
    case 'superpotion': // tall blue flask
      R('#cfd4dc', 10, 2, 4, 4); poly('#9aa1ad', [7, 7, 17, 7, 19, 22, 5, 22]);
      poly('#3a9ad8', [7, 11, 17, 11, 18, 21, 6, 21]); poly('#5ab8f0', [8, 13, 12, 13, 11, 20, 8, 20]); break;
    case 'masterball': // purple master ball with M
      disc('#1a0e2a', 12, 12, 10); disc('#7a44c8', 12, 8, 9); disc('#e8e2ea', 12, 16, 9);
      R('#1a0e2a', 2, 11, 20, 2.4); disc('#1a0e2a', 12, 12, 3.2); disc('#e8e2ea', 12, 12, 1.6);
      x.fillStyle = '#e8b0ff'; R('#e8b0ff', 7, 4, 1.6, 4); R('#e8b0ff', 14.4, 4, 1.6, 4); R('#e8b0ff', 9, 4, 5, 1.6); break;
    case 'fishingrod': // rod + line
      x.lineCap = 'round'; x.strokeStyle = '#7a4a26'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(4, 21); x.lineTo(20, 4); x.stroke();
      x.strokeStyle = '#cfd4dc'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(20, 4); x.lineTo(20, 16); x.stroke();
      disc('#d83a3a', 20, 17, 1.8); break;
    case 'lantern': // glowing lantern
      R('#3a3d44', 9, 3, 6, 2); poly('#9aa1ad', [7, 6, 17, 6, 16, 20, 8, 20]);
      R('#ffd24a', 9, 9, 6, 8); disc('#fff0a0', 12, 13, 2.4); R('#3a3d44', 7, 19, 10, 2); break;
    default: R('#8a8', 6, 6, 12, 12);
  }
  _iconCache[item] = cv.toDataURL();
  return _iconCache[item];
}

export class UI {
  constructor(inv) {
    this.inv = inv;
    this.openPanel = null;
    this.hotbar = this._loadHotbar();   // 6 customisable quick-slots (null = empty)
    this.selected = 0;
    this.shopTab = 'barter';
    this.nearFire = false;
    this._buildHotbar();
    this._wireCloseButtons();
  }

  // turn each panel's "(key / Esc)" hint into a real tappable ✕ close button
  // (essential on mobile — there's no keyboard, and How-to-Play has no backdrop)
  _wireCloseButtons() {
    document.querySelectorAll('.panel .pclose').forEach((el) => {
      el.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
      el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); this.close(); }, { passive: false });
    });
  }

  // ---- customisable hotbar (assign items from the inventory panel) ----
  _loadHotbar() {
    const def = ['ball', 'greatball', 'ultraball', 'berry', 'potion', 'superpotion'];
    try {
      const a = JSON.parse(localStorage.getItem('gloamfang_hotbar') || 'null');
      if (Array.isArray(a)) { const h = a.slice(0, 6).map((k) => (k && ITEMS[k]) ? k : null); while (h.length < 6) h.push(null); return h; }
    } catch (e) {}
    return def;
  }
  _saveHotbar() { try { localStorage.setItem('gloamfang_hotbar', JSON.stringify(this.hotbar)); } catch (e) {} }
  toggleHotbar(item) {
    const i = this.hotbar.indexOf(item);
    if (i >= 0) { this.hotbar[i] = null; }                       // already on the bar → remove
    else {
      const e = this.hotbar.indexOf(null);
      if (e < 0) { this.toast('Hotbar full (6) — remove one first.', '#ff8787'); return; }
      this.hotbar[e] = item;
    }
    this._saveHotbar(); this._buildHotbar(); this.renderInventory();
  }

  toast(text, color = '#cdded3') {
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = text; el.style.color = color;
    $('toasts').appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2600);
  }

  updateStats(p) {
    $('hp-fill').style.width = (p.hp / p.maxHp * 100) + '%';
    $('hunger-fill').style.width = (p.hunger / p.maxHunger * 100) + '%';
    $('stam-fill').style.width = (p.stamina / p.maxStamina * 100) + '%';
  }
  updateClock(sky, day, biomeName, danger, rareBonus) {
    const w = { clear: '', rain: ' · Rain', snow: ' · Snow', storm: ' · Storm' }[sky.weather] || '';
    $('clock').innerHTML = `${sky.isNight() ? MOON : SUN} Day ${day}${w}`;
    if (biomeName) {
      const dz = (danger || 0);
      const col = dz >= 14 ? '#ff6a6a' : dz >= 8 ? '#ffb35a' : dz >= 3 ? '#ffd24a' : '#9ab2a2';
      // the danger tier told you the cost of being out here; this tells you the payoff
      const rb = rareBonus || 1;
      const rare = rb >= 1.1 ? ` <span class="rarebonus" title="Rare and legendary spawn odds out here">✦ ${rb.toFixed(1)}×</span>` : '';
      $('biome').innerHTML = `· ${biomeName} <span class="danger" style="color:${col}">⚔ ${dz}</span>${rare}`;
    }
  }

  updateResources() {
    const show = ['wood', 'stone', 'fiber'];
    $('resources').innerHTML = show.map((k) => `<span>${ITEMS[k].name} <b>${this.inv.count(k)}</b></span>`).join('')
      + `<span class="gold">Gold <b>${this.inv.gold}</b></span>`
      + (this.inv.has('axe') ? '<span class="tool">Axe</span>' : '') + (this.inv.has('pickaxe') ? '<span class="tool">Pick</span>' : '')
      + (this.inv.has('fishingrod') ? '<span class="tool">Rod</span>' : '') + (this.inv.has('lantern') ? '<span class="tool">Lantern</span>' : '');
  }

  // player level chip + xp bar (top-left, under the survival bars)
  updatePlayer() {
    const el = $('plevel'); if (!el) return;
    el.innerHTML = `<span class="plv">Lv ${this.inv.plevel}</span><div class="ptrack"><div class="pfill" style="width:${(this.inv.playerXpFrac() * 100) | 0}%"></div></div>`;
  }

  // active food buffs with countdown rings
  updateBuffs(buffs) {
    const el = $('buffs'); if (!el) return;
    el.innerHTML = (buffs || []).map((b) => {
      const def = BUFFS[b.key]; if (!def) return '';
      return `<div class="buff" style="border-color:${def.color}" title="${def.name}"><span style="color:${def.color}">${def.name}</span><b>${Math.ceil(b.remain)}s</b></div>`;
    }).join('');
  }

  setQuest(num, total, title, cur, max) {
    $('qnum').textContent = `${num}/${total}`;
    $('qtitle').textContent = `${title} ${cur}/${max}`;
    $('qfill').style.width = Math.min(100, cur / max * 100) + '%';
  }

  chat(text, cls = '') {
    const log = $('chatlog');
    const el = document.createElement('div');
    el.className = 'chatline ' + cls; el.textContent = text;
    log.appendChild(el);
    while (log.children.length > 7) log.removeChild(log.firstChild);
  }

  updatePartyDock() {
    const list = $('dock-list');
    if (!this.inv.party.length) { list.innerHTML = '<div class="dockempty">Choose or catch a creature.</div>'; return; }
    const active = this.inv.outMembers();
    if (!active.length) { list.innerHTML = '<div class="dockempty">No creatures out — send some out (T or P).</div>'; return; }
    list.innerHTML = active.map((m, i) => {
      const sp = SPECIES[m.key];
      const xpPct = i === 0 ? Math.min(100, (m.xp || 0) / this.inv.xpNeeded(m.level) * 100) : 0;
      return `<div class="dockrow"><img src="${spriteUrl(sp.dex, m.shiny)}" alt="">
        <div class="dinfo"><div class="dname">${sp.name}${(m.shiny || m.gloam) ? STAR : ''} <span class="dlv">Lv${m.level}</span> ${sp.types.map(typeChip).join('')}</div>
        <div class="dtrack hp"><div class="dfill" style="width:${(m.hp / m.maxHp * 100) | 0}%"></div></div>
        ${i === 0 ? `<div class="dtrack xp"><div class="dfill xp" style="width:${xpPct}%"></div></div>` : ''}</div></div>`;
    }).join('');
  }

  setTarget(c) {
    const el = $('target');
    if (!c) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const pct = Math.round(c.hpFrac() * 100);
    const catchable = c.hpFrac() < 0.55;
    const ivPct = Math.round((c.iv == null ? 0.5 : c.iv) * 100);
    const tag = c.boss ? ' <span class="bosstag">BOSS</span>' : c.gloam ? ' <span class="gloamtag">GLOAMTOUCHED</span>' : c.alpha ? ' <span class="alphatag">ALPHA</span>' : '';
    const name = c.boss ? (c.displayName || c.sp.name) : c.sp.name;
    el.innerHTML = `<b>${name}${c.gloam ? STAR : c.shiny ? STAR : ''}</b> <span class="lv">Lv ${c.level}</span>${tag}
      <span class="types">${c.sp.types.map((t) => typeChip(t) + ' ' + t).join('  ')} · ${ivPct}% power</span>
      <div class="tbar"><div class="tfill" style="width:${pct}%"></div></div>
      <div class="thint">${c.boss ? 'Slay the Gloamfang for a fortune!' : catchable ? 'F / right-click — throw a ball' : 'Space / click — weaken it'}</div>`;
  }

  // ---- hotbar ----
  _buildHotbar() {
    const bar = $('hotbar'); bar.innerHTML = '';
    this.hotbar.forEach((item, i) => {
      const cell = document.createElement('div');
      cell.className = 'slot' + (i === this.selected ? ' sel' : '') + (item ? '' : ' empty');
      cell.title = item ? ITEMS[item].name : 'Empty slot — assign an item from your inventory (Tab)';
      cell.innerHTML = item
        ? `<span class="snum">${i + 1}</span><img class="iicon" src="${itemIcon(item)}" alt=""><b class="scount" id="hb${i}"></b>`
        : `<span class="snum">${i + 1}</span>`;
      cell.onclick = () => { this.selected = i; this._buildHotbar(); };
      bar.appendChild(cell);
    });
    this.refreshHotbar();
  }
  refreshHotbar() { this.hotbar.forEach((item, i) => { const e = $('hb' + i); if (e) e.textContent = item ? this.inv.count(item) : ''; }); }
  selectSlot(i) { if (i >= 0 && i < this.hotbar.length) { this.selected = i; this._buildHotbar(); } }
  selectedItem() { return this.hotbar[this.selected]; }

  // ---- panels ----
  toggle(name) {
    if (this.openPanel === name) return this.close();
    this.openPanel = name;
    PANELS.forEach((n) => $(n + '-panel').classList.toggle('hidden', n !== name));
    $('overlay').classList.remove('hidden');
    const fn = 'render' + name.charAt(0).toUpperCase() + name.slice(1);
    if (this[fn]) this[fn]();
  }
  close() {
    this.openPanel = null;
    PANELS.forEach((n) => $(n + '-panel').classList.add('hidden'));
    $('starter-panel').classList.add('hidden');
    $('howto-panel').classList.add('hidden');
    $('overlay').classList.add('hidden');
  }

  // how-to-play lives as a right-side sidebar — no overlay, doesn't pause play
  toggleHowto() { $('howto-panel').classList.toggle('hidden'); }
  openHowto() { $('howto-panel').classList.remove('hidden'); }

  renderInventory() {
    const grid = $('inv-grid'); grid.innerHTML = '';
    for (const [key, def] of Object.entries(ITEMS)) {
      const n = this.inv.count(key);
      const onBar = this.hotbar.includes(key);
      const cell = document.createElement('div');
      cell.className = 'icell' + (n ? '' : ' empty') + (onBar ? ' onbar' : '');
      cell.title = def.name + (onBar ? ' — on hotbar (click to remove)' : ' — click to add to hotbar');
      cell.innerHTML = `<img class="iicon" src="${itemIcon(key)}" alt=""><b>${n}</b>${onBar ? '<span class="barbadge">★</span>' : ''}`;
      cell.onclick = () => this.toggleHotbar(key);
      grid.appendChild(cell);
    }
  }
  renderCraft() {
    const list = $('craft-list'); list.innerHTML = '';
    const caught = this.inv.dexCaught.size;
    const fire = this.nearFire;
    list.innerHTML = `<div class="cookhint">${fire ? '🔥 Campfire nearby — cooking available.' : 'Build & stand by a Campfire to cook meals.'}</div>`;
    for (const r of RECIPES) {
      const locked = r.unlock && caught < r.unlock;
      const owned = r.unique && this.inv.has(r.out);
      const needsFire = r.cook && !fire;
      const can = !owned && !locked && !needsFire && this.inv.canCraft(r);
      const cost = locked ? `Locked — register ${r.unlock} species`
        : needsFire ? 'Needs a campfire'
        : Object.entries(r.cost).map(([k, v]) => `${v} ${ITEMS[k].name}`).join(', ');
      const row = document.createElement('button');
      row.className = 'craftrow' + (can ? '' : ' cant') + (r.cook ? ' cook' : '');
      row.innerHTML = `<span class="cget"><img class="ricon" src="${itemIcon(r.out)}" alt=""> ${r.qty}× ${ITEMS[r.out].name}${owned ? ' (owned)' : ''}${r.cook ? ' <em>cook</em>' : ''}</span><span class="ccost">${cost}</span>`;
      row.onclick = () => {
        if (locked) { this.toast(`Locked — register ${r.unlock} species.`, '#ff8787'); return; }
        if (needsFire) { this.toast('You need a campfire to cook.', '#ff8787'); return; }
        if (!owned && this.inv.craft(r)) { this.toast('Crafted ' + ITEMS[r.out].name, '#b8f25f'); this.onCraft && this.onCraft(r); this.renderCraft(); this.refreshHotbar(); this.updateResources(); }
      };
      list.appendChild(row);
    }
  }
  renderShop() {
    const list = $('shop-list'); list.innerHTML = '';
    const tabs = document.createElement('div'); tabs.className = 'shoptabs';
    [['barter', 'Barter'], ['buy', 'Buy · Gold'], ['sell', 'Sell']].forEach(([id, label]) => {
      const b = document.createElement('button'); b.className = 'shoptab' + (this.shopTab === id ? ' on' : ''); b.textContent = label;
      b.onclick = () => { this.shopTab = id; this.renderShop(); };
      tabs.appendChild(b);
    });
    list.appendChild(tabs);
    const gl = document.createElement('div'); gl.className = 'shopgold'; gl.innerHTML = `<img class="iicon" src="${itemIcon('gold')}"> Your gold: <b>${this.inv.gold}</b>`;
    list.appendChild(gl);
    const body = document.createElement('div'); body.className = 'shopbody'; list.appendChild(body);
    if (this.shopTab === 'buy') this._renderBuy(body);
    else if (this.shopTab === 'sell') this._renderSell(body);
    else this._renderBarter(body);
  }
  _renderBarter(body) {
    for (const o of SHOP_OFFERS) {
      const can = Object.entries(o.give).every(([k, v]) => this.inv.has(k, v));
      const give = Object.entries(o.give).map(([k, v]) => `${v} ${ITEMS[k].name}`).join(' + ');
      const row = document.createElement('button');
      row.className = 'craftrow' + (can ? '' : ' cant');
      row.innerHTML = `<span class="cget"><img class="ricon" src="${itemIcon(o.get)}"> ${o.qty}× ${ITEMS[o.get].name}</span><span class="ccost">${give}</span>`;
      row.onclick = () => {
        if (!Object.entries(o.give).every(([k, v]) => this.inv.has(k, v))) return;
        for (const [k, v] of Object.entries(o.give)) this.inv.remove(k, v);
        this.inv.add(o.get, o.qty);
        this.toast(`Bought ${o.qty}× ${ITEMS[o.get].name}`, '#b8f25f');
        this.onCraft && this.onCraft({ out: o.get, qty: o.qty });
        this.renderShop(); this.refreshHotbar(); this.updateResources();
      };
      body.appendChild(row);
    }
  }
  _renderBuy(body) {
    for (const o of GOLD_SHOP) {
      const can = this.inv.gold >= o.price;
      const row = document.createElement('button');
      row.className = 'craftrow' + (can ? '' : ' cant');
      row.innerHTML = `<span class="cget"><img class="ricon" src="${itemIcon(o.get)}"> ${o.qty}× ${ITEMS[o.get].name}</span><span class="ccost">${o.price} Gold</span>`;
      row.onclick = () => {
        if (!this.inv.spendGold(o.price)) { this.toast('Not enough gold.', '#ff8787'); return; }
        this.inv.add(o.get, o.qty);
        this.toast(`Bought ${o.qty}× ${ITEMS[o.get].name}`, '#b8f25f');
        this.onCraft && this.onCraft({ out: o.get, qty: o.qty });
        this.renderShop(); this.refreshHotbar(); this.updateResources();
      };
      body.appendChild(row);
    }
  }
  _renderSell(body) {
    const sellable = Object.keys(SELL_PRICES).filter((k) => this.inv.has(k, 1));
    if (!sellable.length) { body.innerHTML = '<div class="muted">Nothing to sell — gather resources first.</div>'; return; }
    for (const k of sellable) {
      const price = SELL_PRICES[k], have = this.inv.count(k);
      const row = document.createElement('div');
      row.className = 'sellrow';
      row.innerHTML = `<span class="cget"><img class="ricon" src="${itemIcon(k)}"> ${ITEMS[k].name} <span class="have">×${have}</span></span>
        <span class="sellbtns"><button class="pbtn s1">Sell 1 · ${price}g</button><button class="pbtn sall">All · ${price * have}g</button></span>`;
      const sell = (n) => { if (!this.inv.has(k, n)) return; this.inv.remove(k, n); this.inv.addGold(price * n); this.toast(`Sold ${n} ${ITEMS[k].name} for ${price * n}g`, '#ffd24a'); this.renderShop(); this.updateResources(); };
      row.querySelector('.s1').onclick = () => sell(1);
      row.querySelector('.sall').onclick = () => sell(have);
      body.appendChild(row);
    }
  }
  renderParty() {
    const grid = $('party-grid'); grid.innerHTML = '';
    if (!this.inv.party.length) { grid.innerHTML = '<div class="muted">No creatures yet — weaken one and throw a ball.</div>'; return; }
    const leadIdx = this.inv.leadIndex();
    this.inv.party.forEach((m, i) => {
      const sp = SPECIES[m.key];
      const tgt = this.inv.evoTarget(i), evoReq = this.inv.evoReq(i);
      const lvlOk = m.level >= evoReq, hasStone = this.inv.has('evostone');
      const isLead = i === leadIdx;
      const cell = document.createElement('div');
      cell.className = 'pcard' + (isLead ? ' lead' : '') + (m.out ? ' out' : ' benched');
      cell.innerHTML = `${isLead ? '<div class="leadtag">LEAD</div>' : (m.out ? '<div class="outtag">OUT</div>' : '')}
        <img src="${spriteUrl(sp.dex, m.shiny)}" alt="">
        <div class="pname">${sp.name}${(m.shiny || m.gloam) ? STAR : ''}</div>
        <div class="plv">Lv ${m.level} ${sp.types.map(typeChip).join('')}</div>
        <div class="ppow">${Math.round((m.iv == null ? 0.5 : m.iv) * 100)}% power${m.gloam ? ' · <span style="color:#c9a0ff">gloam</span>' : ''}</div>
        <div class="pbtns">
          <button class="pbtn send">${m.out ? 'Recall' : 'Send Out'}</button>
          ${(m.out && !isLead) ? '<button class="pbtn mklead">Lead</button>' : ''}
          ${tgt ? `<button class="pbtn evo${(lvlOk && hasStone) ? '' : ' off'}">${lvlOk ? 'Evolve' : 'Evolve · Lv ' + evoReq}</button>` : ''}
          <button class="pbtn rel">Release</button>
        </div>`;
      cell.querySelector('.send').onclick = (e) => { e.stopPropagation(); const r = this.inv.toggleOut(i); if (r === 'full') this.toast('Only 3 creatures can be out at once.', '#ff8787'); this._afterTeam(); };
      const ld = cell.querySelector('.mklead'); if (ld) ld.onclick = (e) => { e.stopPropagation(); this.inv.setLead(i); this._afterTeam(); };
      cell.querySelector('.rel').onclick = (e) => { e.stopPropagation(); this.inv.release(i); this._afterTeam(); };
      const ev = cell.querySelector('.evo'); if (ev) ev.onclick = (e) => {
        e.stopPropagation();
        if (!lvlOk) { this.toast(`Reach Lv ${evoReq} to evolve.`, '#ff8787'); return; }
        const r = this.inv.evolve(i);
        if (r) { this.toast(`${SPECIES[r.from].name} evolved into ${SPECIES[r.to].name}!`, '#b8f25f'); this.onEvolve && this.onEvolve(r); this._afterTeam(); }
        else this.toast('You need an Evolve Stone.', '#ff8787');
      };
      grid.appendChild(cell);
    });
  }
  _afterTeam() { this.renderParty(); if (this.openPanel === 'dex') this.renderDex(); this.updatePartyDock(); this.onTeamChange && this.onTeamChange(); }
  renderDex() {
    const grid = $('dex-grid'); grid.innerHTML = '';
    const all = Object.entries(SPECIES).sort((a, b) => a[1].dex - b[1].dex);
    $('dex-count').textContent = `${this.inv.dexCaught.size} / ${all.length} caught`;
    for (const [key, sp] of all) {
      const caught = this.inv.dexCaught.has(key), seen = this.inv.dexSeen.has(key);
      const owns = this.inv.ownsSpecies(key), out = this.inv.isSpeciesOut(key);
      const cell = document.createElement('div');
      cell.className = 'dcell' + (caught ? ' caught' : seen ? ' seen' : ' unseen') + (out ? ' active' : '');
      cell.innerHTML = (caught || seen
        ? `<img src="${spriteUrl(sp.dex, false)}" style="${caught ? '' : 'filter:brightness(0)'}" alt=""><span>${caught ? sp.name : '???'}</span>`
        : `<div class="dq">#${String(sp.dex).padStart(3, '0')}</div><span>???</span>`)
        + (owns ? `<button class="dbtn${out ? ' on' : ''}">${out ? 'Recall' : 'Send Out'}</button>` : '');
      if (owns) cell.querySelector('.dbtn').onclick = (e) => {
        e.stopPropagation();
        const r = this.inv.toggleOutBySpecies(key);
        if (r === 'full') this.toast('Only 3 creatures can be out at once.', '#ff8787');
        this._afterTeam();
      };
      grid.appendChild(cell);
    }
  }
  renderAch() {
    const grid = $('ach-grid'); if (!grid) return; grid.innerHTML = '';
    const cur = (stat) => stat === 'species' ? this.inv.dexCaught.size : stat === 'plevel' ? this.inv.plevel : stat === 'goldEarned' ? this.inv.goldEarned : (this.inv.ach[stat] || 0);
    const got = ACHIEVEMENTS.filter((a) => this.inv.achieved.has(a.id)).length;
    const cc = $('ach-count'); if (cc) cc.textContent = `${got} / ${ACHIEVEMENTS.length}`;
    for (const a of ACHIEVEMENTS) {
      const done = this.inv.achieved.has(a.id);
      const c = Math.min(cur(a.stat), a.need);
      const reward = a.reward ? Object.entries(a.reward).map(([k, v]) => `${v} ${k === 'gold' ? 'Gold' : ITEMS[k].name}`).join(', ') : '—';
      const cell = document.createElement('div');
      cell.className = 'acell' + (done ? ' done' : '');
      cell.innerHTML = `<div class="aname">${done ? '★' : '☆'} ${a.name}</div><div class="adesc">${a.desc}</div>
        <div class="atrack"><div class="afill" style="width:${Math.min(100, c / a.need * 100)}%"></div></div>
        <div class="ameta">${c}/${a.need} · reward ${reward}</div>`;
      grid.appendChild(cell);
    }
  }
  renderHowto() { /* static content lives in index.html */ }

  // ---- live HUD meters (boss bar, catch combo, egg incubator) ----
  updateBoss(boss) {
    const el = $('boss-bar'); if (!el) return;
    if (!boss) { if (!el.classList.contains('hidden')) { el.classList.add('hidden'); this._bossShown = null; } return; }
    if (this._bossShown !== boss) {
      this._bossShown = boss; el.classList.remove('hidden');
      el.innerHTML = `<div class="boss-name">⚔ ${boss.displayName || 'Gloamfang'} <span>Lv ${boss.level}</span></div><div class="boss-track"><div class="boss-fill"></div></div>`;
    }
    const f = el.querySelector('.boss-fill'); if (f) f.style.width = Math.max(0, Math.round(boss.hpFrac() * 100)) + '%';
  }
  updateCombo(combo) {
    const el = $('combo-meter'); if (!el) return;
    if (!combo || combo.count < 2) { if (!el.classList.contains('hidden')) el.classList.add('hidden'); this._comboShown = null; return; }
    el.classList.remove('hidden');
    const sig = combo.key + ':' + combo.count;
    if (this._comboShown !== sig) {
      this._comboShown = sig; const sp = SPECIES[combo.key];
      el.innerHTML = `<div class="combo-n">CHAIN ×${combo.count}</div><div class="combo-name">${sp ? sp.name : ''}</div><div class="combo-track"><div class="combo-fill"></div></div>`;
    }
    const f = el.querySelector('.combo-fill'); if (f) f.style.width = Math.max(0, Math.min(1, combo.t / 28)) * 100 + '%';
  }
  updateEgg(frac) {
    const f = $('egg-fill'); if (!f) return;
    f.style.width = Math.round(Math.min(1, frac) * 100) + '%';
    const box = $('egg'); if (box) box.classList.toggle('ready', frac >= 0.999);
  }

  // ---- upgrades panel (gold sink + ascension) ----
  renderUpgrades() {
    const m = this.meta, wrap = $('upgrades-list'); if (!m || !wrap) return;
    wrap.innerHTML = '';
    const gl = document.createElement('div'); gl.className = 'shopgold';
    gl.innerHTML = `<img class="iicon" src="${itemIcon('gold')}"> Gold: <b>${this.inv.gold}</b> &nbsp;·&nbsp; Gloam tier <b style="color:#c9a0ff">${m.ascension}</b>`;
    wrap.appendChild(gl);
    for (const u of UPGRADES) {
      const lvl = m.upLevel(u.id), maxed = m.isMaxed(u.id), cost = m.upCost(u.id);
      const can = !maxed && this.inv.gold >= cost;
      const row = document.createElement('button');
      row.className = 'craftrow upgr' + (can ? '' : ' cant');
      row.innerHTML = `<span class="cget"><img class="ricon" src="${itemIcon(u.icon)}"> <span class="uinfo"><b>${u.name}</b> <span class="ulv">Lv ${lvl}/${u.max}${maxed ? ' MAX' : ''}</span><br><span class="udesc">${u.desc}</span></span></span><span class="ccost">${maxed ? '— MAX —' : cost + 'g'}</span>`;
      row.onclick = () => {
        if (maxed) return;
        if (this.meta.buyUpgrade(u.id, this.inv)) { this.toast(`${u.name} → Lv ${this.meta.upLevel(u.id)}`, '#b8f25f'); this.onUpgrade && this.onUpgrade(u.id); this.renderUpgrades(); this.updateResources(); }
        else this.toast('Not enough gold.', '#ff8787');
      };
      wrap.appendChild(row);
    }
    const asc = document.createElement('div'); asc.className = 'ascbox';
    const cost = m.ascensionCost(), eligible = m.canAscend(this.inv.dexCaught.size), canAsc = eligible && this.inv.gold >= cost;
    asc.innerHTML = `<div class="asctitle">✦ ASCENSION — Gloam tier ${m.ascension}</div>
      <div class="ascdesc">Permanently +${Math.round(ASCENSION.xpPer * 100)}% XP, +${Math.round(ASCENSION.goldPer * 100)}% gold, +${Math.round(ASCENSION.shinyPer * 100)}% shiny odds and rarer spawns — stacking every tier. Keeps your dex, team and upgrades.</div>
      <button class="wbtn ascbtn${canAsc ? '' : ' off'}">${eligible ? 'Ascend · ' + cost + ' Gold' : 'Register ' + ASCENSION.reqSpecies + ' species to unlock'}</button>`;
    asc.querySelector('.ascbtn').onclick = () => {
      if (!eligible) { this.toast(`Register ${ASCENSION.reqSpecies} species first.`, '#ff8787'); return; }
      if (this.meta.ascend(this.inv)) { this.onAscend && this.onAscend(); this.renderUpgrades(); this.updateResources(); }
      else this.toast('Not enough gold to Ascend.', '#ff8787');
    };
    wrap.appendChild(asc);
  }

  // ---- daily quests + streak panel ----
  renderDaily() {
    const m = this.meta, wrap = $('daily-list'); if (!m || !wrap) return;
    wrap.innerHTML = '';
    const st = document.createElement('div'); st.className = 'dailystreak';
    st.innerHTML = `<span>Login streak <b>${m.streak}</b> day${m.streak === 1 ? '' : 's'}</span><span>Best chain <b>${m.bestCombo}</b> · Eggs <b>${m.eggsHatched}</b></span>`;
    wrap.appendChild(st);
    for (const q of m.dailies) {
      const row = document.createElement('div'); row.className = 'dailyrow' + (q.done ? ' done' : '');
      row.innerHTML = `<div class="dqhead">${q.done ? '★' : '☆'} ${q.label}</div>
        <div class="atrack"><div class="afill" style="width:${Math.min(100, q.prog / q.need * 100)}%"></div></div>
        <div class="ameta">${Math.floor(Math.min(q.prog, q.need))}/${q.need} · reward ${q.gold} Gold</div>`;
      wrap.appendChild(row);
    }
    if (m.dailiesDone()) { const d = document.createElement('div'); d.className = 'cookhint'; d.textContent = 'All daily quests done — come back tomorrow for a fresh set & a bigger streak reward!'; wrap.appendChild(d); }
  }

  // ---- welcome-back modals (streak reward, idle production) ----
  _showModal(title, sub, reward, color, onClose) {
    const el = $('meta-modal'); if (!el) { if (onClose) onClose(); return; }
    el.innerHTML = `<div class="mm-card"><div class="mm-title" style="color:${color}">${title}</div>
      <div class="mm-sub">${sub}</div><div class="mm-reward">${reward || '—'}</div>
      <button class="wbtn mm-ok">Collect</button></div>`;
    el.classList.remove('hidden');
    el.querySelector('.mm-ok').onclick = () => { el.classList.add('hidden'); el.innerHTML = ''; if (onClose) onClose(); };
    if (SFX && SFX.daily) SFX.daily();
  }
  showStreak(streak, thenOffline) {
    if (!streak) { if (thenOffline) this.showOffline(thenOffline); return; }
    const rew = Object.entries(streak.reward).map(([k, v]) => `${v} ${k === 'gold' ? 'Gold' : (ITEMS[k] ? ITEMS[k].name : k)}`).join(', ');
    this._showModal(`Day ${streak.day} Login Streak!`, 'Welcome back, wanderer — your reward:', rew, '#ffd24a', () => { if (thenOffline) this.showOffline(thenOffline); });
  }
  showOffline(report) {
    if (!report) return;
    const items = Object.entries(report.items).map(([k, v]) => `${v} ${ITEMS[k] ? ITEMS[k].name : k}`).join(', ');
    const hrs = report.hours >= 1 ? report.hours.toFixed(1) + ' h' : Math.max(1, Math.round(report.hours * 60)) + ' min';
    this._showModal('While you were away', `Your base kept working for ${hrs} and produced:`, items, '#b8f25f', null);
  }

  // ---- first-time starter selection ----
  showStarterSelect(cb) {
    this.openPanel = 'starter';
    $('overlay').classList.remove('hidden');
    const panel = $('starter-panel'); panel.classList.remove('hidden');
    const grid = $('starter-grid'); grid.innerHTML = '';
    for (const key of ['charmander', 'bulbasaur', 'squirtle']) {
      const sp = SPECIES[key];
      const card = document.createElement('button');
      card.className = 'starter-card';
      card.innerHTML = `<img src="${spriteUrl(sp.dex, false)}" alt=""><div class="sname">${sp.name}</div><div class="stypes">${sp.types.map((t) => typeChip(t) + ' ' + t).join(' ')}</div>`;
      card.onclick = () => { this.close(); cb(key); };
      grid.appendChild(card);
    }
  }
}
