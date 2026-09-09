// ============================================================
// Player-owned state: resource/item inventory, gold, caught-
// creature party, bestiary registry, player level & perks, achievement
// progress and crafting. Persists to localStorage.
// ============================================================

import { ITEMS, RECIPES, SPECIES, ACHIEVEMENTS, PERKS, ivHpMult } from './data.js?v=51';

const SAVE_KEY = 'wandermere_save';
const OLD_KEY = 'mythara3d_save';   // migrate older saves transparently
// species that are themselves an evolution of something → "stage 2+".
// First evolution requires Lv 10; a second evolution requires Lv 20.
const EVO_TARGETS = new Set(Object.values(SPECIES).map((s) => s.evolveTo).filter(Boolean));

export class Inventory {
  constructor() {
    this.items = { wood: 0, stone: 0, fiber: 0, iron: 0, crystal: 0, hide: 0, herb: 0, mushroom: 0, fish: 0, pearl: 0, gold: 0,
      berry: 3, stew: 0, jerky: 0, berrypie: 0, grilledfish: 0, potion: 0, superpotion: 0,
      ball: 5, greatball: 0, ultraball: 0, masterball: 0, axe: 0, pickaxe: 0, fishingrod: 0, lantern: 0, evostone: 0 };
    this.party = [];           // {key, level, hp, maxHp, shiny, xp, iv}
    this.maxOut = 3;           // active-team cap (raised by the Pack Bond upgrade)
    this.buildings = [];       // persisted placed structures: {type, x, y}
    this.bestiarySeen = new Set();
    this.bestiaryCaught = new Set();
    this.milestone = 0;        // highest bestiary milestone reward claimed
    this.plevel = 1;           // player level
    this.pxp = 0;              // player xp toward next level
    this.goldEarned = 0;       // lifetime gold earned (for achievements)
    this.achieved = new Set(); // unlocked achievement ids
    this.ach = {};             // lifetime stat counters for achievements
    this.load();
  }

  // ---- items ----
  add(item, n = 1) { this.items[item] = (this.items[item] || 0) + n; this.save(); }
  has(item, n = 1) { return (this.items[item] || 0) >= n; }
  remove(item, n = 1) { this.items[item] = Math.max(0, (this.items[item] || 0) - n); this.save(); }
  count(item) { return this.items[item] || 0; }

  // ---- gold ----
  get gold() { return this.items.gold || 0; }
  addGold(n) { this.items.gold = (this.items.gold || 0) + n; this.goldEarned += n; this.save(); }
  spendGold(n) { if (this.gold < n) return false; this.items.gold -= n; this.save(); return true; }

  canCraft(recipe) { return Object.entries(recipe.cost).every(([k, v]) => this.has(k, v)); }
  craft(recipe) {
    if (!this.canCraft(recipe)) return false;
    for (const [k, v] of Object.entries(recipe.cost)) this.remove(k, v);
    this.add(recipe.out, recipe.qty);
    return true;
  }

  // ---- party / bestiary ----
  capture(creature) {
    this.bestiaryCaught.add(creature.key);
    this.bestiarySeen.add(creature.key);
    // newly caught creatures are sent out automatically until the team is full
    this.party.push({ key: creature.key, level: creature.level, hp: creature.maxHp, maxHp: creature.maxHp, shiny: creature.shiny, gloam: !!creature.gloam, iv: creature.iv == null ? Math.random() : creature.iv, xp: 0, out: this.outCount() < this.maxOut });
    this.save();
  }
  see(key) { if (!this.bestiarySeen.has(key)) { this.bestiarySeen.add(key); this.save(); } }

