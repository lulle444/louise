// ============================================================
// META — long-horizon progression & retention layer.
// Owns its own localStorage slot so it can't corrupt the core
// save. Holds: gold-bought permanent UPGRADES, repeatable
// ASCENSION (prestige), daily login STREAK, rotating DAILY quests,
// step-hatched EGG progress, the catch-COMBO chain and the
// timestamps used for idle / "while you were away" production.
// Everything funnels through small multiplier helpers the game
// reads in its formulas.
// ============================================================

import { UPGRADES, ASCENSION, DAILY_POOL, STREAK_REWARDS, EGG } from './data.js?v=51';

const KEY = 'wandermere_meta';
const UP = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

// tiny seeded RNG so "today's" dailies are identical all day, every device
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFromStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function todayStr(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function isYesterday(prev, cur) {
  if (!prev) return false;
  const a = new Date(prev + 'T00:00:00'), b = new Date(cur + 'T00:00:00');
  return Math.round((b - a) / 86400000) === 1;
}

export class Meta {
  constructor() {
    this.upgrades = {};        // id -> level
    this.ascension = 0;        // prestige tier
    this.streak = 0;           // current login streak
    this.streakDate = null;    // last date the streak advanced
    this.dailyDate = null;     // date the current dailies were rolled
    this.dailies = [];         // [{id,stat,need,prog,done,gold,label}]
    this.steps = 0;            // egg incubator progress
    this.eggsHatched = 0;
    this.bestCombo = 0;
    this.lastSeen = Date.now();
    // session-only catch combo (not persisted)
    this.combo = { key: null, count: 0, t: 0 };
    this.pendingStreak = null; // reward to show on load (set by rollDay)
    this.load();
  }


  // ---------- upgrades ----------
  upLevel(id) { return this.upgrades[id] || 0; }
  upDef(id) { return UP[id]; }
  isMaxed(id) { return this.upLevel(id) >= (UP[id]?.max ?? 99); }
  upCost(id) { const u = UP[id]; if (!u) return Infinity; return Math.round(u.base * Math.pow(u.growth, this.upLevel(id))); }
  buyUpgrade(id, inv) {
    const u = UP[id]; if (!u || this.isMaxed(id)) return false;
    const cost = this.upCost(id);
    if (!inv.spendGold(cost)) return false;
    this.upgrades[id] = this.upLevel(id) + 1;
    this.save();
    return true;
  }

  // ---------- ascension (prestige) ----------
  ascensionCost() { return Math.round(ASCENSION.baseCost * Math.pow(ASCENSION.growth, this.ascension)); }
  canAscend(speciesCount) { return speciesCount >= ASCENSION.reqSpecies; }
  ascend(inv) {
    const cost = this.ascensionCost();
    if (!inv.spendGold(cost)) return false;
    this.ascension++; this.save();
    return true;
  }

  // ---------- multipliers the game reads ----------
  xpMult()     { return (1 + 0.12 * this.upLevel('xp'))   * (1 + ASCENSION.xpPer   * this.ascension); }
  goldMult()   { return (1 + 0.12 * this.upLevel('gold')) * (1 + ASCENSION.goldPer * this.ascension); }
  gatherMult() { return 1 + 0.15 * this.upLevel('gather'); }
  shinyMult()  { return (1 + 0.50 * this.upLevel('shiny')) * (1 + ASCENSION.shinyPer * this.ascension); }
  rareMult()   { return 1 + ASCENSION.rarePer * this.ascension; }
  catchAdd()   { return 0.03 * this.upLevel('catch'); }
  speedAdd()   { return 8 * this.upLevel('speed'); }
  luckAdd()    { return 0.08 * this.upLevel('luck'); }
  farmFactor() { return Math.max(0.35, 1 - 0.15 * this.upLevel('farm')); }
  offlineCapMs() { return (4 + 2 * this.upLevel('offline')) * 3600000; }
  maxOut()     { return 3 + this.upLevel('party'); }

  // ---------- catch combo (session) ----------
  // returns the new chain count for this species
  bumpCombo(key) {
    if (this.combo.key === key) this.combo.count++;
    else { this.combo.key = key; this.combo.count = 1; }
    this.combo.t = 28;          // seconds before the chain lapses
    if (this.combo.count > this.bestCombo) { this.bestCombo = this.combo.count; this.save(); }
    return this.combo.count;
  }
  breakCombo() { this.combo = { key: null, count: 0, t: 0 }; }
  tickCombo(dt) {
    if (this.combo.count > 0) { this.combo.t -= dt; if (this.combo.t <= 0) this.breakCombo(); }
  }
  // shiny multiplier from an active same-species chain (Let's-Go style)
  comboShinyMult(key) {
    if (this.combo.key === key && this.combo.count > 1) return Math.min(8, 1 + (this.combo.count - 1) * 0.5);
    return 1;
  }

  // ---------- eggs ----------
  addSteps(d) { this.steps += d; }
  eggFrac() { return Math.min(1, this.steps / EGG.stepsNeeded); }
  takeEgg() {
    if (this.steps < EGG.stepsNeeded) return false;
    this.steps -= EGG.stepsNeeded; this.eggsHatched++; this.save();
    return true;
  }

  // ---------- daily quests ----------
  rollDailies(dateStr) {
    const rng = mulberry32(seedFromStr('gloam-' + dateStr));
    const pool = DAILY_POOL.slice();
    // shuffle deterministically, take 3
    for (let i = pool.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const chosen = pool.slice(0, 3);
    return chosen.map((q) => {
      let need = Math.round(q.min + rng() * (q.max - q.min));
      if (q.id === 'walk') need = Math.round(need / 100) * 100; else need = Math.max(q.min, Math.round(need / 2) * 2);
      const label = `${q.verb} ${need}${q.unit ? ' ' + q.unit : ''}`;
      return { id: q.id, stat: q.stat, need, prog: 0, done: false, gold: q.gold, per: q.per, label };
    });
  }
  // ensure today's dailies exist; returns true if a fresh set was rolled
  ensureDailies(dateStr) {
    if (this.dailyDate === dateStr && this.dailies.length) return false;
    this.dailyDate = dateStr;
    this.dailies = this.rollDailies(dateStr);
    this.save();
    return true;
  }
  // feed progress; returns array of quests completed by THIS call (rewards applied)
  bumpDaily(stat, n, inv) {
    if (!n) return [];
    const done = [];
    for (const q of this.dailies) {
      if (q.done || q.stat !== stat) continue;
      q.prog = Math.min(q.need, q.prog + n);
      if (q.prog >= q.need) { q.done = true; inv.addGold(q.gold); done.push(q); }
    }
    if (done.length) this.save();
    return done;
  }
  dailiesDone() { return this.dailies.length > 0 && this.dailies.every((q) => q.done); }

  // ---------- daily login streak ----------
  // called once on load with today's date; advances the streak and parks a
  // reward in pendingStreak for the game to celebrate. Also rolls dailies.
  rollDay(inv) {
    const t = todayStr();
    this.ensureDailies(t);
    if (this.streakDate !== t) {
      this.streak = isYesterday(this.streakDate, t) ? this.streak + 1 : 1;
      this.streakDate = t;
      const r = STREAK_REWARDS[Math.min(this.streak - 1, STREAK_REWARDS.length - 1)];
      for (const [k, v] of Object.entries(r)) { if (k === 'gold') inv.addGold(v); else inv.add(k, v); }
      this.pendingStreak = { day: this.streak, reward: r };
      this.save();
    }
  }

  // ---------- idle / offline ----------
  // award accrued production for every persisted producer since lastSeen.
  // `producers` = [{type, every}] derived from saved buildings; awards go to inv.
  // returns { items:{item:qty}, hours } or null if nothing meaningful.
  claimOffline(producers, inv) {
    const now = Date.now();
    const elapsed = Math.min(this.offlineCapMs(), Math.max(0, now - this.lastSeen));
    if (elapsed < 60000 || !producers.length) return null;     // <1 min away → skip
    const factor = this.farmFactor();
    const items = {};
    for (const p of producers) {
      const interval = p.every * factor * 1000;
      const got = Math.floor(elapsed / interval);
      if (got > 0) items[p.item] = (items[p.item] || 0) + got;
    }
    const keys = Object.keys(items);
    if (!keys.length) return null;
    for (const [k, v] of Object.entries(items)) inv.add(k, v);
    return { items, hours: elapsed / 3600000 };
  }

  touch() { this.lastSeen = Date.now(); this.save(); }

  // ---------- persistence ----------
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        upgrades: this.upgrades, ascension: this.ascension,
        streak: this.streak, streakDate: this.streakDate,
        dailyDate: this.dailyDate, dailies: this.dailies,
        steps: this.steps, eggsHatched: this.eggsHatched,
        bestCombo: this.bestCombo, lastSeen: this.lastSeen,
      }));
    } catch (e) {}
  }
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d) return;
      this.upgrades = d.upgrades || {};
      this.ascension = d.ascension || 0;
      this.streak = d.streak || 0;
      this.streakDate = d.streakDate || null;
      this.dailyDate = d.dailyDate || null;
      this.dailies = Array.isArray(d.dailies) ? d.dailies : [];
      this.steps = d.steps || 0;
      this.eggsHatched = d.eggsHatched || 0;
      this.bestCombo = d.bestCombo || 0;
      this.lastSeen = d.lastSeen || Date.now();
    } catch (e) {}
  }
}
