// ============================================================
// MYTHARA — 2D top-down survival (Phaser 3). A procedural world
// of biomes, real Pokémon (PokeAPI sprites) that wander and can
// be weakened & caught, plus survival, resources, crafting,
// building, day/night and weather.
// ============================================================

import { SPECIES, ITEMS, BUILDINGS, SEA, BUFFS, FISH, spriteUrl, typeMult, TYPE_COLORS, BOSS, BOSS_POOL, EGG, ivHpMult } from './data.js?v=51';
import { Inventory } from './inventory.js?v=51';
import { UI } from './ui.js?v=51';
import { SFX, unlock as sfxUnlock, toggleMute } from './sfx.js?v=51';
import { Net } from './net.js?v=51';
import { Meta } from './meta.js?v=51';
import { floatNumber, screenFlash, burst, bigBanner } from './juice.js?v=51';

// player appearance — overridden by the start screen via startGame(options)
const DEFAULT_AVATAR = { skin: 0xe8b890, hair: 0x2a2018, shirt: 0x2a9d9d, pants: 0x2a3550 };
let AVATAR = { ...DEFAULT_AVATAR };
function shade(n, f = 0.78) { const r = ((n >> 16) & 255) * f | 0, g = ((n >> 8) & 255) * f | 0, b = (n & 255) * f | 0; return (r << 16) | (g << 8) | b; }

const TILE = 24;                        // chunky 8-bit tiles
const COLS = 150, ROWS = 150;          // 3600 x 3600 world (much bigger)
const WORLD_W = COLS * TILE, WORLD_H = ROWS * TILE;
const LAKE = { x: WORLD_W * 0.3, y: WORLD_H * 0.66, r: WORLD_W * 0.13 };
const WATER_LEVEL = -2.2;

let SEED = (Math.random() * 1e9) | 0;
// deterministic int seed from a string (so a room code maps to one shared world)
function strSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000000000; }

// ---------- deterministic noise ----------
function hash(x, y) { const s = Math.sin((x + SEED * 0.13) * 127.1 + (y - SEED * 0.07) * 311.7) * 43758.5453; return s - Math.floor(s); }
function smooth(t) { return t * t * (3 - 2 * t); }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  const u = smooth(xf), v = smooth(yf);
  return Phaser.Math.Linear(Phaser.Math.Linear(a, b, u), Phaser.Math.Linear(c, d, u), v);
}
function biomeAt(x, y) {
  if (Phaser.Math.Distance.Between(x, y, LAKE.x, LAKE.y) < LAKE.r) return 'water';
  const snow = noise(x * 0.004 + 50, y * 0.004 - 30);
  if (snow > 0.66) return 'snow';
  const desert = noise(x * 0.0045 - 200, y * 0.0045 + 150);
  if (desert > 0.68) return 'desert';
  const swamp = noise(x * 0.0052 + 300, y * 0.0052 - 220);
  if (swamp > 0.67) return 'swamp';
  const rock = noise(x * 0.005 - 80, y * 0.005 + 60);
  if (rock > 0.66) return 'rocky';
  const forest = noise(x * 0.006 + 100, y * 0.006 - 50);
  if (forest > 0.55) return 'forest';
  return 'plains';
}
function isWater(x, y) { return Phaser.Math.Distance.Between(x, y, LAKE.x, LAKE.y) < LAKE.r - 14; }

const BIOME_COLORS = {
  plains: [0x6fa653, 0x73aa57], forest: [0x447332, 0x487836], rocky: [0x8f8a80, 0x938e84],
  snow: [0xe8f0f7, 0xe2ebf3], water: [0x2f7fb5, 0x327fb2], beach: [0xcdc089, 0xd1c48d],
  desert: [0xd9c48a, 0xddc98f], swamp: [0x4a5a3a, 0x46583a],
};
// my own region flavour names (not a copy of the original's)
const BIOME_NAMES = {
  plains: 'Meadowlands', forest: 'Whisperwood', rocky: 'Cinder Ridge',
  snow: 'Frostmere', beach: 'Sunlit Shore', water: 'Still Lake',
  desert: 'Emberwastes', swamp: 'Mirewood',
};
const PLACE_NAMES = ['Hollowbrook', 'Mistford', 'Thornvale', 'Greyfen', 'Larkspur', 'Duskmoor', 'Ravenmere', 'Oakshade'];

// long quest chain with item rewards (cumulative stats, completed in order).
// Tuned so the whole chain is many hours of play.
const QUESTS = [
  { title: 'Gather wood', max: 5, stat: 'wood', reward: { ball: 2 } },
  { title: 'Mine stone', max: 5, stat: 'stone', reward: { ball: 2 } },
  { title: 'Catch your first creature', max: 1, stat: 'species', reward: { greatball: 1 } },
  { title: 'Craft a tool', max: 1, stat: 'tools', reward: { wood: 8, stone: 8 } },
  { title: 'Build a campfire', max: 1, stat: 'built', reward: { berry: 3 } },
  { title: 'Register 3 species', max: 3, stat: 'species', reward: { ultraball: 1 } },
  { title: 'Build an automated farm', max: 1, stat: 'farms', reward: { evostone: 1 } },
  { title: 'Evolve a creature', max: 1, stat: 'evolved', reward: { ultraball: 2 } },
  { title: 'Survive to Day 3', max: 3, stat: 'days', reward: { meat: 3, greatball: 2 } },
  { title: 'Build 5 structures', max: 5, stat: 'built', reward: { evostone: 1 } },
  { title: 'Gather 60 wood', max: 60, stat: 'wood', reward: { ultraball: 2 } },
  { title: 'Register 8 species', max: 8, stat: 'species', reward: { evostone: 1, ultraball: 2 } },
  { title: 'Build 2 production sites', max: 2, stat: 'farms', reward: { ultraball: 3 } },
  { title: 'Evolve 3 creatures', max: 3, stat: 'evolved', reward: { evostone: 2 } },
  { title: 'Survive to Day 6', max: 6, stat: 'days', reward: { meat: 5, ultraball: 3 } },
  { title: 'Mine 80 stone', max: 80, stat: 'stone', reward: { evostone: 1 } },
  { title: 'Register 15 species', max: 15, stat: 'species', reward: { evostone: 2, ultraball: 4 } },
  { title: 'Catch 40 creatures', max: 40, stat: 'caught', reward: { evostone: 2 } },
  { title: 'Survive to Day 12', max: 12, stat: 'days', reward: { evostone: 3 } },
  { title: 'Register 25 species', max: 25, stat: 'species', reward: { evostone: 4, ultraball: 6 } },
  { title: 'Catch a fish', max: 1, stat: 'fished', reward: { wood: 10 } },
  { title: 'Cook 3 meals', max: 3, stat: 'cooked', reward: { herb: 4 } },
  { title: 'Defeat 5 aggressive creatures', max: 5, stat: 'defeated', reward: { potion: 3 } },
  { title: 'Catch 80 creatures', max: 80, stat: 'caught', reward: { evostone: 4 } },
  { title: 'Catch 25 fish', max: 25, stat: 'fished', reward: { evostone: 2 } },
  { title: 'Cook 15 meals', max: 15, stat: 'cooked', reward: { superpotion: 2 } },
  { title: 'Defeat an Alpha creature', max: 1, stat: 'bosses', reward: { ultraball: 4, evostone: 1 } },
  { title: 'Build 10 production sites', max: 10, stat: 'farms', reward: { evostone: 3 } },
  { title: 'Defeat 30 aggressive creatures', max: 30, stat: 'defeated', reward: { masterball: 1 } },
  { title: 'Register 40 species', max: 40, stat: 'species', reward: { evostone: 4, ultraball: 8 } },
  { title: 'Survive to Day 20', max: 20, stat: 'days', reward: { evostone: 5 } },
  { title: 'Defeat 3 Alpha creatures', max: 3, stat: 'bosses', reward: { masterball: 1, evostone: 3 } },
  { title: 'Register 75 species', max: 75, stat: 'species', reward: { evostone: 6, masterball: 1 } },
  { title: 'Complete the Dex (all species)', max: 149, stat: 'species', reward: { evostone: 12, masterball: 2 } },
];

const rarityWeight = { common: 1, uncommon: 0.5, rare: 0.16, legend: 0.02 };
// how much each danger tier lifts rare/legend spawn weight (20 tiers -> 3.4x at the rim)
const RARE_PER_TIER = 0.12;
// Alphas follow the same gradient: uncommon near home, a real hazard at the rim.
const ALPHA_PER_TIER = 0.004;
function alphaRateAt(scene, x, y) {
  const base = scene._alphaRate != null ? scene._alphaRate : 0.03;
  if (base >= 1) return base;                       // meteor-shower override
  return base + dangerLevel(x, y) * ALPHA_PER_TIER; // 3% at home -> ~11% at the rim
}
// the rare/legend spawn multiplier the player is standing in, for the HUD
function rareBonusAt(x, y) { return 1 + dangerLevel(x, y) * RARE_PER_TIER; }