  // ---- active team ("out") — at most 3 creatures out at once ----
  outMembers() { return this.party.filter((m) => m.out); }
  outCount() { return this.party.reduce((n, m) => n + (m.out ? 1 : 0), 0); }
  lead() { return this.party.find((m) => m.out) || this.party[0] || null; }
  leadIndex() { const m = this.lead(); return m ? this.party.indexOf(m) : -1; }
  ownsSpecies(key) { return this.party.some((m) => m.key === key); }
  isSpeciesOut(key) { return this.party.some((m) => m.key === key && m.out); }
  // toggle a member in/out; returns 'out' | 'benched' | 'full' | 'none'
  toggleOut(i) {
    const m = this.party[i]; if (!m) return 'none';
    if (m.out) { m.out = false; this.save(); return 'benched'; }
    if (this.outCount() >= this.maxOut) return 'full';
    m.out = true; this.save(); return 'out';
  }
  toggleOutBySpecies(key) { const i = this.party.findIndex((m) => m.key === key); return i < 0 ? 'none' : this.toggleOut(i); }
  healLead(amount) { const m = this.lead(); if (!m) return 0; const b = m.hp; m.hp = Math.min(m.maxHp, m.hp + amount); this.save(); return m.hp - b; }

  xpNeeded(level) { return 14 + level * 9; }
  // give the lead party member XP; returns {member, evolved} if it levelled up, else null
  grantXp(amount, mult = 1) {
    const m = this.lead();
    if (!m) return null;
    m.xp = (m.xp || 0) + Math.round(amount * mult);
    let leveled = false;
    while (m.xp >= this.xpNeeded(m.level)) {
      m.xp -= this.xpNeeded(m.level);
      m.level++;
      m.maxHp = Math.round(SPECIES[m.key].hp * (1 + m.level * 0.08) * ivHpMult(m.iv));
      m.hp = m.maxHp;
      leveled = true;
    }
    this.save();
    return leveled ? { member: m, evolved: null } : null;   // evolution is stone-only now (see evolve())
  }
  // heal a party member (potions)
  healCreature(i, amount) {
    const m = this.party[i]; if (!m) return 0;
    const before = m.hp; m.hp = Math.min(m.maxHp, m.hp + amount); this.save();
    return m.hp - before;
  }
  starter(key) {
    this.bestiaryCaught.add(key); this.bestiarySeen.add(key);
    const sp = SPECIES[key];
    const mhp = Math.round(sp.hp * 1.4 * ivHpMult(0.7));
    this.party.unshift({ key, level: 5, hp: mhp, maxHp: mhp, shiny: false, gloam: false, iv: 0.7, xp: 0, out: true });
    this.save();
  }

  // make member i the lead: ensure it's out (benching another if 3 are already out), then move to front
  // a creature is knocked out for good — remove the current lead from the party
  killLead() { const idx = this.leadIndex(); if (idx < 0) return null; const [m] = this.party.splice(idx, 1); this.save(); return m; }

  setLead(i) {
    const m = this.party[i]; if (!m) return;
    if (!m.out) {
      if (this.outCount() >= this.maxOut) { const other = this.party.find((p) => p.out && p !== m); if (other) other.out = false; }
      m.out = true;
    }
    this.party.splice(i, 1); this.party.unshift(m);
    this.save();
  }
  release(i) { if (i >= 0 && i < this.party.length) { this.party.splice(i, 1); this.save(); } }

  // ---- placed structures persist across sessions ----
  addBuilding(type, x, y) { this.buildings.push({ type, x: Math.round(x), y: Math.round(y) }); this.save(); }