// Legendary catch log. Kept in localStorage so a claim can be checked against
// the player's own device rather than a screenshot alone, and stamped in UTC
// so entries from different timezones sort against each other correctly.
const LEGEND_LOG_KEY = 'terratamers_legend_log';
function readLegendLog() {
  try { const a = JSON.parse(localStorage.getItem(LEGEND_LOG_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function logLegendCatch(c, ivPct) {
  const d = new Date();
  const stamp = d.toISOString().replace('T', ' ').slice(0, 19);
  const rec = { species: c.sp.name, iv: ivPct, level: c.level, shiny: !!c.shiny, stamp, t: d.getTime() };
  try {
    const log = readLegendLog();
    log.push(rec);
    localStorage.setItem(LEGEND_LOG_KEY, JSON.stringify(log.slice(-50)));
  } catch (e) {}
  return rec;
}

// danger gradient: the further you roam from the spawn village, the higher
// the wild levels (and the better the rewards). 0 near home → ~19 at the rim.
function dangerLevel(x, y) {
  const d = Phaser.Math.Distance.Between(x, y, WORLD_W / 2, WORLD_H / 2);
  return Phaser.Math.Clamp(Math.floor(d / 135), 0, 20);
}

// Load every creature sprite in ONE background batch after create() so the
// boot never blocks; creatures spawn with a placeholder and swap to real art
// as each file arrives.
function loadAllSprites(scene, creatures) {
  for (const sp of Object.values(SPECIES)) {
    const key = 'mon' + sp.dex;
    if (!scene.textures.exists(key)) scene.load.image(key, spriteUrl(sp.dex, false));
  }
  scene.load.on('filecomplete', (key) => {
    for (const c of creatures) {
      if ('mon' + c.sp.dex === key) c.spr.setTexture(key).setScale(c.sp.scale * 0.55).setAlpha(1).setOrigin(0.5, footFrac(scene, key));
    }
  });
  scene.load.start();
}

export function startGame(options = {}) {
  const opts = options || {};
  const MODE = opts.mode === 'multiplayer' ? 'multiplayer' : 'offline';
  if (opts.avatar) AVATAR = {
    skin: opts.avatar.skin ?? DEFAULT_AVATAR.skin, hair: opts.avatar.hair ?? DEFAULT_AVATAR.hair,
    shirt: opts.avatar.shirt ?? DEFAULT_AVATAR.shirt, pants: opts.avatar.pants ?? DEFAULT_AVATAR.pants,
  };
  const PLAYER_NAME = ((opts.name || 'Wanderer') + '').slice(0, 16);
  const IDENTITY = opts.identity || { type: 'guest', value: PLAYER_NAME };
  const ROOM = ((opts.room || 'public') + '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'PUBLIC';
  const MY_ID = (IDENTITY.type + ':' + (IDENTITY.value || PLAYER_NAME)).slice(0, 40) + ':' + ((Math.random() * 1e6) | 0);
  // everyone in the SAME room shares one world (seed derived from the code)
  if (MODE === 'multiplayer') SEED = strSeed(ROOM);
  else {
    // offline: pin a stable per-player world seed so a persisted base lines up
    try { let s = +localStorage.getItem('terratamers_seed'); if (!s) { s = (Math.random() * 1e9) | 0; localStorage.setItem('terratamers_seed', String(s)); } SEED = s; } catch (e) {}
  }

  const inv = new Inventory();
  const meta = new Meta();
  inv.maxOut = meta.maxOut();
  const ui = new UI(inv);
  ui.meta = meta;

  const config = {
    type: Phaser.AUTO,
    parent: 'game-root',
    backgroundColor: '#2a3a2a',
    pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: { preload, create, update },
  };
  const game = new Phaser.Game(config);

  // shared scene state
  let S;

  function preload() {
    S = this;
    // creature sprites stream in a background batch; here we load the small
    // local ball images used both as the thrown balls and item icons, so the
    // ball you actually throw (Great / Ultra) is the one shown in flight
    this.load.image('ball', 'assets/itm_ball.png?v=51');
    this.load.image('greatball', 'assets/itm_greatball.png?v=51');
    this.load.image('ultraball', 'assets/itm_ultraball.png?v=51');
    this.load.on('loaderror', (f) => console.warn('asset missing', f.key));
  }

  function create() {
    const scene = this;
    window.__phase = 'create';
    scene._shinyRate = 1 / 200;     // raised temporarily during a Meteor Shower event
    scene._alphaRate = 0.03;        // chance any wild spawn is an oversized Alpha
    scene._shinyMult = meta.shinyMult();  // permanent shiny boost from upgrades/ascension
    scene._luckAdd = meta.luckAdd();      // high-IV / rare-drop bonus
    scene._comboKey = null; scene._comboShinyMult = 1;
    // recompute the live meta-driven scene knobs (after buying upgrades / ascending)
    function applyMeta() { scene._shinyMult = meta.shinyMult(); scene._luckAdd = meta.luckAdd(); inv.maxOut = meta.maxOut(); }
    scene._applyMeta = applyMeta;
    makeTextures(scene);
    buildGround(scene);
    const props = scatterProps(scene);

    // ---- solid-prop collision grid (trees & rocks block movement) ----
    const CELL = 90, solidGrid = new Map();
    for (const p of props) {
      if (p.kind === 'bush') continue;
      const k = ((p.spr.x / CELL) | 0) + ',' + ((p.spr.y / CELL) | 0);
      (solidGrid.get(k) || solidGrid.set(k, []).get(k)).push(p);
    }
    function solidAt(x, y) {
      const cx = (x / CELL) | 0, cy = (y / CELL) | 0;
      for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const arr = solidGrid.get(gx + ',' + gy); if (!arr) continue;
        for (const p of arr) {
          if (p.hp <= 0 || !p.spr.visible) continue;
          const r = (p.kind === 'rock' ? 12 : 9) + 7;
          if (Math.hypot(x - p.spr.x, y - p.spr.y) < r) return true;
        }
      }
      return false;
    }

    // player
    const player = scene.physics.add.sprite(WORLD_W / 2, WORLD_H / 2, 'player');
    player.setDepth(player.y);
    player.body.setSize(20, 16).setOffset(2, 24);
    const baseMaxHp = 100 + inv.maxHpBonus();
    const baseMaxStam = 100 + inv.maxStamBonus();
    Object.assign(player, {
      hp: baseMaxHp, maxHp: baseMaxHp, hunger: 100, maxHunger: 100, stamina: baseMaxStam, maxStamina: baseMaxStam,
      alive: true, face: { x: 0, y: 1 }, walkT: 0,
    });
    // a soft light that follows the player; brightens at night if you hold a Lantern
    const playerLight = scene.add.pointlight(player.x, player.y, 0xffe6b0, 110, 0).setDepth(8500);
    // floating name tag above the player
    const nameLabel = scene.add.text(player.x, player.y - 52, PLAYER_NAME, { fontFamily: 'monospace', fontSize: '11px', color: '#b8f25f', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(60000);

    scene.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    scene.cameras.main.startFollow(player, true, 0.12, 0.12);
    scene.cameras.main.setZoom(1.25);

    // day/night overlay + weather
    const overlay = scene.add.rectangle(0, 0, 4000, 4000, 0x0a1030, 0).setScrollFactor(0).setDepth(9000).setOrigin(0.5).setPosition(scene.scale.width / 2, scene.scale.height / 2);
    const flash = scene.add.rectangle(0, 0, 4000, 4000, 0xffffff, 0).setScrollFactor(0).setDepth(9001).setOrigin(0.5).setPosition(scene.scale.width / 2, scene.scale.height / 2);
    const sky = { t: 0.32, weather: 'clear', wTimer: 16, lightning: 0, isNight() { return this.t < 0.22 || this.t > 0.8; } };

    const rain = scene.add.particles(0, 0, 'drop', {
      x: { min: -500, max: 500 }, y: -400, lifespan: 700, speedY: { min: 600, max: 800 }, speedX: 120,
      scale: { min: 0.5, max: 1 }, quantity: 6, frequency: 16, follow: player, emitting: false, tint: 0xaaccee,
    }).setDepth(9500).setScrollFactor(0);
    const snow = scene.add.particles(0, 0, 'flake', {
      x: { min: -500, max: 500 }, y: -400, lifespan: 2600, speedY: { min: 60, max: 120 }, speedX: { min: -40, max: 40 },
      scale: { min: 0.4, max: 1 }, quantity: 3, frequency: 30, follow: player, emitting: false,
    }).setDepth(9500).setScrollFactor(0);

    // keyboard
    const keys = scene.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE,F,E,B,R,C,T,P,TAB,ESC,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT');
    scene.input.keyboard.on('keydown-TAB', (e) => { e.preventDefault(); ui.toggle('inventory'); });
    scene.input.keyboard.on('keydown-P', () => ui.toggle('dex'));
    scene.input.keyboard.on('keydown-T', () => ui.toggle('party'));
    scene.input.keyboard.on('keydown-C', () => ui.toggle('craft'));
    scene.input.keyboard.on('keydown-ESC', () => ui.close());
    scene.input.keyboard.on('keydown-B', () => { if (!ui.openPanel) toggleBuild(); });
    scene.input.keyboard.on('keydown-R', () => { if (build.active) build.rot = (build.rot + 1) % 4; });
    scene.input.keyboard.on('keydown-SPACE', () => act());
    scene.input.keyboard.on('keydown-F', () => throwBall());
    scene.input.keyboard.on('keydown-E', () => interact());
    scene.input.keyboard.on('keydown-H', () => ui.toggleHowto());
    scene.input.keyboard.on('keydown-J', () => { ui.toggle('ach'); });
    scene.input.keyboard.on('keydown-U', () => ui.toggle('upgrades'));
    scene.input.keyboard.on('keydown-G', () => ui.toggle('daily'));
    scene.input.keyboard.on('keydown-COMMA', () => cycleBuild(-1));
    scene.input.keyboard.on('keydown-PERIOD', () => cycleBuild(1));
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'].forEach((k, i) =>
      scene.input.keyboard.on('keydown-' + k, () => {
        if (build.active) { const t = Object.keys(BUILDINGS)[i]; if (t) { build.type = t; ui.toast('Build: ' + BUILDINGS[t].name, '#b8f25f'); } }
        else ui.selectSlot(i);
      }));

    scene.input.on('pointerdown', (p) => {
      sfxUnlock();
      if (ui.openPanel) return;
      if (p.rightButtonDown()) throwBall(); else act(p.worldX, p.worldY);
    });
    scene.input.keyboard.on('keydown', () => sfxUnlock());
    scene.input.mouse.disableContextMenu();

    // village near spawn: campfire + a market stall with a shopkeeper
    const vcx = WORLD_W / 2, vcy = WORLD_H / 2;
    scene.add.image(vcx - 30, vcy - 60, 'b_campfire').setDepth(vcy - 60);
    scene.add.pointlight(vcx - 30, vcy - 64, 0xff7a20, 30, 0.18).setDepth(vcy - 60);
    const shopX = vcx + 110, shopY = vcy - 36;
    const stall = scene.add.image(shopX, shopY, 'b_shop').setOrigin(0.5, 0.85).setDepth(shopY);
    scene.add.text(vcx - 6, vcy - 150, 'Gloamrest', { fontFamily: 'monospace', fontSize: '20px', color: '#ffd24a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(20000);
    const shopLabel = scene.add.text(shopX, shopY - 78, 'Trader  (E)', { fontFamily: 'monospace', fontSize: '12px', color: '#ffd24a', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(20000);
    const shopBox = { x: shopX, y: shopY - 14, w: 70, h: 30 };
    // clear any props that landed on the camp / stall (no trees inside the shop)
    for (const h of props) {
      if (Phaser.Math.Distance.Between(h.spr.x, h.spr.y, vcx, vcy) < 130 ||
          Phaser.Math.Distance.Between(h.spr.x, h.spr.y, shopX, shopY) < 80) { h.spr.destroy(); h.hp = -1; }
    }

    // creatures + build state
    const creatures = [];
    const followers = [];
    const build = { active: false, type: 'campfire', rot: 0, ghost: null, placed: [], lights: [], fires: [] };
    build.fires.push({ x: vcx - 30, y: vcy - 60 });   // the village campfire counts for cooking
    const stats = { wood: 0, stone: 0, caught: 0, crafted: 0, built: 0, tools: 0, farms: 0, evolved: 0, days: 1, fished: 0, cooked: 0, defeated: 0, bosses: 0, species: inv.dexCaught.size };
    const minimap = buildMinimap();

    // expose state for the loop + debugging
    S.state = { scene, player, playerLight, nameLabel, creatures, props, sky, overlay, flash, rain, snow, keys, build,
      balls: [], followers, stats, minimap, questIdx: 0, day: 1, annTimer: 8, stall,
      shopBox, shopX, shopY, lastHp: player.hp, hurtT: 0, solidAt, producers: [],
      buffs: [], eventTimer: 90 + Math.random() * 60, fishCd: 0, retalCd: 0, achTimer: 3, fishing: 0,
      mode: MODE, room: ROOM, myId: MY_ID, playerName: PLAYER_NAME, identity: IDENTITY,
      net: null, roster: [], remotes: new Map(), netSend: 0, piles: [], dead: false,
      boss: null, bossTimer: BOSS.firstDelayMin * 60, metaTouch: 15, stepBuf: 0 };

    ui.chat('Welcome to Terratamers — catch creatures, survive, and build with friends.', 'sys');
    ui.chat('Chop with Space. Weaken creatures, then throw a ball (F). Press H for help.');

    function refreshQuest() {
      const q = QUESTS[S.state.questIdx];
      if (!q) { ui.setQuest('✓', QUESTS.length, 'All quests done!', 1, 1); return; }
      ui.setQuest(S.state.questIdx + 1, QUESTS.length, q.title, Math.min(S.state.stats[q.stat], q.max), q.max);
    }
    const ACH_STATS = new Set(['caught', 'wood', 'stone', 'built', 'defeated', 'fished', 'cooked', 'evolved', 'bosses']);
    function bumpStat(name, n = 1) {
      S.state.stats[name] += n;
      if (n > 0 && ACH_STATS.has(name)) {
        inv.progress(name === 'bosses' ? 'bossKills' : name, n);
        if (scene._checkAch) scene._checkAch();
      }
      if (n > 0) notifyDailies(meta.bumpDaily(name, n, inv));
      let q;
      while ((q = QUESTS[S.state.questIdx]) && q.stat === name && S.state.stats[name] >= q.max) {
        if (q.reward) {
          for (const [k, v] of Object.entries(q.reward)) inv.add(k, v);
          const rs = Object.entries(q.reward).map(([k, v]) => `${v} ${ITEMS[k].name}`).join(', ');
          ui.toast('Quest done! +' + rs, '#ffd24a');
          ui.refreshHotbar(); ui.updateResources();
        } else ui.toast('Quest complete!', '#ffd24a');
        ui.chat('Quest complete: ' + q.title + '!', 'evt'); SFX.quest();
        S.state.questIdx++;
      }
      refreshQuest();
    }
    scene._bumpStat = bumpStat; scene._refreshQuest = refreshQuest;

    // surface any daily quests completed by the latest progress increment
    function notifyDailies(dq) {
      for (const q of dq) { ui.toast(`Daily done: ${q.label} +${q.gold}g`, '#ffd24a'); ui.chat(`Daily complete — ${q.label}! +${q.gold} gold`, 'evt'); SFX.daily(); }
      if (dq.length) { ui.updateResources(); if (ui.openPanel === 'daily') ui.renderDaily(); }
    }
    scene._notifyDailies = notifyDailies;

    // party creatures trail behind the player
    function spawnFollower(member) {
      const sp = SPECIES[member.key];
      const has = scene.textures.exists('mon' + sp.dex);
      const key = has ? 'mon' + sp.dex : 'ball';
      const spr = scene.add.image(player.x, player.y, key).setScale(sp.scale * 0.4).setDepth(player.y);
      spr.setOrigin(0.5, has ? footFrac(scene, key) : 0.88);
      if (member.gloam) spr.setTint(0xc9a0ff); else if (member.shiny) spr.setTint(0xfff3a0);
      followers.push({ spr, member, key: 'mon' + sp.dex });
      while (followers.length > 3) followers.shift().spr.destroy();
    }
    scene._spawnFollower = spawnFollower;

    // ---- timed food buffs ----
    function hasBuff(key) { return S.state.buffs.some((b) => b.key === key); }
    function applyBuff(key) {
      const def = BUFFS[key]; if (!def) return;
      const ex = S.state.buffs.find((b) => b.key === key);
      if (ex) ex.remain = def.dur; else S.state.buffs.push({ key, remain: def.dur });
      ui.toast(`${def.name}!`, def.color);
    }
    scene._applyBuff = applyBuff; scene._hasBuff = hasBuff;

    // ---- player XP & perks ----
    function awardPlayerXp(n) {
      const lv = inv.grantPlayerXp(Math.round(n * meta.xpMult()));
      if (lv) {
        player.maxHp = 100 + inv.maxHpBonus(); player.maxStamina = 100 + inv.maxStamBonus();
        player.hp = Math.min(player.maxHp, player.hp + 30);
        ui.toast(`You reached Level ${lv}!`, '#ffd24a'); ui.chat(`You grew to Level ${lv} — perks improved!`, 'evt'); SFX.levelup();
        checkAch();
      }
      ui.updatePlayer();
    }
    scene._awardPlayerXp = awardPlayerXp;

    function checkAch() {
      const got = inv.checkAchievements({ days: S.state.day });
      for (const a of got) { ui.toast('Achievement: ' + a.name + '!', '#ffd24a'); ui.chat('★ Achievement — ' + a.name + ': ' + a.desc, 'evt'); SFX.shiny(); }
      if (got.length) { ui.refreshHotbar(); ui.updateResources(); }
    }
    scene._checkAch = checkAch;

    // award XP to the lead party creature; celebrate level-ups & level-up evolutions
    function awardXp(n) {
      const mult = hasBuff('rested') ? BUFFS.rested.xpMult : 1;
      const r = inv.grantXp(n, mult * meta.xpMult());
      ui.updatePartyDock();
      if (r) {
        const m = r.member;
        ui.toast(`${SPECIES[m.key].name} grew to Lv ${m.level}!`, '#b8f25f'); ui.chat(`${SPECIES[m.key].name} reached Lv ${m.level}!`, 'evt'); SFX.levelup();
        if (r.evolved) {
          bumpStat('evolved');
          ui.toast(`${SPECIES[r.evolved.from].name} evolved into ${SPECIES[r.evolved.to].name}!`, '#b088ff');
          ui.chat(`${SPECIES[r.evolved.from].name} evolved into ${SPECIES[r.evolved.to].name}!`, 'evt');
          S.state.stats.species = inv.dexCaught.size; bumpStat('species', 0); dexMilestone(); rebuildFollowers();
          const pf = scene.add.particles(player.x, player.y - 16, 'flake', { speed: { min: 40, max: 140 }, lifespan: 600, scale: { start: 1.6, end: 0 }, quantity: 18, tint: 0xb088ff, emitting: false }).setDepth(player.y + 60);
          pf.explode(18); scene.time.delayedCall(700, () => pf.destroy());
          checkAch();
        }
      }
    }
    scene._awardXp = awardXp;

    // long-term Dex milestones — reward catching more unique species
    const MILESTONES = [[5, { evostone: 1 }], [10, { ultraball: 3 }], [15, { evostone: 2 }], [20, { ultraball: 5 }], [30, { evostone: 4 }], [42, { evostone: 10 }]];
    function dexMilestone() {
      const n = inv.dexCaught.size;
      for (const [need, rew] of MILESTONES) {
        if (n >= need && inv.milestone < need) {
          inv.milestone = need; inv.save();
          for (const [k, v] of Object.entries(rew)) inv.add(k, v);
          const rs = Object.entries(rew).map(([k, v]) => `${v} ${ITEMS[k].name}`).join(', ');
          ui.chat(`★ Dex milestone — ${need} species registered! +${rs}`, 'evt');
          ui.toast(`Dex ${need} species! +${rs}`, '#ffd24a'); SFX.levelup();
          ui.refreshHotbar(); ui.updateResources();
        }
      }
    }
    scene._dexMilestone = dexMilestone;

    // team management (equip / release / evolve from the party panel)
    function rebuildFollowers() {
      while (followers.length) followers.shift().spr.destroy();
      inv.outMembers().forEach((m) => spawnFollower(m));
    }
    ui.onTeamChange = rebuildFollowers;
    scene._rebuildFollowers = rebuildFollowers;
    ui.onEvolve = (r) => {
      SFX.levelup(); bumpStat('evolved');
      S.state.stats.species = inv.dexCaught.size; bumpStat('species', 0); dexMilestone();
      const pf = scene.add.particles(player.x, player.y - 16, 'flake', { speed: { min: 40, max: 140 }, lifespan: 600, scale: { start: 1.6, end: 0 }, quantity: 18, tint: 0xb088ff, emitting: false }).setDepth(player.y + 60);
      pf.explode(18); scene.time.delayedCall(700, () => pf.destroy());
    };

    // craft hook → quest progress + tool unique handling
    ui.onCraft = (r) => {
      SFX.craft();
      if (ITEMS[r.out] && ITEMS[r.out].kind === 'ball') bumpStat('crafted', r.qty);
      if (r.out === 'axe') { ui.toast('Axe crafted — trees fall faster!', '#b8f25f'); bumpStat('tools'); }
      if (r.out === 'pickaxe') { ui.toast('Pickaxe crafted — rock breaks faster!', '#b8f25f'); bumpStat('tools'); }
      if (r.out === 'fishingrod') { ui.toast('Fishing Rod ready — fish at the lake!', '#7ad0ff'); bumpStat('tools'); }
      if (r.out === 'lantern') { ui.toast('Lantern lit — see better at night!', '#ffd24a'); bumpStat('tools'); }
      if (r.cook) { bumpStat('cooked', 1); awardPlayerXp(4); }
      else if (r.cost) awardPlayerXp(2);
      ui.updateResources();
    };

    // upgrades / ascension hooks from the meta panels
    ui.onUpgrade = (id) => {
      applyMeta(); inv.maxOut = meta.maxOut();
      rebuildFollowers(); ui.updatePartyDock(); ui.updateResources(); ui.updatePlayer();
      SFX.craft(); floatNumber(scene, player.x, player.y - 30, 'Upgraded!', '#b8f25f');
    };
    ui.onAscend = () => {
      applyMeta(); inv.progress('ascend', meta.ascension, 'max');
      ui.updateResources(); ui.updatePlayer();
      SFX.prestige(); screenFlash(scene, 0xc9a0ff, 0.6);
      bigBanner('ASCENDED!', `Gloam tier ${meta.ascension} — permanent power unleashed`, '#c9a0ff');
      ui.chat(`You Ascended to Gloam tier ${meta.ascension}! All gains are permanently boosted.`, 'evt');
      checkAch();
    };

    refreshQuest();
    ui.updateResources(); ui.updatePartyDock();

    // ---------- helpers bound to this scene ----------
    // wild level scales with distance from home (danger gradient), the player's
    // own level and your Ascension tier, so the world never stops being a threat.
    function spawnLevel(x, y) {
      const lv = 1 + dangerLevel(x, y) * 1.7 + Math.random() * 4 + inv.plevel * 0.35 + meta.ascension * 4;
      return Phaser.Math.Clamp(Math.round(lv), 1, 100);
    }
    // rare species get more common deeper in / at higher Ascension.
    // The danger gradient feeds rarity as well as level, so the rim is where
    // the rare things actually live and walking out has a payoff beyond
    // bigger numbers on the same commons.
    function rweight(sp, x, y) {
      const base = rarityWeight[sp.rarity] || 0.3;
      if (sp.rarity !== 'rare' && sp.rarity !== 'legend') return base;
      const far = 1 + dangerLevel(x, y) * RARE_PER_TIER;   // 1x at home -> 3.4x at the rim
      return base * meta.rareMult() * far;
    }
    function spawnCreature() {
      if (creatures.length >= 11) return;
      const ang = Math.random() * Math.PI * 2, rad = 320 + Math.random() * 360;
      const x = Phaser.Math.Clamp(player.x + Math.cos(ang) * rad, 30, WORLD_W - 30);
      const y = Phaser.Math.Clamp(player.y + Math.sin(ang) * rad, 30, WORLD_H - 30);
      const wet = isWater(x, y);
      if (wet) {
        // spawn a swimming sea creature on the lake (rarity-weighted)
        const pool = SEA.filter((k) => SPECIES[k]).map((k) => [k, rweight(SPECIES[k], x, y)]);
        if (!pool.length) return;
        let r = Math.random() * pool.reduce((s, p) => s + p[1], 0), key = pool[0][0];
        for (const [k, w] of pool) { if ((r -= w) <= 0) { key = k; break; } }
        announceLegend(creatures[creatures.push(makeCreature(scene, key, spawnLevel(x, y), x, y, true)) - 1]);
        return;
      }
      const biome = biomeAt(x, y);
      const pool = [];
      for (const [key, sp] of Object.entries(SPECIES)) {
        if (SEA.includes(key)) continue;              // sea species only spawn in water
        let ok = sp.biomes.includes(biome);
        if (sky.isNight() && sp.biomes.includes('night')) ok = true;
        if (ok) pool.push([key, rweight(sp, x, y)]);
      }
      if (!pool.length) return;
      let r = Math.random() * pool.reduce((s, p) => s + p[1], 0), key = pool[0][0];
      for (const [k, w] of pool) { if ((r -= w) <= 0) { key = k; break; } }
      announceLegend(creatures[creatures.push(makeCreature(scene, key, spawnLevel(x, y), x, y, false)) - 1]);
    }

    // A legendary spawning is an event, not just another sprite. Flag it on the
    // minimap and tell the player, so Mew can't wander past off-screen unseen.
    function announceLegend(c) {
      if (!c || !c.sp.legendary) return;
      S.state.legend = c;
      bigBanner('LEGENDARY SIGHTED', `${c.sp.name} is nearby — follow the gold marker`, '#ffd24a');
      ui.chat(`✦ A ${c.sp.name} has been sighted nearby. Check your minimap.`, 'evt');
      screenFlash(scene, 0xffd24a, 0.35);
      SFX.boss();
    }
    scene._spawnLevel = spawnLevel;

    function nearestCreature(range) {
      let best = null, bd = range;
      for (const c of creatures) {
        const d = Phaser.Math.Distance.Between(player.x, player.y, c.x, c.y);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    }

    function nearestProp(range) {
      let best = null, bd = range;
      for (const h of props) {
        if (h.hp <= 0) continue;
        const d = Phaser.Math.Distance.Between(player.x, player.y, h.spr.x, h.spr.y);
        if (d < bd) { bd = d; best = h; }
      }
      return best;
    }

    // nearest creature / prop to an arbitrary point — used for click targeting
    function creatureNear(x, y, r) {
      let best = null, bd = r;
      for (const c of creatures) { const d = Phaser.Math.Distance.Between(x, y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
      return best;
    }
    function propNear(x, y, r) {
      let best = null, bd = r;
      for (const h of props) { if (h.hp <= 0 || !h.spr.visible) continue; const d = Phaser.Math.Distance.Between(x, y, h.spr.x, h.spr.y); if (d < bd) { bd = d; best = h; } }
      return best;
    }

    // weaken / fight a specific creature — EVERY creature you have out joins in,
    // each dealing its own typed damage and firing its own attack animation.
    function weaken(c) {
      if ((S.state.atkCd || 0) > 0) return;          // attacks have a swing timer — no spam-killing
      S.state.atkCd = 0.3;
      const team = inv.outMembers();
      const armor = c.alpha ? 0.7 : 1;               // Alphas have thick hide — they take less per hit
      let total = 0, bestMult = 1;
      if (team.length) {
        for (const m of team) {
          const mult = typeMult(SPECIES[m.key].types[0], c.sp.types);
          bestMult = Math.max(bestMult, mult);
          total += Math.max(1, Math.round((9 + m.level + inv.gatherBonus()) * mult * armor));
        }
      } else {
        total = Math.max(1, Math.round((6 + inv.gatherBonus()) * armor));   // no creatures out → bare-handed swat
      }
      const before = c.hp;
      // peaceful creatures floor at 1 HP (so you catch them); aggressive ones
      // and Alphas can be beaten down to 0 and defeated for loot instead.
      const floor = c.isAggressive() ? 0 : 1;
      c.hp = Math.max(floor, c.hp - total); c.showBar();
      floatNumber(scene, c.x, c.y - 28 - Math.random() * 8, '-' + total, bestMult > 1.2 ? '#ffd24a' : '#ff9a9a', bestMult > 1.2 ? 14 : 12);
      if (!c.isAggressive()) c.flee(player);
      inv.see(c.key); SFX.hit(); awardXp(1); awardPlayerXp(1);
      // each out creature fires its OWN attack from where it stands (staggered cascade)
      const tx = c.x, ty = c.y - 8;
      if (team.length) {
        team.forEach((m, i) => {
          const f = followers.find((ff) => ff.member === m);
          const ox = f ? f.spr.x : player.x, oy = f ? f.spr.y - 14 : player.y - 14;
          scene.time.delayedCall(i * 80, () => attackFx(scene, ox, oy, tx, ty, SPECIES[m.key].types[0]));
        });
      } else {
        attackFx(scene, player.x, player.y - 14, tx, ty, 'normal');
      }
      if (bestMult > 1.2) ui.toast('Super effective!', '#b8f25f');
      if (c.hp <= 0) { defeatCreature(c); return; }
      if (before > 1 && c.hp <= 1) ui.toast(`${c.sp.name} is weak — throw a ball! (F)`, '#ffd24a');
    }

    // act() — Space (no coords) acts on whatever is nearest the player; a mouse
    // click (with world coords) acts on whatever is UNDER the cursor, so clicking
    // a creature always targets that creature instead of chopping a nearby tree.
    function act(px, py) {
      if (!player.alive || ui.openPanel) return;
      if (build.active) return placeBuild();
      if (px != null) {
        const cc = creatureNear(px, py, 56);
        if (cc) {
          if (cc.capturing) return;
          if (Phaser.Math.Distance.Between(player.x, player.y, cc.x, cc.y) <= 240) { weaken(cc); return; }
          ui.toast('Too far — move closer.', '#ff8787'); return;     // never chops a tree when you clicked a creature
        }
        const ph = propNear(px, py, 40);
        if (ph) {
          if (Phaser.Math.Distance.Between(player.x, player.y, ph.spr.x, ph.spr.y) <= 95) { chop(ph); return; }
          ui.toast('Too far — move closer.', '#ff8787'); return;
        }
        // clicked empty ground → fall through to the nearest-thing behaviour
      }
      const c = nearestCreature(90);
      if (c && !c.capturing) { weaken(c); return; }
      const h = nearestProp(70);
      if (h) { chop(h); return; }
      if (inv.has('fishingrod') && nearWater()) fish();
    }

    function chipBurst(x, y, tex, n) {
      const p = scene.add.particles(x, y, tex, {
        speed: { min: 40, max: 130 }, angle: { min: 200, max: 340 }, lifespan: 450,
        gravityY: 320, scale: { start: 1, end: 0 }, quantity: n, emitting: false,
      }).setDepth(y + 50);
      p.explode(n);
      scene.time.delayedCall(600, () => p.destroy());
    }
    function chop(h) {
      // bare hands are slow (8 hits for a tree, 10 for rock); the right tool
      // triples your damage so gathering is much faster with an Axe / Pickaxe
      const dmg = (h.kind === 'tree' && inv.has('axe')) || (h.kind === 'rock' && inv.has('pickaxe')) ? 3 : 1;
      h.hp -= dmg;
      // shake + a couple of flying chips on each hit
      scene.tweens.add({ targets: h.spr, angle: { from: -6, to: 6 }, duration: 70, yoyo: true, onComplete: () => h.spr.setAngle(0) });
      chipBurst(h.spr.x, h.spr.y - 14, h.kind === 'rock' ? 'schip' : 'chip', 4);
      if (h.kind === 'tree' || h.kind === 'bush') SFX.chop(); else SFX.mine();
      if (h.hp <= 0) {
        const gm = meta.gatherMult(), luck = 1 + meta.luckAdd();
        const fx = h.spr.x, fy = h.spr.y - 26;
        if (h.kind === 'tree') {
          const n = Math.round((2 + (Math.random() * 2 | 0)) * gm); inv.add('wood', n); bumpStat('wood', n);
          if (Math.random() < 0.4 * luck) inv.add('fiber', 1);
          if (Math.random() < 0.18 * luck) inv.add('mushroom', 1);
          floatNumber(scene, fx, fy, '+' + n + ' Wood', '#caa56a'); awardPlayerXp(2);
        } else if (h.kind === 'bush') {
          const n = Math.round((1 + (Math.random() * 2 | 0)) * gm) || 1; inv.add('berry', n);
          if (Math.random() < 0.35 * luck) inv.add('herb', 1);
          floatNumber(scene, fx, fy, '+' + n + ' Berry', '#ff8fa0'); awardPlayerXp(1);
        } else {
          const n = Math.round((2 + (Math.random() * 2 | 0)) * gm); inv.add('stone', n); bumpStat('stone', n);
          if (Math.random() < 0.16 * luck) inv.add('iron', 1);
          if (Math.random() < 0.04 * luck) { inv.add('crystal', 1); floatNumber(scene, fx, fy - 14, 'Crystal!', '#3fd2e6'); }
          if (Math.random() < 0.07 * luck) { inv.add('evostone', 1); floatNumber(scene, fx, fy - 14, 'Evolve Stone!', '#b088ff'); }
          floatNumber(scene, fx, fy, '+' + n + ' Stone', '#b9b3a8'); awardPlayerXp(2);
        }
        SFX.pickup();
        chipBurst(h.spr.x, h.spr.y - 14, h.kind === 'rock' ? 'schip' : 'chip', 8);
        h.spr.setVisible(false); ui.refreshHotbar(); ui.updateResources();
        const reHp = h.kind === 'tree' ? 8 : h.kind === 'bush' ? 3 : 10;
        scene.time.delayedCall(45000, () => { h.hp = reHp; h.spr.setVisible(true).setScale(h.baseScale).setAngle(0); });
      }
    }

    function throwBall() {
      if (!player.alive || ui.openPanel || build.active) return;
      let ball = ui.selectedItem();
      if (!ITEMS[ball] || ITEMS[ball].kind !== 'ball' || !inv.has(ball)) ball = ['masterball', 'ultraball', 'greatball', 'ball'].find((b) => inv.has(b));
      if (!ball) { ui.toast('No balls — craft some (C)!', '#ff8787'); return; }
      const c = nearestCreature(260);
      if (!c) { ui.toast('No target in range.', '#ff8787'); return; }
      if (c.capturing) { ui.toast('That one is already in a ball…', '#ff8787'); return; }   // prevents double-catch / duplicates
      inv.remove(ball, 1); ui.refreshHotbar();
      // show the ACTUAL ball you threw in flight (Great/Ultra have their own art;
      // Master Ball has no sprite asset, so use the base ball tinted purple)
      const ballTex = scene.textures.exists(ball) ? ball : 'ball';
      const ballSpr = scene.add.image(player.x, player.y - 10, ballTex).setDepth(8000).setScale(0.32);
      if (ball === 'masterball') ballSpr.setTint(0xc060ff);
      SFX.throw();
      const mult = ITEMS[ball].mult || 1;
      const luck = (hasBuff('lucky') ? BUFFS.lucky.catchBonus : 0) + inv.catchBonus() + meta.catchAdd()
        + (meta.combo.key === c.key ? Math.min(0.2, meta.combo.count * 0.02) : 0);
      // bigger species (and higher-level creatures) are much harder to catch
      const sizeFactor = Phaser.Math.Clamp(1.7 - c.sp.scale * 0.45, 0.35, 1);   // ~1.0 small → ~0.44 huge
      const lvlFactor = Phaser.Math.Clamp(1 - c.level * 0.01, 0.5, 1);
      // Master Ball never fails; Alphas are much harder to catch
      const chance = ball === 'masterball' ? 1
        : Math.min(0.97, c.sp.catch * mult * (1.85 - c.hpFrac()) * (c.alpha ? 0.5 : 1) * sizeFactor * lvlFactor + (c.hpFrac() < 0.3 ? 0.28 * sizeFactor : 0) + luck);
      const success = Math.random() < chance;
      c.capturing = true;
      S.state.balls.push({ spr: ballSpr, c, ball, phase: 'fly', t: 0, timer: 0, wob: 0,
        x0: player.x, y0: player.y - 10, success, wobbles: success ? 3 : (Math.random() < 0.5 ? 1 : 2) });
    }

    function nearShop() { return Phaser.Math.Distance.Between(player.x, player.y, shopX, shopY) < 80; }
    function interact() {
      if (ui.openPanel) { ui.close(); return; }
      if (nearShop()) { ui.toggle('shop'); SFX.select(); return; }
      eat();
    }
    scene._nearShop = nearShop;

    function eat() {
      if (ui.openPanel) return;
      const sel = ui.selectedItem();
      // a potion selected on the hotbar heals your lead creature instead
      if (ITEMS[sel] && ITEMS[sel].kind === 'potion' && inv.has(sel)) {
        const lead = inv.lead();
        if (!lead) { ui.toast('No creature to heal.', '#ff8787'); return; }
        const healed = inv.healLead(ITEMS[sel].heal);
        if (healed <= 0) { ui.toast('Lead is already at full HP.', '#ff8787'); return; }
        inv.remove(sel, 1); SFX.eat(); ui.updatePartyDock(); ui.refreshHotbar();
        ui.toast(`${SPECIES[lead.key].name} +${healed} HP`, '#b8f25f');
        return;
      }
      const food = (ITEMS[sel] && ITEMS[sel].kind === 'food' && inv.has(sel)) ? sel
        : ['stew', 'grilledfish', 'berrypie', 'jerky', 'berry'].find((f) => inv.has(f));
      if (!food) { ui.toast('Nothing to eat.', '#ff8787'); return; }
      inv.remove(food, 1);
      player.hp = Math.min(player.maxHp, player.hp + ITEMS[food].heal);
      player.hunger = Math.min(player.maxHunger, player.hunger + ITEMS[food].hunger); SFX.eat();
      ui.toast('Ate ' + ITEMS[food].name, '#b8f25f'); ui.refreshHotbar();
      if (ITEMS[food].buff) applyBuff(ITEMS[food].buff);
    }

    function removeCreature(c) {
      const i = creatures.indexOf(c); if (i >= 0) creatures.splice(i, 1);
      c.container.destroy(); ui.setTarget(null);
    }
    scene._removeCreature = removeCreature;

    // defeat an aggressive/Alpha creature for loot & gold (instead of catching it)
    function defeatCreature(c) {
      // ---- world boss: a fortune in gold, guaranteed stones, a shot at a Master Ball ----
      if (c.boss) {
        const gold = Math.round((300 + c.level * 12) * meta.goldMult());
        inv.addGold(gold);
        const evos = 3 + (Math.random() * 3 | 0); inv.add('evostone', evos);
        let drops = `${gold}g, ${evos} Evolve Stone`;
        if (Math.random() < 0.5) { inv.add('masterball', 1); drops += ', Master Ball'; }
        if (Math.random() < 0.6) { const n = 2 + (Math.random() * 3 | 0); inv.add('crystal', n); drops += `, ${n} Crystal`; }
        bumpStat('defeated'); bumpStat('bosses'); inv.progress('gloamKills', 1);
        ui.toast(`GLOAMFANG slain! +${drops}`, '#ffd24a');
        ui.chat(`You felled the great Gloamfang! Spoils: ${drops}`, 'evt');
        SFX.boss(); SFX.daily();
        bigBanner('GLOAMFANG SLAIN', drops, '#ffd24a'); screenFlash(scene, 0xffd24a, 0.55);
        burst(scene, c.x, c.y - 10, 0xffd24a, 40, 220);
        floatNumber(scene, c.x, c.y - 30, '+' + gold + 'g', '#ffd24a', 18);
        awardXp(40 + c.level); awardPlayerXp(30 + c.level);
        S.state.boss = null;
        inv.see(c.key); removeCreature(c);
        ui.refreshHotbar(); ui.updateResources(); checkAch();
        return;
      }
      const isAlpha = c.alpha;
      const goldDrop = Math.round(((isAlpha ? 45 : 6) + c.level + (Math.random() * 8 | 0)) * meta.goldMult());
      inv.addGold(goldDrop);
      let drops = `${goldDrop}g`;
      if (Math.random() < 0.75) { const n = 1 + (Math.random() * 2 | 0); inv.add('hide', n); drops += `, ${n} Hide`; }
      if (Math.random() < 0.4) { inv.add('herb', 1); drops += ', Herb'; }
      if (isAlpha && Math.random() < 0.7) { inv.add('evostone', 1); drops += ', Evolve Stone'; }
      ui.toast(`Defeated ${isAlpha ? 'Alpha ' : ''}${c.sp.name}! +${drops}`, '#ffd24a');
      ui.chat(`You defeated ${isAlpha ? 'the Alpha ' : ''}${c.sp.name}! Loot: ${drops}`, 'evt');
      SFX.catch(); SFX.coin();
      floatNumber(scene, c.x, c.y - 24, '+' + goldDrop + 'g', '#ffd24a');
      const pf = scene.add.particles(c.x, c.y - 10, 'schip', { speed: { min: 60, max: 180 }, lifespan: 500, scale: { start: 1.4, end: 0 }, quantity: 14, tint: 0xffd24a, emitting: false }).setDepth(c.y + 60);
      pf.explode(14); scene.time.delayedCall(650, () => pf.destroy());
      bumpStat('defeated'); if (isAlpha) bumpStat('bosses');
      awardXp(8 + c.level); awardPlayerXp(6 + c.level);
      inv.see(c.key); removeCreature(c);
      ui.refreshHotbar(); ui.updateResources(); checkAch();
    }
    scene._defeatCreature = defeatCreature;

    // ---------- death, respawn & loot recovery ----------
    function onPlayerDeath() {
      SFX.death();
      dropLoot(player.x, player.y);
      ui.chat('You collapsed! Your loot dropped where you fell — go reclaim it.', 'sys');
      document.getElementById('dead').classList.remove('hidden');
    }
    // drop all carried items (keep your tools) as a reclaimable pile at (x,y)
    function dropLoot(x, y) {
      const items = {};
      for (const [k, def] of Object.entries(ITEMS)) {
        if (def.kind === 'tool') continue;                 // keep axe/pickaxe/rod/lantern
        const n = inv.count(k);
        if (n > 0) { items[k] = n; inv.remove(k, n); }
      }
      ui.refreshHotbar(); ui.updateResources();
      if (!Object.keys(items).length) return;
      const spr = scene.add.image(x, y, 'loot').setOrigin(0.5, 0.85).setDepth(y);
      scene.tweens.add({ targets: spr, y: y - 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const label = scene.add.text(x, y - 34, '⚑ YOUR LOOT', { fontFamily: 'monospace', fontSize: '10px', color: '#ffd24a', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(60000);
      S.state.piles.push({ x, y, items, spr, label });
    }
    // respawn at the village campfire — keep all progress, heal up, restore your team
    function respawn() {
      player.hp = player.maxHp; player.hunger = player.maxHunger; player.stamina = player.maxStamina;
      player.x = vcx; player.y = vcy + 44; player.alive = true;
      inv.party.forEach((m) => { m.hp = m.maxHp; }); inv.save();
      S.state.dead = false; S.state.lastHp = player.hp; S.state.atkCd = 0;
      document.getElementById('dead').classList.add('hidden');
      ui.updatePartyDock(); rebuildFollowers();
      ui.chat('You wake by the campfire. Your progress is safe — go reclaim your loot.', 'sys'); SFX.levelup();
    }
    scene._onPlayerDeath = onPlayerDeath; scene._respawn = respawn;
    const respawnBtn = document.getElementById('respawn-btn');
    if (respawnBtn) respawnBtn.onclick = respawn;

    function nearFire() { for (const f of build.fires) if (Phaser.Math.Distance.Between(player.x, player.y, f.x, f.y) < 90) return true; return false; }
    function nearWater() { return Phaser.Math.Distance.Between(player.x, player.y, LAKE.x, LAKE.y) < LAKE.r + 46; }
    scene._nearFire = nearFire;

    // cast a line at the lake — needs a Fishing Rod; yields fish & rare finds
    function fish() {
      if (S.state.fishing > 0) return;
      if (!inv.has('fishingrod')) { ui.toast('You need a Fishing Rod — craft one (C).', '#ff8787'); return; }
      S.state.fishing = 1.5;
      ui.toast('Casting…', '#7ad0ff'); SFX.throw();
      scene.time.delayedCall(1450, () => {
        const total = FISH.reduce((s, f) => s + f.w, 0);
        let r = Math.random() * total, pick = FISH[0];
        for (const f of FISH) { if ((r -= f.w) <= 0) { pick = f; break; } }
        inv.add(pick.item, pick.qty); bumpStat('fished', 1); awardPlayerXp(3);
        ui.toast(`Reeled in ${pick.qty}× ${ITEMS[pick.item].name}!`, '#7ad0ff'); SFX.pickup();
        ui.refreshHotbar(); ui.updateResources();
      });
    }
    scene._fish = fish; scene._nearWater = nearWater;

    // periodic world events keep the world surprising
    function triggerEvent() {
      const r = Math.random();
      if (r < 0.34) {
        scene._shinyRate = 1 / 16; S.state.shinyUntil = 60;
        ui.chat('★ A meteor shower lights the sky — shiny creatures are everywhere!', 'evt'); SFX.shiny();
        ui.toast('Meteor Shower — shinies abound!', '#ffd24a');
      } else if (r < 0.67) {
        for (let i = 0; i < 6; i++) scene._spawnCreature();
        ui.chat('A swarm of creatures gathers nearby!', 'evt'); ui.toast('Creature swarm!', '#b8f25f');
      } else {
        const before = scene._alphaRate; scene._alphaRate = 1; scene._spawnCreature(); scene._alphaRate = before;
        ui.chat('⚠ An Alpha creature prowls nearby — fight it for a bounty, or flee!', 'evt'); SFX.hurt();
        ui.toast('Alpha sighting!', '#ff8787');
      }
    }
    scene._triggerEvent = triggerEvent;

    // ---- world boss: the namesake "Gloamfang" prowls in periodically ----
    function spawnBoss() {
      if (S.state.boss && creatures.includes(S.state.boss)) return;   // only one at a time
      const keys = BOSS_POOL.filter((k) => SPECIES[k]);
      const key = keys[(Math.random() * keys.length) | 0] || Object.keys(SPECIES)[0];
      const ang = Math.random() * Math.PI * 2, rad = 380;
      const x = Phaser.Math.Clamp(player.x + Math.cos(ang) * rad, 60, WORLD_W - 60);
      const y = Phaser.Math.Clamp(player.y + Math.sin(ang) * rad, 60, WORLD_H - 60);
      const lvl = Phaser.Math.Clamp(dangerLevel(player.x, player.y) + BOSS.lvlBonus + (inv.plevel | 0) + meta.ascension * 5, 22, 100);
      const c = makeCreature(scene, key, lvl, x, y, false, true);
      creatures.push(c); S.state.boss = c;
      ui.chat('⚠ GLOAMFANG prowls the gloam — a monstrous boss has appeared! Slay it for a fortune.', 'sys');
      ui.toast('Gloamfang has appeared!', '#ff6a6a');
      SFX.boss(); screenFlash(scene, 0x6a1e8a, 0.5);
      bigBanner('GLOAMFANG', 'A world boss prowls nearby — hunt it down', '#c9a0ff');
    }
    scene._spawnBoss = spawnBoss;

    // ---- step-hatched egg: a free random creature for exploring ----
    function hatchEgg() {
      if (!meta.takeEgg()) return;
      const pool = Object.entries(SPECIES).filter(([, sp]) => !sp.legendary).map(([k, sp]) => [k, rarityWeight[sp.rarity] || 0.3]);
      let r = Math.random() * pool.reduce((s, p) => s + p[1], 0), key = pool[0][0];
      for (const [k, w] of pool) { if ((r -= w) <= 0) { key = k; break; } }
      const sp = SPECIES[key];
      const lvl = Phaser.Math.Clamp(3 + Math.floor(inv.plevel * 0.5) + (Math.random() * 4 | 0), 3, 60);
      const iv = Math.max(EGG.ivFloor, Math.random());
      const shiny = Math.random() < (1 / 200) * EGG.shinyBonus * meta.shinyMult();
      const maxHp = Math.round(sp.hp * (1 + lvl * 0.08) * ivHpMult(iv));
      inv.capture({ key, level: lvl, maxHp, shiny, gloam: false, iv });
      inv.progress('hatched', 1);
      SFX.egg(); screenFlash(scene, 0xffe9b0, 0.4);
      burst(scene, player.x, player.y - 14, shiny ? 0xffe066 : 0xb8f25f, 22);
      bigBanner('EGG HATCHED!', `${sp.name}${shiny ? ' ✦' : ''} · Lv ${lvl} · ${Math.round(iv * 100)}% power`, shiny ? '#ffe066' : '#b8f25f');
      ui.chat(`Your egg hatched into ${sp.name}${shiny ? ' (shiny!)' : ''}!`, 'evt');
      ui.toast(`Egg hatched: ${sp.name}!`, '#b8f25f');
      S.state.stats.species = inv.dexCaught.size; bumpStat('species', 0); dexMilestone();
      rebuildFollowers(); ui.updatePartyDock(); ui.refreshHotbar(); checkAch();
    }
    scene._hatchEgg = hatchEgg;

    // reconcile remote players from the latest server roster (multiplayer)
    function syncRemotes() {
      const seen = new Set();
      for (const p of S.state.roster) {
        if (p.id === MY_ID) continue;
        seen.add(p.id);
        let r = S.state.remotes.get(p.id);
        if (!r) {
          const spr = scene.add.image(p.x, p.y, 'player').setDepth(p.y);
          const label = scene.add.text(p.x, p.y - 52, p.name, { fontFamily: 'monospace', fontSize: '11px', color: '#7ad0ff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(60000);
          r = { spr, label, tx: p.x, ty: p.y }; S.state.remotes.set(p.id, r);
        }
        r.tx = p.x; r.ty = p.y;
        r.label.setText(p.name || 'Wanderer').setColor('#7ad0ff');
        if (p.shirt) r.spr.setTint(p.shirt); else r.spr.clearTint();
      }
      for (const [id, r] of S.state.remotes) {
        if (!seen.has(id)) { r.spr.destroy(); r.label.destroy(); S.state.remotes.delete(id); continue; }
        r.spr.x = Phaser.Math.Linear(r.spr.x, r.tx, 0.2);
        r.spr.y = Phaser.Math.Linear(r.spr.y, r.ty, 0.2);
        r.spr.setDepth(r.spr.y);
        r.label.setPosition(r.spr.x, r.spr.y - 52).setDepth(r.spr.y + 1000);
      }
    }
    scene._syncRemotes = syncRemotes;

    // ---------- building ----------
    function toggleBuild() {
      build.active = !build.active;
      if (build.active) { build.ghost = scene.add.image(0, 0, 'b_' + build.type).setAlpha(0.6).setDepth(7000); ui.toast(`Build: ${BUILDINGS[build.type].name}  ( , / . cycle · 1-8 quick · R rotate )`, '#b8f25f'); }
      else if (build.ghost) { build.ghost.destroy(); build.ghost = null; }
    }
    function cycleBuild(dir) {
      if (!build.active) return;
      const types = Object.keys(BUILDINGS);
      build.type = types[(types.indexOf(build.type) + dir + types.length) % types.length];
      const def = BUILDINGS[build.type];
      ui.toast('Build: ' + def.name + (def.unlock ? ` (needs ${def.unlock} species)` : ''), '#b8f25f');
    }
    function buildTarget() { return { x: player.x + player.face.x * 56, y: player.y + player.face.y * 56 }; }
    function placeBuild() {
      const def = BUILDINGS[build.type];
      if (def.unlock && inv.dexCaught.size < def.unlock) { ui.toast(`${def.name} locked — register ${def.unlock} species.`, '#ff8787'); return; }
      if (!inv.canCraft({ cost: def.cost })) { ui.toast('Not enough resources', '#ff8787'); return; }
      for (const [k, v] of Object.entries(def.cost)) inv.remove(k, v);
      const t = buildTarget();
      const m = scene.add.image(t.x, t.y, 'b_' + build.type).setDepth(t.y);
      build.placed.push(m);
      inv.addBuilding(build.type, t.x, t.y);   // structures persist across sessions
      if (def.light) {
        const light = scene.add.pointlight(t.x, t.y - 6, 0xff7a20, 38, 0.28); light.setDepth(t.y);
        build.lights.push(light);
      }
      if (def.fire) build.fires.push({ x: t.x, y: t.y });   // enables cooking nearby
      if (def.produces) {
        S.state.producers.push({ type: build.type, x: t.x, y: t.y, timer: def.produces.every * meta.farmFactor(), item: def.produces.item });
        ui.chat(`${def.name} built — it produces ${ITEMS[def.produces.item].name} automatically.`, 'evt');
        bumpStat('farms');
      }
      ui.toast('Placed ' + def.name, '#b8f25f'); ui.refreshHotbar(); ui.updateResources(); SFX.build();
      bumpStat('built');
    }
    scene._toggleBuild = toggleBuild; scene._placeBuild = placeBuild; scene._buildState = build;
    scene._buildTarget = buildTarget; scene._spawnCreature = spawnCreature;
    scene._nearestCreature = nearestCreature;

    // rebuild a returning player's persisted base (sprites, lights, fires, producers)
    function restoreBuildings() {
      for (const b of inv.buildings) {
        const def = BUILDINGS[b.type]; if (!def) continue;
        const m = scene.add.image(b.x, b.y, 'b_' + b.type).setDepth(b.y);
        build.placed.push(m);
        if (def.light) { const light = scene.add.pointlight(b.x, b.y - 6, 0xff7a20, 38, 0.28); light.setDepth(b.y); build.lights.push(light); }
        if (def.fire) build.fires.push({ x: b.x, y: b.y });
        if (def.produces) S.state.producers.push({ type: b.type, x: b.x, y: b.y, timer: def.produces.every * meta.farmFactor(), item: def.produces.item });
      }
    }
    scene._restoreBuildings = restoreBuildings;

    // first-time players pick a starter; returning players keep their team
    const showTutorialOnce = () => {
      if (localStorage.getItem('mythara3d_tutorial')) return;
      localStorage.setItem('mythara3d_tutorial', '1');
      scene.time.delayedCall(400, () => ui.openHowto());
    };
    if (!inv.party.length && !localStorage.getItem('mythara3d_starter')) {
      ui.showStarterSelect((key) => {
        inv.starter(key);
        localStorage.setItem('mythara3d_starter', '1');
        S.state.stats.species = inv.dexCaught.size; scene._refreshQuest();
        spawnFollower(inv.party[0]);
        ui.updatePartyDock();
        ui.chat(`You chose ${SPECIES[key].name} as your partner!`, 'evt');
        ui.toast(`${SPECIES[key].name} joined you!`, '#b8f25f'); SFX.levelup();
        showTutorialOnce();
      });
    } else {
      inv.outMembers().forEach((m) => spawnFollower(m));
      showTutorialOnce();
    }

    loadAllSprites(scene, creatures);

    // ---- returning player: rebuild the persisted base, advance the daily
    // login streak / dailies, then pay out idle ("while you were away") output ----
    restoreBuildings();
    meta.rollDay(inv);
    const offlineReport = meta.claimOffline(
      inv.buildings.map((b) => BUILDINGS[b.type]).filter((d) => d && d.produces).map((d) => ({ item: d.produces.item, every: d.produces.every })),
      inv);
    meta.touch();
    applyMeta();
    ui.refreshHotbar(); ui.updateResources(); ui.updatePartyDock();
    if (ui.updateEgg) ui.updateEgg(meta.eggFrac());
    scene.time.delayedCall(750, () => {
      const streak = meta.pendingStreak; meta.pendingStreak = null;
      if (streak) ui.showStreak(streak, offlineReport);
      else if (offlineReport) ui.showOffline(offlineReport);
    });
    window.addEventListener('beforeunload', () => { try { meta.touch(); } catch (e) {} });

    // ----- multiplayer presence -----
    if (MODE === 'multiplayer') {
      const net = new Net(ROOM, MY_ID, (players) => { S.state.roster = players || []; });
      net.connect();
      S.state.net = net;
      ui.chat(`Multiplayer online in room ${ROOM} as ${IDENTITY.label || PLAYER_NAME}.`, 'sys');
      ui.chat(`Share code ${ROOM} with friends — anyone who joins it shares your world.`, 'evt');
      window.addEventListener('beforeunload', () => net.close());
    } else {
      const nl = document.getElementById('netline'); if (nl) nl.textContent = '○ Offline · ' + PLAYER_NAME;
    }

    // tap the dark backdrop to dismiss an open panel (needed on mobile; handy on desktop)
    const ovEl = document.getElementById('overlay');
    if (ovEl) ovEl.addEventListener('pointerdown', () => { if (ui.openPanel && ui.openPanel !== 'starter') ui.close(); });

    // audio mute toggle (button + M key) — mutes SFX and music together
    const muteBtn = document.getElementById('mute-btn');
    const applyMute = (m) => { if (muteBtn) { muteBtn.textContent = m ? '♪̶' : '♪'; muteBtn.classList.toggle('muted', m); } };
    if (muteBtn) muteBtn.onclick = () => { sfxUnlock(); applyMute(toggleMute()); };
    scene.input.keyboard.on('keydown-M', () => { applyMute(toggleMute()); });

    // ----- mobile / touch controls (virtual joystick + action buttons) -----
    S.state.touchMove = { x: 0, y: 0 }; S.state.touchSprint = false;
    setupTouch();
    function setupTouch() {
      const TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      const tc = document.getElementById('touch-controls');
      if (!tc || !TOUCH) return;
      tc.classList.remove('hidden');
      document.body.classList.add('touch');
      const joy = document.getElementById('joystick'), stick = document.getElementById('stick');
      let cx = 0, cy = 0; const R = 46;
      const setVec = (dx, dy) => {
        const mag = Math.hypot(dx, dy) || 0.0001;
        const cl = Math.min(R, mag), nx = dx / mag, ny = dy / mag, m = cl / R;
        S.state.touchMove.x = nx * m; S.state.touchMove.y = ny * m;
        S.state.touchSprint = m > 0.85;
        stick.style.transform = `translate(${(nx * cl) | 0}px, ${(ny * cl) | 0}px)`;
      };
      const end = () => { S.state.touchMove.x = 0; S.state.touchMove.y = 0; S.state.touchSprint = false; stick.style.transform = 'translate(0,0)'; };
      joy.addEventListener('touchstart', (e) => { e.preventDefault(); sfxUnlock(); const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; const t = e.changedTouches[0]; setVec(t.clientX - cx, t.clientY - cy); }, { passive: false });
      joy.addEventListener('touchmove', (e) => { e.preventDefault(); const t = e.changedTouches[0]; setVec(t.clientX - cx, t.clientY - cy); }, { passive: false });
      joy.addEventListener('touchend', (e) => { e.preventDefault(); end(); }, { passive: false });
      joy.addEventListener('touchcancel', () => end());
      const doAct = (a) => { sfxUnlock(); if (a === 'act') act(); else if (a === 'ball') throwBall(); else if (a === 'interact') interact(); else if (a === 'build') toggleBuild(); };
      tc.querySelectorAll('.tbtn').forEach((b) => b.addEventListener('touchstart', (e) => { e.preventDefault(); doAct(b.dataset.act); }, { passive: false }));
      tc.querySelectorAll('.tmbtn').forEach((b) => b.addEventListener('touchstart', (e) => { e.preventDefault(); sfxUnlock(); ui.toggle(b.dataset.panel); }, { passive: false }));
    }

    window.MYTHARA = { scene, player, creatures, inv, sky, build, ui };
    window.__phase = 'create-done';
  }

  function update(time, deltaMs) {
    if (!S.state) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    const { scene, player, creatures, sky, overlay, flash, rain, snow, keys, build, balls, followers, minimap } = S.state;
    const sb = S.state.shopBox;
    const blockedByShop = (px, py) => Math.abs(px - sb.x) < sb.w / 2 && Math.abs(py - sb.y) < sb.h / 2;

    // ----- player movement -----
    let vx = 0, vy = 0;
    if (player.alive && !ui.openPanel) {
      if (keys.A.isDown || keys.LEFT.isDown) vx -= 1;
      if (keys.D.isDown || keys.RIGHT.isDown) vx += 1;
      if (keys.W.isDown || keys.UP.isDown) vy -= 1;
      if (keys.S.isDown || keys.DOWN.isDown) vy += 1;
      const tm = S.state.touchMove;            // virtual joystick (mobile)
      if (tm) { vx += tm.x; vy += tm.y; }
    }
    const sprint = (keys.SHIFT.isDown || S.state.touchSprint) && player.stamina > 1 && (vx || vy);
    const speedBuff = S.state.buffs.some((b) => b.key === 'energized') ? BUFFS.energized.speed : 1;
    const speed = ((sprint ? 215 : 125) + inv.speedBonus() + meta.speedAdd()) * speedBuff;
    if (vx || vy) {
      const len = Math.hypot(vx, vy); vx /= len; vy /= len;
      player.face = { x: vx, y: vy };
      const px0 = player.x, py0 = player.y;
      const nx = Phaser.Math.Clamp(player.x + vx * speed * dt, 16, WORLD_W - 16);
      const ny = Phaser.Math.Clamp(player.y + vy * speed * dt, 16, WORLD_H - 16);
      const solidAt = S.state.solidAt;
      if (!isWater(nx, player.y) && !blockedByShop(nx, player.y) && !solidAt(nx, player.y)) player.x = nx;
      if (!isWater(player.x, ny) && !blockedByShop(player.x, ny) && !solidAt(player.x, ny)) player.y = ny;
      // ---- steps fill the egg incubator & feed the "Travel" daily ----
      const moved = Math.hypot(player.x - px0, player.y - py0);
      if (moved > 0) {
        meta.addSteps(moved);
        if (meta.eggFrac() >= 1) scene._hatchEgg();
        S.state.stepBuf += moved;
        if (S.state.stepBuf >= 20) { const sc = Math.floor(S.state.stepBuf); S.state.stepBuf -= sc; scene._notifyDailies(meta.bumpDaily('steps', sc, inv)); }
      }
      player.walkT += dt * (sprint ? 18 : 12);
      // alternate the two walk frames so the legs step
      player.setTexture(Math.sin(player.walkT) >= 0 ? 'player_w0' : 'player_w1');
      player.setScale(1, 1 + Math.abs(Math.sin(player.walkT)) * 0.03);
      if (Math.abs(vx) > 0.1) player.setFlipX(vx < 0);
    } else { player.setTexture('player'); player.setScale(1, 1); }
    player.setDepth(player.y);

    // damage feedback: red flash + camera shake + flinch tint + hurt sfx
    const damageFx = () => {
      scene.cameras.main.shake(110, 0.005);
      const v = document.getElementById('vignette');
      v.classList.add('hit'); setTimeout(() => v.classList.remove('hit'), 280);  // red pulse at the screen edges only
      player.setTint(0xff6a6a);
      scene.time.delayedCall(160, () => player.clearTint());
      SFX.hurt();
    };

    // survival
    player.stamina = Phaser.Math.Clamp(player.stamina + (sprint ? -22 : 14) * dt, 0, player.maxStamina);
    const starving = player.hunger <= 0;
    player.hunger = Math.max(0, player.hunger - dt * 0.55);
    if (starving && player.alive) {
      // lose HP in discrete chunks (the red flash watcher reacts to each)
      S.state.starveT = (S.state.starveT || 0) - dt;
      if (S.state.starveT <= 0) { S.state.starveT = 1.3; player.hp = Math.max(0, player.hp - 4); ui.toast('Starving! Eat something (E).', '#ff8787'); }
      if (player.hp === 0) player.alive = false;
    } else if (player.hp < player.maxHp && player.hunger > 40) {
      player.hp = Math.min(player.maxHp, player.hp + dt * 1.2);
    }
    document.getElementById('vignette').classList.toggle('show', player.hp < player.maxHp * 0.3 || starving);

    // ----- food buffs: tick timers + apply passive effects -----
    for (let i = S.state.buffs.length - 1; i >= 0; i--) {
      const b = S.state.buffs[i]; b.remain -= dt;
      if (b.remain <= 0) { ui.chat(`${BUFFS[b.key].name} wore off.`); S.state.buffs.splice(i, 1); continue; }
      const def = BUFFS[b.key];
      if (def.hpRegen && player.alive && player.hp < player.maxHp && !starving) player.hp = Math.min(player.maxHp, player.hp + def.hpRegen * dt);
      if (def.stamRegen) player.stamina = Math.min(player.maxStamina, player.stamina + def.stamRegen * dt);
    }
    if (S.state.fishing > 0) S.state.fishing = Math.max(0, S.state.fishing - dt);
    if ((S.state.atkCd || 0) > 0) S.state.atkCd = Math.max(0, S.state.atkCd - dt);

    // ----- creatures -----
    S.state._spawnT = (S.state._spawnT || 0) - dt;
    if (S.state._spawnT <= 0) { S.state._spawnT = 1.8; scene._spawnCreature(); }
    for (let i = creatures.length - 1; i >= 0; i--) {
      const c = creatures[i];
      if (!c.capturing) c.update(dt, player);          // frozen while being caught
      if (!c.capturing && !c.boss && Phaser.Math.Distance.Between(c.x, c.y, player.x, player.y) > 1400) { c.container.destroy(); creatures.splice(i, 1); }
    }

    // ----- combat: aggressive creatures attack; Alphas hit brutally hard -----
    for (const c of creatures) {
      if (!c.isAggressive() || c.capturing) continue;
      c.atkCd -= dt;
      if (c.atkCd <= 0 && player.alive && Phaser.Math.Distance.Between(c.x, c.y, player.x, player.y) < 32) {
        c.atkCd = c.alpha ? 0.9 : 1.1;
        const lead = inv.lead();
        if (lead && lead.hp > 0) {
          // your front creature takes the blow — an Alpha / boss bite is a 1–2 shot kill
          const dmg = (c.alpha || c.boss) ? Math.round(lead.maxHp * (0.5 + Math.random() * 0.3)) : Math.round(6 + c.level * 0.4 + c.sp.atk * 0.05);
          lead.hp = Math.max(0, lead.hp - dmg);
          if (lead.hp <= 0) {
            const dead = inv.killLead();           // creatures can die for good
            if (dead) { ui.toast(`${SPECIES[dead.key].name} was knocked out!`, '#ff8787'); ui.chat(`${SPECIES[dead.key].name} fell in battle.`, 'evt'); SFX.hurt(); }
            scene._rebuildFollowers();
          }
          ui.updatePartyDock();
        } else if (player.alive) {
          // nothing out to defend you → you take it directly (Alphas / boss 1–2 shot you too)
          const dmg = (c.alpha || c.boss) ? Math.round(player.maxHp * (0.45 + Math.random() * 0.25)) : Math.round(5 + c.level * 0.4 + c.sp.atk * 0.05);
          player.hp = Math.max(0, player.hp - dmg);
          if (player.hp === 0) player.alive = false;
        }
      }
    }
    // lead auto-retaliation against the nearest aggressor
    S.state.retalCd -= dt;
    const rLead = inv.lead();
    if (S.state.retalCd <= 0 && rLead && rLead.hp > 0 && player.alive) {
      let tgt = null, td = 150;
      for (const c of creatures) { if (!c.isAggressive() || c.capturing) continue; const d = Phaser.Math.Distance.Between(c.x, c.y, player.x, player.y); if (d < td) { td = d; tgt = c; } }
      if (tgt) {
        S.state.retalCd = 1.0;
        const mult = typeMult(SPECIES[rLead.key].types[0], tgt.sp.types);
        const dealt = Math.max(2, Math.round((10 + rLead.level + inv.gatherBonus()) * mult * (tgt.alpha ? 0.7 : 1)));
        tgt.hp = Math.max(0, tgt.hp - dealt); tgt.showBar();
        attackFx(scene, player.x, player.y - 14, tgt.x, tgt.y - 8, SPECIES[rLead.key].types[0]);
        if (tgt.hp <= 0) scene._defeatCreature(tgt);
      }
    }
    // red edge-flash fires exactly when the player's HP drops (any source)
    if (player.alive && player.hp < (S.state.lastHp == null ? player.hp : S.state.lastHp) - 0.5) damageFx();
    S.state.lastHp = player.hp;

    // ----- thrown balls: full capture sequence (fly → suck in → wobble → result) -----
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i], c = b.c;
      if (!creatures.includes(c)) { b.spr.destroy(); balls.splice(i, 1); continue; }

      if (b.phase === 'fly') {
        b.t += dt * 2.6;
        b.spr.x = Phaser.Math.Linear(b.x0, c.x, b.t);
        b.spr.y = Phaser.Math.Linear(b.y0, c.y - 14, b.t) - Math.sin(b.t * Math.PI) * 52;
        b.spr.rotation += dt * 16;
        if (b.t >= 1) { b.phase = 'suck'; b.timer = 0; b.spr.setRotation(0).setPosition(c.x, c.y - 12).setScale(0.36); }
      } else if (b.phase === 'suck') {
        b.timer += dt; const k = Math.min(1, b.timer / 0.22);
        c.spr.setTintFill(0xff5a5a); c.spr.setScale(c.base * (1 - k)).setAlpha(1 - k);
        c.shadow.setScale(1 - k);
        if (k >= 1) { c.container.setVisible(false); b.phase = 'wobble'; b.timer = 0; b.wob = 0; b.spr.setPosition(c.x, c.y); }
      } else if (b.phase === 'wobble') {
        b.timer += dt;
        b.spr.rotation = Math.sin(b.timer * 11) * 0.4 * Math.max(0, 1 - b.timer / 0.45);
        if (b.timer >= 0.62) { b.timer = 0; b.wob++; SFX.click(); if (b.wob >= b.wobbles) b.phase = 'result'; }
      } else { // result
        b.spr.setRotation(0);
        if (b.success) {
          const chain = meta.bumpCombo(c.key);
          inv.progress('bestChain', meta.bestCombo, 'max');
          const pf = scene.add.particles(c.x, c.y - 10, 'flake', { speed: { min: 50, max: 160 }, lifespan: 520, scale: { start: 1.5, end: 0 }, quantity: 16, tint: 0xffe066, emitting: false }).setDepth(c.y + 60);
          pf.explode(16); scene.time.delayedCall(650, () => pf.destroy());
          const wasNew = !inv.dexCaught.has(c.key);
          const ivPct = Math.round((c.iv == null ? 0.5 : c.iv) * 100);
          inv.capture(c); scene._removeCreature(c);
          if (c.boss) S.state.boss = null;
          ui.toast(`Gotcha! ${c.alpha ? 'Alpha ' : ''}${c.sp.name} caught! (${ivPct}%)`, '#b8f25f'); SFX.catch();
          ui.chat(`You caught ${c.alpha ? 'an Alpha ' : ''}${c.sp.name}${c.shiny ? ' (shiny!)' : ''} — ${ivPct}% power!`, 'evt');
          ui.refreshHotbar(); ui.updatePartyDock();
          scene._rebuildFollowers();
          scene._awardXp(6 + c.level + chain * 2); scene._awardPlayerXp(5 + c.level); scene._bumpStat('caught');
          if (chain >= 2) { SFX.combo(chain); floatNumber(scene, player.x, player.y - 42, 'Chain x' + chain, '#7ad0ff'); }
          if (c.alpha) scene._bumpStat('bosses');
          if (wasNew) { S.state.stats.species = inv.dexCaught.size; scene._bumpStat('species', 0); scene._dexMilestone(); }
          // Legendary catches get a permanent, timestamped record. It's the
          // proof a bounty claim rests on, so it has to survive a reload.
          if (c.sp.legendary) {
            const rec = logLegendCatch(c, ivPct);
            if (S.state.legend === c) S.state.legend = null;
            bigBanner('LEGENDARY CAUGHT', `${c.sp.name} · ${ivPct}% power · ${rec.stamp}`, '#ffd24a');
            ui.chat(`✦ ${c.sp.name} caught at ${rec.stamp} (UTC). Screenshot this line to claim a bounty.`, 'evt');
            screenFlash(scene, 0xffd24a, 0.6); burst(scene, c.x, c.y, 0xffd24a, 36); SFX.perfect();
          }
          // spectacle for the rare ones
          if (c.gloam) { bigBanner('GLOAMTOUCHED!', `${c.sp.name} · ${ivPct}% power`, '#c9a0ff'); screenFlash(scene, 0xc9a0ff, 0.55); burst(scene, c.x, c.y, 0xc9a0ff, 32); SFX.perfect(); }
          else if (c.shiny) { bigBanner('✦ SHINY ✦', `${c.sp.name} · ${ivPct}% power`, '#ffe066'); screenFlash(scene, 0xffe066, 0.5); burst(scene, c.x, c.y, 0xffe066, 28); SFX.perfect(); }
          else if (ivPct >= 96) { bigBanner('PERFECT!', `${c.sp.name} · ${ivPct}% power`, '#b8f25f'); screenFlash(scene, 0xb8f25f, 0.45); SFX.perfect(); }
          ui.updateCombo && ui.updateCombo(meta.combo);
          scene._checkAch();
        } else {
          c.container.setVisible(true);
          if (c.gloam) c.spr.setTint(0xc9a0ff); else if (c.shiny) c.spr.setTint(0xfff3a0); else if (c.boss) c.spr.setTint(0x9a5ad0); else if (c.alpha) c.spr.setTint(0xff9a5a); else c.spr.clearTint();
          c.spr.setScale(c.base).setAlpha(1); c.shadow.setScale(1);
          c.capturing = false; c.flee(player);
          ui.toast(`${c.sp.name} broke free!`, '#ff8787'); SFX.fail();
        }
        b.spr.destroy(); balls.splice(i, 1);
      }
    }

    // ----- build ghost -----
    if (build.active && build.ghost) {
      const t = scene._buildTarget(); build.ghost.setPosition(t.x, t.y).setDepth(t.y + 1);
      build.ghost.setTint(inv.canCraft({ cost: BUILDINGS[build.type].cost }) ? 0x88ff88 : 0xff6666);
      if (build.ghost.texture.key !== 'b_' + build.type) build.ghost.setTexture('b_' + build.type);
    }
    for (const l of build.lights) l.intensity = 0.3 + Math.sin(time * 0.01) * 0.07 + Math.random() * 0.04;

    // ----- followers roam loosely, spread around the player (not a rigid line) -----
    for (let i = 0; i < followers.length; i++) {
      const f = followers[i];
      // give each follower its own resting angle/distance around you + a slow wander
      if (f.ang == null) { f.ang = i * 2.2 + Math.random() * 0.6; f.dist = 32 + Math.random() * 24; f.wx = 0; f.wy = 0; f.tw = 0; f.th = 0; f.wt = Math.random() * 2; }
      f.wt -= dt;
      if (f.wt <= 0) { f.wt = 1.6 + Math.random() * 2.4; f.tw = (Math.random() * 2 - 1) * 20; f.th = (Math.random() * 2 - 1) * 20; }
      f.wx = Phaser.Math.Linear(f.wx, f.tw, 0.04);     // drift smoothly toward a roaming offset
      f.wy = Phaser.Math.Linear(f.wy, f.th, 0.04);
      // resting spot: spread around the player, biased a touch behind your heading
      const bx = player.x - player.face.x * 16 + Math.cos(f.ang) * f.dist + f.wx;
      const by = player.y - player.face.y * 16 + Math.sin(f.ang) * f.dist + f.wy + 6;
      const ox = f.spr.x, oy = f.spr.y;
      const d = Phaser.Math.Distance.Between(f.spr.x, f.spr.y, bx, by);
      const rate = d > 150 ? 0.17 : d > 55 ? 0.085 : 0.03;   // hurry when far, amble when near
      f.spr.x = Phaser.Math.Linear(f.spr.x, bx, rate);
      f.spr.y = Phaser.Math.Linear(f.spr.y, by, rate);
      const movingF = Math.abs(f.spr.x - ox) + Math.abs(f.spr.y - oy) > 0.25;
      f.phase = (f.phase || i) + dt * 9;
      f.spr.rotation = movingF ? Math.sin(f.phase) * 0.12 : Phaser.Math.Linear(f.spr.rotation || 0, 0, 0.18);
      if (Math.abs(f.spr.x - ox) > 0.25) f.spr.setFlipX(f.spr.x < ox);
      f.spr.setDepth(f.spr.y);
      if (f.spr.texture.key !== f.key && scene.textures.exists(f.key)) f.spr.setTexture(f.key).setScale(SPECIES[f.member.key].scale * 0.4).setOrigin(0.5, footFrac(scene, f.key));
    }

    // ----- day/night + weather -----
    const prevT = sky.t;
    sky.t = (sky.t + dt / 240) % 1;
    if (sky.t < prevT) { S.state.day++; ui.chat(`Day ${S.state.day} dawns.`, 'sys'); scene._bumpStat('days'); inv.progress('days', S.state.day, 'max'); scene._checkAch(); }

    // ----- automated production buildings -----
    for (const pr of S.state.producers) {
      pr.timer -= dt;
      if (pr.timer <= 0) {
        pr.timer = BUILDINGS[pr.type].produces.every * meta.farmFactor();
        inv.add(pr.item, 1);
        const ft = scene.add.text(pr.x, pr.y - 30, '+1 ' + ITEMS[pr.item].name, { fontFamily: 'monospace', fontSize: '11px', color: '#b8f25f', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(30000);
        scene.tweens.add({ targets: ft, y: ft.y - 22, alpha: 0, duration: 1100, onComplete: () => ft.destroy() });
        ui.refreshHotbar(); ui.updateResources();
      }
    }
    // smooth, gentle night — a single cool tint that ramps in as the sun dips
    // (no hard dawn/dusk colour swaps, which made biomes look muddy)
    const up = Math.max(0, Math.sin((sky.t - 0.25) * Math.PI * 2));
    const night = Phaser.Math.Clamp(1 - up * 3, 0, 1);
    let darkness = night * 0.48;
    let tint = 0x0a1633;
    if (sky.weather === 'rain' || sky.weather === 'storm') { darkness = Math.max(darkness, 0.3); tint = 0x1e2a3c; }
    else if (sky.weather === 'snow') darkness = Math.max(darkness, 0.12);
    overlay.setFillStyle(tint, darkness);
    overlay.setPosition(scene.scale.width / 2, scene.scale.height / 2);
    overlay.setSize(scene.scale.width, scene.scale.height);

    // player light — ONLY a crafted Lantern lights your way at night
    // (no glow otherwise, so the player isn't wrapped in a washed-out blob)
    const pl = S.state.playerLight;
    pl.setPosition(player.x, player.y);
    const lanternOn = inv.has('lantern');
    pl.intensity = (lanternOn && night > 0.04) ? 0.5 : 0;
    pl.radius = 135;

    rain.emitting = sky.weather === 'rain' || sky.weather === 'storm';
    snow.emitting = sky.weather === 'snow';

    if (sky.weather === 'storm') {
      if (sky.lightning > 0) { sky.lightning -= dt * 4; flash.setAlpha(Math.max(0, sky.lightning) * 0.7); }
      else { flash.setAlpha(0); if (Math.random() < dt * 0.25) sky.lightning = 1; }
    } else flash.setAlpha(0);

    sky.wTimer -= dt;
    if (sky.wTimer <= 0) {
      sky.wTimer = 55; const r = Math.random();
      const w = r < 0.55 ? 'clear' : r < 0.75 ? 'rain' : r < 0.9 ? 'snow' : 'storm';
      if (w !== sky.weather) {
        sky.weather = w;
        ui.chat({ clear: 'The skies clear up.', rain: 'Rain begins to fall.', snow: 'Snow drifts down.', storm: 'A thunderstorm rolls in.' }[w]);
      }
    }

    // ----- random world events -----
    S.state.eventTimer -= dt;
    if (S.state.eventTimer <= 0) { S.state.eventTimer = 110 + Math.random() * 70; scene._triggerEvent(); }
    if ((S.state.shinyUntil || 0) > 0) { S.state.shinyUntil -= dt; if (S.state.shinyUntil <= 0) { scene._shinyRate = 1 / 200; ui.chat('The meteor shower fades.'); } }

    // ----- world boss cadence (the namesake Gloamfang) -----
    if (S.state.boss && !creatures.includes(S.state.boss)) S.state.boss = null;
    S.state.bossTimer -= dt;
    if (S.state.bossTimer <= 0 && !S.state.boss && player.alive) {
      S.state.bossTimer = BOSS.everyMin * 60 + Math.random() * 90;
      scene._spawnBoss();
    }

    // ----- catch-combo upkeep + live shiny boost for the chained species -----
    meta.tickCombo(dt);
    scene._comboKey = meta.combo.key;
    scene._comboShinyMult = meta.combo.key ? meta.comboShinyMult(meta.combo.key) : 1;

    // ----- keep "last seen" fresh so offline production accrues correctly -----
    S.state.metaTouch -= dt;
    if (S.state.metaTouch <= 0) { S.state.metaTouch = 15; meta.touch(); }

    // ----- ambient announcements (flavour, my own lines) -----
    S.state.annTimer -= dt;
    if (S.state.annTimer <= 0) {
      S.state.annTimer = 22 + Math.random() * 20;
      const sp = Object.values(SPECIES)[Math.floor(Math.random() * Object.keys(SPECIES).length)];
      const place = PLACE_NAMES[Math.floor(Math.random() * PLACE_NAMES.length)];
      const region = BIOME_NAMES[sp.biomes[0]] || 'the wilds';
      const shiny = Math.random() < 0.25 ? 'shiny ' : (sp.rarity === 'rare' ? 'rare ' : '');
      if (shiny) { ui.chat(`★ A ${shiny}${sp.name} appeared in ${region} near ${place}!`, 'evt'); SFX.shiny(); }
      else ui.chat(`A wild ${sp.name} was spotted near ${place}.`);
    }

    // ----- HUD -----
    if (!ui.openPanel && !build.active) ui.setTarget(scene._nearestCreature(140));
    else ui.setTarget(null);
    const biomeName = BIOME_NAMES[biomeAt(player.x, player.y)] || 'Wilds';
    ui.updateStats(player); ui.updateClock(sky, S.state.day, biomeName, dangerLevel(player.x, player.y), rareBonusAt(player.x, player.y));
    ui.updatePlayer(); ui.updateBuffs(S.state.buffs); ui.nearFire = scene._nearFire();
    if (ui.updateBoss) ui.updateBoss(S.state.boss);
    if (ui.updateCombo) ui.updateCombo(meta.combo);
    if (ui.updateEgg) ui.updateEgg(meta.eggFrac());
    // lead creature slowly recovers out of combat; refresh the dock ~1×/s
    const regenLead = inv.lead();
    if (regenLead && regenLead.hp > 0 && regenLead.hp < regenLead.maxHp) regenLead.hp = Math.min(regenLead.maxHp, regenLead.hp + dt * 1.6);
    S.state.dockTimer = (S.state.dockTimer || 0) - dt;
    if (S.state.dockTimer <= 0) { S.state.dockTimer = 1; ui.updatePartyDock(); }
    S.state.achTimer -= dt; if (S.state.achTimer <= 0) { S.state.achTimer = 4; scene._checkAch(); }

    // ----- multiplayer: broadcast self + render remote players -----
    if (S.state.mode === 'multiplayer' && S.state.net) {
      S.state.netSend -= dt;
      if (S.state.netSend <= 0) {
        S.state.netSend = 0.12;
        S.state.net.send({ name: S.state.playerName, x: Math.round(player.x), y: Math.round(player.y), shirt: AVATAR.shirt, hair: AVATAR.hair, skin: AVATAR.skin, lead: inv.lead() ? inv.lead().key : '' });
      }
      scene._syncRemotes();
      const nl = document.getElementById('netline');
      if (nl) nl.textContent = (S.state.net.online ? '● ' : '○ ') + 'Room ' + ROOM + ' · ' + (S.state.roster.length + 1) + (S.state.roster.length === 0 ? ' player' : ' players');
    }
    if (S.state.nameLabel) S.state.nameLabel.setPosition(player.x, player.y - 52).setDepth(player.y + 1000);

    // ----- reclaim dropped loot by walking over the pile -----
    for (let i = S.state.piles.length - 1; i >= 0; i--) {
      const p = S.state.piles[i];
      if (player.alive && Phaser.Math.Distance.Between(player.x, player.y, p.x, p.y) < 40) {
        const names = [];
        for (const [k, n] of Object.entries(p.items)) { inv.add(k, n); names.push(`${n} ${ITEMS[k].name}`); }
        ui.toast('Loot recovered!', '#b8f25f');
        ui.chat('Reclaimed: ' + names.slice(0, 5).join(', ') + (names.length > 5 ? '…' : ''), 'evt');
        SFX.pickup(); ui.refreshHotbar(); ui.updateResources();
        p.spr.destroy(); p.label.destroy(); S.state.piles.splice(i, 1);
      }
    }

    drawMinimap(minimap, player, creatures, S.state.stall, S.state.piles, S.state.boss, S.state.legend);
    // death is handled once: play the jingle, drop loot, show the respawn screen
    if (!player.alive && !S.state.dead) { S.state.dead = true; scene._onPlayerDeath(); }

    window.MYTHARA = { scene, player, creatures, inv, sky, build, ui };
  }
}

// ---------- minimap ----------
function buildMinimap() {
  const W = 90, H = 75;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const wx = px / W * WORLD_W, wy = py / H * WORLD_H;
      const b = biomeAt(wx, wy);
      const c = BIOME_COLORS[b][0];
      ctx.fillStyle = '#' + c.toString(16).padStart(6, '0');
      ctx.fillRect(px, py, 1, 1);
    }
  }
  return { cv, W, H, base: ctx.getImageData(0, 0, W, H) };
}
function drawMinimap(mm, player, creatures, stall, piles, boss, legend) {
  const out = document.getElementById('minimap');
  if (!out) return;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mm.cv, 0, 0, mm.W, mm.H, 0, 0, out.width, out.height);
  const sx = out.width / WORLD_W, sy = out.height / WORLD_H;
  // creatures
  ctx.fillStyle = '#ffffff88';
  for (const c of creatures) ctx.fillRect(c.x * sx - 1, c.y * sy - 1, 2, 2);
  // world boss — a pulsing purple beacon
  if (boss && creatures.includes(boss)) { ctx.fillStyle = '#c9a0ff'; ctx.fillRect(boss.x * sx - 3, boss.y * sy - 3, 7, 7); ctx.fillStyle = '#ffffff'; ctx.fillRect(boss.x * sx - 1, boss.y * sy - 1, 2, 2); }
  // sighted legendary — a gold beacon, same treatment as the world boss
  if (legend && creatures.includes(legend)) { ctx.fillStyle = '#ffd24a'; ctx.fillRect(legend.x * sx - 3, legend.y * sy - 3, 7, 7); ctx.fillStyle = '#ffffff'; ctx.fillRect(legend.x * sx - 1, legend.y * sy - 1, 2, 2); }
  // village stall
  if (stall) { ctx.fillStyle = '#ffd24a'; ctx.fillRect(stall.x * sx - 2, stall.y * sy - 2, 4, 4); }
  // dropped loot piles
  if (piles) { ctx.fillStyle = '#b8f25f'; for (const p of piles) ctx.fillRect(p.x * sx - 2, p.y * sy - 2, 5, 5); }
  // player
  ctx.fillStyle = '#ff5555'; ctx.fillRect(player.x * sx - 2, player.y * sy - 2, 5, 5);
}

// ============================================================
// Texture generation + creatures (module-scope helpers)
// ============================================================

function makeTextures(scene) {
  const g = scene.make.graphics({ add: false });

  // player: 3 frames (idle + two walk steps) so the legs actually move
  const SKIN = AVATAR.skin, HAIR = AVATAR.hair, SHIRT = AVATAR.shirt, SHIRT_D = shade(AVATAR.shirt), PANTS = AVATAR.pants, SHOE = 0x171b28;
  function drawPlayer(step) {
    g.clear();
    g.fillStyle(0x1a1f2e, 0.25); g.fillEllipse(16, 45, 18, 6);        // shadow
    // legs — step -1/0/+1 raises one leg and lowers the other
    const lL = 33 - step * 2, lR = 33 + step * 2;
    g.fillStyle(PANTS); g.fillRect(11, lL, 4, 9); g.fillRect(17, lR, 4, 9);
    g.fillStyle(SHOE); g.fillRect(10, lL + 8, 5, 3); g.fillRect(17, lR + 8, 5, 3);
    // arms swing opposite to legs
    g.fillStyle(SHIRT_D); g.fillRect(6, 23 + step * 2, 4, 8); g.fillRect(22, 23 - step * 2, 4, 8);
    g.fillStyle(SKIN); g.fillRect(6, 30 + step * 2, 4, 3); g.fillRect(22, 30 - step * 2, 4, 3);
    // torso
    g.fillStyle(SHIRT); g.fillRect(9, 22, 14, 13);
    g.fillStyle(SHIRT_D); g.fillRect(9, 32, 14, 3);
    // neck + head
    g.fillStyle(SKIN); g.fillRect(14, 19, 4, 3); g.fillRect(10, 8, 12, 12);
    // tousled hair
    g.fillStyle(HAIR); g.fillRect(9, 5, 14, 6); g.fillRect(9, 11, 2, 5); g.fillRect(21, 11, 2, 5);
    g.fillRect(11, 3, 4, 2); g.fillRect(16, 4, 4, 2);
    // eyes
    g.fillStyle(0x2a2018); g.fillRect(13, 14, 2, 2); g.fillRect(17, 14, 2, 2);
  }
  drawPlayer(0); g.generateTexture('player', 32, 48);
  drawPlayer(1); g.generateTexture('player_w0', 32, 48);
  drawPlayer(-1); g.generateTexture('player_w1', 32, 48);
  g.clear();

  // tree — round canopy on a short trunk (like the original)
  g.fillStyle(0x1a1f2e, 0.22); g.fillEllipse(24, 60, 26, 8);          // shadow
  g.fillStyle(0x6b4a2a); g.fillRect(21, 42, 6, 18);                   // trunk
  g.fillStyle(0x2f6b39); g.fillCircle(24, 28, 16);                    // canopy
  g.fillStyle(0x3c8048); g.fillCircle(20, 24, 9);                     // highlight
  g.generateTexture('tree', 48, 64); g.clear();

  // rock — faceted boulder with light/shadow facets, speckles and a crack
  g.fillStyle(0x1a1f2e, 0.25); g.fillEllipse(20, 33, 30, 8);                  // ground shadow
  g.fillStyle(0x595449); g.fillEllipse(20, 25, 30, 20);                       // dark underbody
  g.fillStyle(0x817b70); g.fillEllipse(20, 22, 27, 17);                       // mid body
  // light-facing facets (top-left)
  g.fillStyle(0x9b958a); g.fillTriangle(7, 23, 18, 10, 24, 21);
  g.fillStyle(0xaaa499); g.fillTriangle(18, 10, 24, 21, 29, 12);
  g.fillStyle(0x938d82); g.fillTriangle(24, 21, 29, 12, 34, 23);
  // shadowed facets (bottom-right)
  g.fillStyle(0x6a655c); g.fillTriangle(24, 21, 34, 23, 30, 31);
  g.fillStyle(0x5e5950); g.fillTriangle(9, 27, 20, 28, 15, 32);
  // top highlight, speckles + crevice
  g.fillStyle(0xbab3a6); g.fillTriangle(14, 16, 19, 12, 20, 18);
  g.fillStyle(0xbab3a6); g.fillRect(27, 16, 2, 2); g.fillRect(12, 20, 2, 2);
  g.fillStyle(0x4f4a43); g.fillRect(22, 26, 2, 2); g.fillRect(16, 24, 2, 2);
  g.lineStyle(1.4, 0x47433c, 1); g.beginPath(); g.moveTo(20, 13); g.lineTo(18, 20); g.lineTo(23, 24); g.lineTo(21, 31); g.strokePath();
  g.generateTexture('rock', 40, 40); g.clear();

  // berry bush — small dark bush with blue berries
  g.fillStyle(0x1a1f2e, 0.22); g.fillEllipse(16, 28, 22, 6);
  g.fillStyle(0x2f5a30); g.fillCircle(16, 18, 10); g.fillCircle(9, 21, 7); g.fillCircle(23, 21, 7);
  g.fillStyle(0x3a6ea5); g.fillCircle(12, 17, 2); g.fillCircle(20, 19, 2); g.fillCircle(16, 22, 2);
  g.generateTexture('bush', 32, 32); g.clear();

  // particles
  g.fillStyle(0xaaccee); g.fillRect(0, 0, 2, 10); g.generateTexture('drop', 2, 10); g.clear();
  g.fillStyle(0xffffff); g.fillCircle(3, 3, 3); g.generateTexture('flake', 6, 6); g.clear();
  g.fillStyle(0x8a5e30); g.fillRect(0, 0, 4, 4); g.generateTexture('chip', 4, 4); g.clear();        // wood chip
  g.fillStyle(0x9a948a); g.fillRect(0, 0, 4, 4); g.generateTexture('schip', 4, 4); g.clear();       // stone chip
  // soft glowing orb for type-coloured attack projectiles/bursts
  g.fillStyle(0xffffff, 0.22); g.fillCircle(8, 8, 8); g.fillStyle(0xffffff, 0.55); g.fillCircle(8, 8, 5); g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 3);
  g.generateTexture('orb', 16, 16); g.clear();
  // loot sack dropped on death (walk over it to reclaim your items)
  g.fillStyle(0x1a1f2e, 0.25); g.fillEllipse(14, 27, 22, 6);
  g.fillStyle(0x5a3e22); g.fillEllipse(14, 18, 21, 18);
  g.fillStyle(0x7a552e); g.fillEllipse(14, 19, 17, 14);
  g.fillStyle(0x8c6638); g.fillEllipse(11, 16, 7, 6);
  g.fillStyle(0x4a3320); g.fillRect(9, 6, 10, 4);
  g.fillStyle(0x3a2614); g.fillRect(10, 3, 8, 3);
  g.fillStyle(0xffd24a); g.fillCircle(15, 19, 2.5); g.fillStyle(0xffe88a); g.fillCircle(14, 18, 1);
  g.generateTexture('loot', 28, 32); g.clear();

  // (the thrown-ball texture 'ball' is loaded from assets/itm_ball.png in preload)

  // buildings
  ['campfire', 'wall', 'chest', 'torch', 'tent', 'shop', 'farm', 'lumberyard', 'mine', 'well', 'herbgarden', 'forge', 'fishtrap', 'crystalrig'].forEach((t) => buildingTexture(g, t));
  g.destroy();
}

function buildingTexture(g, type) {
  g.clear();
  if (type === 'campfire') {
    g.fillStyle(0x1a1f2e, 0.22); g.fillEllipse(24, 40, 30, 8);                  // shadow
    // ring of stones
    const stones = [[10, 36], [16, 39], [24, 40], [32, 39], [38, 36], [13, 32], [35, 32]];
    for (const [sx, sy] of stones) { g.fillStyle(0x6a655c); g.fillCircle(sx, sy, 4); g.fillStyle(0x837d72); g.fillCircle(sx - 1, sy - 1, 2); }
    // crossed logs
    g.fillStyle(0x4a3320); g.fillRect(13, 30, 22, 6); g.fillStyle(0x6b4a2a); g.fillRect(14, 31, 20, 3);
    g.fillStyle(0x4a3320); g.fillRect(20, 26, 6, 14); g.fillStyle(0x6b4a2a); g.fillRect(21, 27, 3, 12);
    g.fillStyle(0x2a2018); g.fillCircle(15, 33, 1.5); g.fillCircle(33, 33, 1.5);  // log ends
    // layered flame: deep orange → orange → yellow → hot core
    g.fillStyle(0xd84a14); g.fillTriangle(15, 32, 33, 32, 24, 8);
    g.fillStyle(0xff7a1e); g.fillTriangle(18, 32, 30, 32, 24, 13);
    g.fillStyle(0xffc23a); g.fillTriangle(20, 32, 28, 32, 24, 18);
    g.fillStyle(0xfff0a0); g.fillTriangle(22, 31, 26, 31, 24, 24);
    g.generateTexture('b_campfire', 48, 48);
  } else if (type === 'wall') {
    g.fillStyle(0x6b4a2a); g.fillRect(2, 8, 44, 40);
    g.fillStyle(0x5a3e22); for (let i = 0; i < 4; i++) g.fillRect(2, 8 + i * 11, 44, 2);
    g.generateTexture('b_wall', 48, 52);
  } else if (type === 'chest') {
    g.fillStyle(0x7a552e); g.fillRoundedRect(4, 16, 32, 22, 3);
    g.fillStyle(0x9a6a38); g.fillRoundedRect(2, 10, 36, 10, 3);
    g.fillStyle(0xd8b24a); g.fillRect(18, 18, 4, 8);
    g.generateTexture('b_chest', 40, 42);
  } else if (type === 'torch') {
    g.fillStyle(0x6b4a2a); g.fillRect(10, 16, 6, 28);
    g.fillStyle(0xff8a2a); g.fillTriangle(6, 20, 20, 20, 13, 2);
    g.fillStyle(0xffd24a); g.fillTriangle(9, 20, 17, 20, 13, 8);
    g.generateTexture('b_torch', 26, 46);
  } else if (type === 'tent') {
    g.fillStyle(0x1a1f2e, 0.2); g.fillEllipse(28, 50, 50, 10);
    g.fillStyle(0x3f6e8e); g.fillTriangle(4, 50, 52, 50, 28, 8);
    g.fillStyle(0x2a4a60); g.fillTriangle(22, 50, 34, 50, 28, 22);
    g.generateTexture('b_tent', 56, 56);
  } else if (type === 'shop') {
    // market stall: posts, striped awning, counter, and a shopkeeper behind it
    g.fillStyle(0x1a1f2e, 0.22); g.fillEllipse(40, 76, 70, 12);          // shadow
    g.fillStyle(0x5a3e22); g.fillRect(8, 26, 5, 48); g.fillRect(67, 26, 5, 48);  // posts
    // shopkeeper behind the counter
    g.fillStyle(0xe8b890); g.fillCircle(40, 40, 8);                      // head
    g.fillStyle(0x6a4a2a); g.fillRect(33, 31, 14, 5);                    // hair/hat brim
    g.fillStyle(0xb33c3c); g.fillRect(31, 47, 18, 14);                   // apron/body
    g.fillStyle(0xe8b890); g.fillRect(28, 49, 4, 9); g.fillRect(48, 49, 4, 9); // arms
    // counter
    g.fillStyle(0x7a552e); g.fillRect(10, 58, 60, 16);
    g.fillStyle(0x8c6638); g.fillRect(8, 56, 64, 5);
    // wares on the counter
    g.fillStyle(0xd83a3a); g.fillCircle(20, 56, 3); g.fillStyle(0xf2f2f2); g.fillRect(17, 56, 6, 2);
    g.fillStyle(0x4aa8e0); g.fillCircle(34, 56, 3);
    g.fillStyle(0xff8fa0); g.fillCircle(56, 56, 3);
    // striped awning
    for (let i = 0; i < 8; i++) { g.fillStyle(i % 2 ? 0xe8e2d6 : 0xc23a3a); g.fillRect(6 + i * 9, 14, 9, 14); }
    g.fillStyle(0x8a2a2a); g.fillRect(4, 12, 72, 4);
    g.generateTexture('b_shop', 80, 82);
  } else if (type === 'farm') {
    g.fillStyle(0x1a1f2e, 0.2); g.fillEllipse(28, 44, 52, 8);
    g.fillStyle(0x6b4a2a); g.fillRect(6, 22, 44, 22);                 // tilled plot
    g.fillStyle(0x533619); for (let i = 0; i < 4; i++) g.fillRect(8, 25 + i * 5, 40, 2);  // furrows
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) { g.fillStyle(0x3a8a3e); g.fillRect(10 + j * 8, 24 + i * 5, 3, 4); }  // sprouts
    g.fillStyle(0xd8506a); g.fillCircle(14, 26, 2); g.fillCircle(38, 36, 2); g.fillCircle(26, 31, 2);  // berries
    g.fillStyle(0x5a3e22); g.fillRect(4, 20, 48, 3);                  // bed frame
    g.generateTexture('b_farm', 56, 48);
  } else if (type === 'lumberyard') {
    g.fillStyle(0x1a1f2e, 0.2); g.fillEllipse(28, 50, 52, 8);
    g.fillStyle(0x5a3e22); g.fillTriangle(6, 24, 50, 24, 28, 8);      // roof
    g.fillStyle(0x6b4a2a); g.fillRect(10, 24, 36, 24);               // cabin
    g.fillStyle(0x3a2614); g.fillRect(24, 34, 10, 14);               // door
    g.fillStyle(0x7a552e); g.fillRect(6, 44, 14, 5); g.fillRect(8, 39, 14, 5);  // stacked logs
    g.fillStyle(0x9a6a38); g.fillCircle(7, 46.5, 2); g.fillCircle(9, 41.5, 2);
    g.generateTexture('b_lumberyard', 56, 54);
  } else if (type === 'mine') {
    g.fillStyle(0x1a1f2e, 0.2); g.fillEllipse(28, 50, 52, 8);
    g.fillStyle(0x6e6960); g.fillTriangle(2, 48, 54, 48, 28, 14);     // rock mound
    g.fillStyle(0x837d72); g.fillTriangle(10, 48, 40, 48, 26, 22);
    g.fillStyle(0x14110e); g.fillRect(20, 34, 16, 14);               // mine entrance
    g.fillStyle(0x5a3e22); g.fillRect(18, 32, 4, 16); g.fillRect(34, 32, 4, 16); g.fillRect(18, 30, 20, 4);  // wood supports
    g.fillStyle(0x9aa1ad); g.fillRect(42, 38, 8, 3); g.fillStyle(0x7a552e); g.fillRect(48, 36, 3, 10);  // pickaxe
    g.generateTexture('b_mine', 56, 54);
  } else if (type === 'well') {
    g.fillStyle(0x1a1f2e, 0.2); g.fillEllipse(24, 48, 40, 8);
    g.fillStyle(0x6e6960); g.fillRect(8, 30, 32, 18);               // stone base
    g.fillStyle(0x837d72); for (let i = 0; i < 4; i++) g.fillRect(10 + i * 8, 30, 6, 18);
    g.fillStyle(0x14233a); g.fillRect(12, 32, 24, 8);               // water
    g.fillStyle(0x5a3e22); g.fillRect(9, 10, 4, 22); g.fillRect(35, 10, 4, 22);  // posts
    g.fillStyle(0x8a2a2a); g.fillTriangle(4, 12, 44, 12, 24, 2);    // roof
    g.generateTexture('b_well', 48, 52);
  } else if (type === 'herbgarden') {
    g.fillStyle(0x1a1f2e, 0.2); g.fillEllipse(28, 44, 52, 8);
    g.fillStyle(0x5a4a2a); g.fillRect(6, 22, 44, 22);                 // soil bed
    g.fillStyle(0x46381f); for (let i = 0; i < 4; i++) g.fillRect(8, 25 + i * 5, 40, 2);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) { g.fillStyle(0x4faa3a); g.fillRect(10 + j * 8, 22 + i * 5, 2, 6); }  // herb stalks
    g.fillStyle(0x7fd05a); g.fillCircle(14, 24, 2); g.fillCircle(30, 30, 2); g.fillCircle(40, 26, 2);
    g.fillStyle(0x5a3e22); g.fillRect(4, 20, 48, 3);
    g.generateTexture('b_herbgarden', 56, 48);
  } else if (type === 'forge') {
    g.fillStyle(0x1a1f2e, 0.2); g.fillEllipse(28, 50, 52, 8);
    g.fillStyle(0x5e5850); g.fillRect(8, 22, 40, 26);                 // stone hut
    g.fillStyle(0x47423b); g.fillRect(8, 22, 40, 4);
    g.fillStyle(0x2a2622); g.fillRect(30, 8, 8, 16);                  // chimney
    g.fillStyle(0xff7a1e); g.fillCircle(34, 8, 3); g.fillStyle(0xffc23a); g.fillCircle(34, 7, 1.5); // ember
    g.fillStyle(0x14110e); g.fillRect(14, 32, 14, 16);               // forge mouth
    g.fillStyle(0xff7a1e); g.fillRect(16, 38, 10, 8); g.fillStyle(0xffd24a); g.fillRect(18, 40, 6, 4); // fire glow
    g.fillStyle(0x3a3d44); g.fillRect(34, 38, 12, 6); g.fillStyle(0x9aa1ad); g.fillRect(34, 37, 12, 2); // anvil
    g.generateTexture('b_forge', 56, 54);
  } else if (type === 'fishtrap') {
    g.fillStyle(0x1a1f2e, 0.2); g.fillEllipse(28, 48, 50, 8);
    g.fillStyle(0x14233a); g.fillRect(6, 30, 44, 16);                // water
    g.fillStyle(0x6b4a2a); g.fillRect(8, 26, 5, 22); g.fillRect(43, 26, 5, 22); // posts
    g.fillStyle(0x7a552e); g.fillRect(6, 24, 44, 5);                 // dock plank
    g.lineStyle(1, 0xcfd4dc, 0.8);
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(14 + i * 6, 30); g.lineTo(14 + i * 6, 44); g.strokePath(); }
    for (let j = 0; j < 3; j++) { g.beginPath(); g.moveTo(12, 32 + j * 4); g.lineTo(44, 32 + j * 4); g.strokePath(); }
    g.fillStyle(0x3a9ad8); g.fillCircle(22, 38, 2); g.fillCircle(34, 40, 2);  // trapped fish
    g.generateTexture('b_fishtrap', 56, 52);
  } else if (type === 'crystalrig') {
    g.fillStyle(0x1a1f2e, 0.2); g.fillEllipse(28, 50, 52, 8);
    g.fillStyle(0x6e6960); g.fillTriangle(2, 48, 54, 48, 28, 16);     // rock mound
    g.fillStyle(0x837d72); g.fillTriangle(10, 48, 40, 48, 26, 24);
    g.fillStyle(0x0e2b33); g.fillTriangle(20, 44, 28, 26, 33, 44);    // crystal back
    g.fillStyle(0x3fd2e6); g.fillTriangle(22, 44, 27, 28, 31, 44);    // crystal
    g.fillStyle(0x9af0fb); g.fillTriangle(24, 42, 27, 30, 28, 42);    // crystal shine
    g.fillStyle(0x3fd2e6); g.fillTriangle(12, 46, 15, 36, 18, 46); g.fillTriangle(38, 46, 41, 38, 44, 46);
    g.fillStyle(0x5a3e22); g.fillRect(8, 44, 4, 6); g.fillRect(44, 44, 4, 6);  // support beams
    g.generateTexture('b_crystalrig', 56, 54);
  }
}

// soft pixel palettes (close to the original's calm tones): base / dark / light
const BIOME_PAL = {
  plains: [0x5e9a4c, 0x4f8740, 0x72ad5c], forest: [0x47803a, 0x3a6c30, 0x589349],
  rocky: [0x8c8479, 0x746d63, 0xa39b8e], snow: [0xe9eff4, 0xd7e0e9, 0xfbfdff],
  beach: [0xcdbf8e, 0xbcac78, 0xdbcfa2], water: [0x3a6ea5, 0x336397, 0x4a7eb5],
  desert: [0xd8c489, 0xc9b274, 0xe6d6a2], swamp: [0x4a5a3a, 0x3c4c2f, 0x5a6b44],
};

function buildGround(scene) {
  const g = scene.make.graphics({ add: false });
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      const wx = cx * TILE + TILE / 2, wy = cy * TILE + TILE / 2;
      let biome = biomeAt(wx, wy);
      const dLake = Phaser.Math.Distance.Between(wx, wy, LAKE.x, LAKE.y);
      if (biome !== 'water' && dLake < LAKE.r + 30) biome = 'beach';
      const [base, dark, light] = BIOME_PAL[biome];
      const ox = cx * TILE, oy = cy * TILE;
      g.fillStyle(base, 1); g.fillRect(ox, oy, TILE, TILE);
      // a few small scattered speckle dots (subtle, like the original) — no harsh grain
      for (let k = 0; k < 5; k++) {
        const r = hash(cx * 5 + k + 0.3, cy * 5 - k + 0.7);
        if (r > 0.74) {
          const dx = (hash(cx + k * 1.7, cy) * (TILE - 3)) | 0;
          const dy = (hash(cy, cx + k * 1.7) * (TILE - 3)) | 0;
          g.fillStyle(r > 0.9 ? light : dark, 1); g.fillRect(ox + dx, oy + dy, 3, 3);
        }
      }
    }
  }
  g.generateTexture('ground', WORLD_W, WORLD_H);
  g.destroy();
  scene.add.image(0, 0, 'ground').setOrigin(0).setDepth(-10000);
}

function scatterProps(scene) {
  const props = [];
  for (let i = 0; i < 2700; i++) {
    const x = hash(i * 3.1, 1) * WORLD_W, y = hash(i * 3.1, 2) * WORLD_H;
    if (isWater(x, y)) continue;
    if (Phaser.Math.Distance.Between(x, y, WORLD_W / 2, WORLD_H / 2) < 90) continue;
    const biome = biomeAt(x, y);
    const isTree = (biome === 'forest' || biome === 'plains' || biome === 'snow' || biome === 'swamp') && hash(i, 9) > 0.45;
    const isRock = !isTree && (biome === 'rocky' || biome === 'beach' || biome === 'snow' || biome === 'desert') && hash(i, 4) > 0.5;
    const isBush = !isTree && !isRock && (biome === 'plains' || biome === 'forest' || biome === 'swamp' || biome === 'desert') && hash(i, 6) > 0.85;
    if (!isTree && !isRock && !isBush) continue;
    const kind = isTree ? 'tree' : isRock ? 'rock' : 'bush';
    const spr = scene.add.image(x, y, kind).setOrigin(0.5, 0.85);
    const sc = (kind === 'bush' ? 0.9 : 0.8) + hash(i, 7) * (kind === 'tree' ? 0.7 : 0.4); spr.setScale(sc).setDepth(y);
    if (kind === 'tree' && biome === 'snow') spr.setTint(0xcfe6e0);
    else if (kind === 'tree' && biome === 'swamp') spr.setTint(0x6a7a52);
    else if (kind === 'rock' && biome === 'desert') spr.setTint(0xe0c98c);
    props.push({ spr, kind, hp: kind === 'tree' ? 8 : kind === 'bush' ? 3 : 10, baseScale: sc });
  }
  return props;
}

// Find where a creature's feet actually are within its sprite frame by
// scanning for the lowest non-transparent pixel row. Returns a 0..1 origin
// so the feet sit exactly on the ground shadow (fixes the "floating" look,
// since PokeAPI frames have wildly different amounts of bottom padding).
const _footCache = new Map();
function footFrac(scene, key) {
  if (_footCache.has(key)) return _footCache.get(key);
  let frac = 0.88;
  try {
    const src = scene.textures.get(key).getSourceImage();
    const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
    const cx = cv.getContext('2d'); cx.drawImage(src, 0, 0);
    const d = cx.getImageData(0, 0, src.width, src.height).data;
    for (let yy = src.height - 1; yy >= 0; yy--) {
      let opaque = false;
      for (let xx = 0; xx < src.width; xx++) { if (d[(yy * src.width + xx) * 4 + 3] > 24) { opaque = true; break; } }
      if (opaque) { frac = (yy + 1) / src.height; break; }
    }
  } catch (e) { /* tainted/unloaded — keep default */ }
  _footCache.set(key, frac);
  return frac;
}
export function groundSprite(scene, spr, key) { spr.setOrigin(0.5, footFrac(scene, key)); }

// per-type attack flavour: speed, arc, spin/wobble, burst particle + count
function attackStyle(type) {
  if (['fire', 'electric', 'dragon'].includes(type)) return { dur: 110, ease: 'Quad.easeIn', scale: 1.25, n: 12, tex: 'orb', spin: true, arc: 0 };
  if (['water', 'ice'].includes(type)) return { dur: 175, ease: 'Sine.easeInOut', scale: 1.05, n: 11, tex: 'orb', arc: -42 };
  if (['rock', 'ground', 'steel'].includes(type)) return { dur: 205, ease: 'Quad.easeIn', scale: 1.35, n: 9, tex: 'schip', arc: -64 };
  if (['psychic', 'ghost', 'fairy'].includes(type)) return { dur: 155, ease: 'Sine.easeInOut', scale: 1.1, n: 14, tex: 'orb', wobble: true, arc: 0 };
  if (['grass', 'bug', 'poison'].includes(type)) return { dur: 185, ease: 'Quad.easeOut', scale: 1.05, n: 13, tex: 'flake', arc: -34 };
  return { dur: 130, ease: 'Quad.easeIn', scale: 1.05, n: 9, tex: 'orb', arc: 0 };  // normal / fighting / dark
}
// a type-coloured attack: a glowing orb flies from attacker to target with a
// type-specific motion, then bursts into type-coloured particles
function attackFx(scene, x0, y0, x1, y1, type) {
  if (!scene.textures.exists('orb')) return;
  const color = TYPE_COLORS[type] || 0xffffff;
  const st = attackStyle(type);
  const orb = scene.add.image(x0, y0, 'orb').setTint(color).setDepth(9000).setScale(st.scale);
  const p = { t: 0 };
  scene.tweens.add({
    targets: p, t: 1, duration: st.dur, ease: st.ease,
    onUpdate: () => {
      orb.x = x0 + (x1 - x0) * p.t;
      orb.y = y0 + (y1 - y0) * p.t + (st.arc || 0) * Math.sin(p.t * Math.PI) + (st.wobble ? Math.sin(p.t * 16) * 5 : 0);
      if (st.spin) orb.rotation += 0.5;
      orb.setDepth(orb.y + 50);
    },
    onComplete: () => {
      orb.destroy();
      const b = scene.add.particles(x1, y1, st.tex, { speed: { min: 50, max: 180 }, lifespan: 320, scale: { start: st.scale * 0.8, end: 0 }, quantity: st.n, tint: color, emitting: false }).setDepth(9001);
      b.explode(st.n); scene.time.delayedCall(380, () => b.destroy());
    },
  });
}

// ---------- Creature ----------
function makeCreature(scene, key, level, x, y, sea, boss) {
  const sp = SPECIES[key];
  boss = !!boss;
  // shiny odds: a permanent multiplier (upgrades / ascension) plus a Let's-Go
  // style boost while you're chaining catches of this same species
  let shinyChance = (scene._shinyRate || 1 / 200) * (scene._shinyMult || 1);
  if (scene._comboKey === key) shinyChance *= (scene._comboShinyMult || 1);
  const shiny = Math.random() < shinyChance;
  // "Gloamtouched": an ultra-rare prismatic variant, independent of shiny
  const gloam = !boss && Math.random() < (1 / 2600) * (scene._shinyMult || 1);
  // Alphas: rare, oversized, high-level, aggressive, drop big rewards (never for legendaries / the boss)
  const alpha = boss ? false : (!sp.legendary && Math.random() < alphaRateAt(scene, x, y));
  if (alpha) level = Math.min(80, level + 16 + (Math.random() * 12 | 0));
  // individual potential (IV 0..1); Wanderer's Luck biases toward strong rolls
  let iv = Math.random();
  if (Math.random() < (scene._luckAdd || 0)) iv = Math.max(iv, 0.7 + Math.random() * 0.3);
  if (boss || gloam) iv = Math.max(iv, 0.6 + Math.random() * 0.4);
  const maxHp = Math.round(sp.hp * (1 + level * 0.06) * (alpha ? 4.0 : 1) * (boss ? BOSS.hpMult : 1) * ivHpMult(iv));
  const texKey = 'mon' + sp.dex;
  const base = sp.scale * 0.55 * (boss ? 1.85 : alpha ? 1.4 : 1);
  const REST = 2;                                  // sprite y at rest — feet sit on the shadow

  const container = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 2, 30 * base, 11 * base, 0x000000, 0.28);
  const ready = scene.textures.exists(texKey);
  const spr = scene.add.image(0, REST, ready ? texKey : 'ball');
  spr.setScale(ready ? base : 0.6).setAlpha(ready ? 1 : 0.5);
  spr.setOrigin(0.5, ready ? footFrac(scene, texKey) : 0.88);
  if (gloam) spr.setTint(0xc9a0ff); else if (shiny) spr.setTint(0xfff3a0); else if (boss) spr.setTint(0x9a5ad0); else if (alpha) spr.setTint(0xff9a5a);
  let aura = null;
  if (boss) { aura = scene.add.ellipse(0, 2, 56 * base, 20 * base, 0x9a2ee0, 0.24); container.add(aura); }
  else if (alpha) { aura = scene.add.ellipse(0, 2, 44 * base, 16 * base, 0xff5a1e, 0.18); container.add(aura); }
  const barY = -(20 + 34 * sp.scale * (boss ? 1.85 : alpha ? 1.4 : 1));
  const barBg = scene.add.rectangle(0, barY, 36, 5, 0x111814).setVisible(false);
  const barFill = scene.add.rectangle(-18, barY, 36, 3, boss ? 0x9a2ee0 : alpha ? 0xff5a1e : (TYPE_COLORS[sp.types[0]] || 0x58c04a)).setOrigin(0, 0.5).setVisible(false);
  container.add([shadow, spr, barBg, barFill]);
  container.setDepth(y);

  const c = {
    key, sp, level, shiny, gloam, boss, iv, sea, alpha, hp: maxHp, maxHp, x, y, container, spr, shadow, base, aura, capturing: false, atkCd: 0,
    displayName: boss ? BOSS.name : sp.name,
    state: 'idle', stateT: 1 + Math.random() * 2, dir: Math.random() * Math.PI * 2, barT: 0,
    walkPhase: Math.random() * 6, idlePhase: Math.random() * 6, hitFlash: 0,
    hpFrac() { return this.hp / this.maxHp; },
    isAggressive() { return this.boss || this.alpha || this.sp.aggressive || this.sp.legendary; },
    showBar() { barBg.setVisible(true); barFill.setVisible(true); this.barT = 3; this.hitFlash = 0.18; },
    flee(player) { this.state = 'flee'; this.stateT = 3; this.dir = Math.atan2(this.y - player.y, this.x - player.x); },
    update(dt, player) {
      this.stateT -= dt;
      // aggressive land creatures hunt the player once they're close
      const pdist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      const aggro = this.isAggressive() && !this.sea && player.alive && pdist < (this.alpha ? 340 : 220);
      if (aggro && this.state !== 'flee') { this.state = 'chase'; this.stateT = 0.4; this.dir = Math.atan2(player.y - this.y, player.x - this.x); }
      else if (this.state === 'chase' && !aggro) { this.state = 'idle'; this.stateT = 1; }
      if (this.state !== 'flee' && this.state !== 'chase' && this.stateT <= 0) {
        this.state = Math.random() < 0.55 ? 'wander' : 'idle'; this.stateT = 1 + Math.random() * 3; this.dir = Math.random() * Math.PI * 2;
      } else if (this.state === 'flee' && this.stateT <= 0) { this.state = 'idle'; this.stateT = 1 + Math.random() * 2; }

      const moving = this.state === 'wander' || this.state === 'flee' || this.state === 'chase';
      if (moving) {
        const baseSpd = this.state === 'flee' ? 110 : this.state === 'chase' ? (this.alpha ? 78 : 95) : 40;
        const sp2 = baseSpd * dt;
        const nx = Phaser.Math.Clamp(this.x + Math.cos(this.dir) * sp2, 20, WORLD_W - 20);
        const ny = Phaser.Math.Clamp(this.y + Math.sin(this.dir) * sp2, 20, WORLD_H - 20);
        const wetThere = isWater(nx, ny);
        // sea creatures stay in the water; land creatures stay out of it
        if (this.sea ? wetThere : !wetThere) { this.x = nx; this.y = ny; if (Math.abs(Math.cos(this.dir)) > 0.2) spr.setFlipX(Math.cos(this.dir) < 0); }
        else { this.dir += 2.3; }
      }

      this.container.setPosition(this.x, this.y).setDepth(this.y);
      if (this.sea) {
        // bob gently on the surface (no legs to waddle)
        this.idlePhase += dt * (moving ? 3.5 : 2);
        spr.rotation = Math.sin(this.idlePhase) * 0.05;
        spr.y = REST - Math.sin(this.idlePhase) * 1.5;
        spr.setScale(base, base);
        shadow.scaleX = 1;
      } else if (moving) {
        // walk: waddle side to side with feet planted (no flying)
        this.walkPhase += dt * (this.state === 'flee' ? 15 : 9);
        const sway = Math.sin(this.walkPhase);
        spr.rotation = sway * 0.13;
        spr.y = REST - Math.abs(sway) * 1.2;
        spr.setScale(base, base * (1 - 0.05 * Math.abs(sway)));
        shadow.scaleX = 1 - 0.12 * Math.abs(sway);
      } else {
        this.idlePhase += dt * 2.5;
        spr.rotation = Phaser.Math.Linear(spr.rotation, 0, 0.18);
        spr.y = REST;
        spr.setScale(base, base * (1 + 0.025 * Math.sin(this.idlePhase)));
        shadow.scaleX = 1;
      }

      // white hit flash when struck
      if (this.hitFlash > 0) { this.hitFlash -= dt; spr.setTintFill(0xffffff); if (this.hitFlash <= 0) { if (gloam) spr.setTint(0xc9a0ff); else if (shiny) spr.setTint(0xfff3a0); else if (boss) spr.setTint(0x9a5ad0); else if (alpha) spr.setTint(0xff9a5a); else spr.clearTint(); } }

      if (barBg.visible) {
        barFill.width = 36 * this.hpFrac();
        if ((this.barT -= dt) <= 0 && this.hp === this.maxHp) { barBg.setVisible(false); barFill.setVisible(false); }
      }
    },
  };
  return c;
}