  // structural: the species this one evolves into (or null)
  evoTarget(i) { const m = this.party[i]; const to = m && SPECIES[m.key] && SPECIES[m.key].evolveTo; return (to && SPECIES[to]) ? to : null; }
  // required level: 10 for a base form's first evolution, 20 for a second
  evoReq(i) { const m = this.party[i]; return (m && EVO_TARGETS.has(m.key)) ? 20 : 10; }
  // has an evolution AND is high enough level (used to enable the button)
  canEvolve(i) { return !!this.evoTarget(i) && this.party[i].level >= this.evoReq(i); }
  // evolve a party member — needs the level AND one Evolve Stone; returns {from,to} or null
  evolve(i) {
    const to = this.evoTarget(i);
    if (!to || this.party[i].level < this.evoReq(i) || !this.has('evostone')) return null;
    const m = this.party[i]; const from = m.key;
    this.remove('evostone', 1);
    m.key = to; m.maxHp = Math.round(SPECIES[to].hp * (1 + m.level * 0.08) * ivHpMult(m.iv)); m.hp = m.maxHp;
    this.bestiaryCaught.add(to); this.bestiarySeen.add(to);
    this.save();
    return { from, to };
  }

  // ---- player level & perks ----
  grantPlayerXp(n) {
    this.pxp += n;
    let leveled = 0;
    while (this.pxp >= PERKS.xpNeeded(this.plevel)) { this.pxp -= PERKS.xpNeeded(this.plevel); this.plevel++; leveled = this.plevel; }
    this.save();
    return leveled;            // 0 if no level-up, else new level
  }
  playerXpFrac() { return Math.min(1, this.pxp / PERKS.xpNeeded(this.plevel)); }
  gatherBonus() { return PERKS.gatherBonus(this.plevel); }
  maxHpBonus() { return PERKS.maxHpBonus(this.plevel); }
  maxStamBonus() { return PERKS.maxStamBonus(this.plevel); }
  catchBonus() { return PERKS.catchBonus(this.plevel); }
  speedBonus() { return PERKS.speedBonus(this.plevel); }

  // ---- achievements ----
  progress(name, n = 1, mode = 'add') {
    this.ach[name] = mode === 'max' ? Math.max(this.ach[name] || 0, n) : (this.ach[name] || 0) + n;
  }
  // check all achievements against current progress; returns newly unlocked + applies rewards
  checkAchievements(extra = {}) {
    const merged = { ...this.ach, ...extra, species: this.bestiaryCaught.size, goldEarned: this.goldEarned, plevel: this.plevel };
    const out = [];
    for (const a of ACHIEVEMENTS) {
      if (this.achieved.has(a.id)) continue;
      if ((merged[a.stat] || 0) >= a.need) {
        this.achieved.add(a.id);
        if (a.reward) for (const [k, v] of Object.entries(a.reward)) { if (k === 'gold') this.addGold(v); else this.add(k, v); }
        out.push(a);
      }
    }
    if (out.length) this.save();
    return out;
  }

  // ---- persistence ----
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        items: this.items, party: this.party, buildings: this.buildings,
        seen: [...this.bestiarySeen], caught: [...this.bestiaryCaught], milestone: this.milestone,
        plevel: this.plevel, pxp: this.pxp, goldEarned: this.goldEarned,
        achieved: [...this.achieved], ach: this.ach,
      }));
    } catch (e) {}
  }
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_KEY) || 'null');
      if (!d) return;
      Object.assign(this.items, d.items || {});
      this.party = d.party || [];
      this.party.forEach((m) => { if (m.xp == null) m.xp = 0; if (m.iv == null) m.iv = 0.5; if (m.hp == null) m.hp = m.maxHp; });
      this.buildings = Array.isArray(d.buildings) ? d.buildings : [];
      // migrate saves from before the "out" team system: send out the first 3
      if (this.party.length && !this.party.some((m) => m.out)) this.party.slice(0, 3).forEach((m) => { m.out = true; });
      this.bestiarySeen = new Set(d.seen || []);
      this.bestiaryCaught = new Set(d.caught || []);
      this.milestone = d.milestone || 0;
      this.plevel = d.plevel || 1;
      this.pxp = d.pxp || 0;
      this.goldEarned = d.goldEarned || 0;
      this.achieved = new Set(d.achieved || []);
      this.ach = d.ach || {};
    } catch (e) {}
  }
}

export { ITEMS, RECIPES, SPECIES };
