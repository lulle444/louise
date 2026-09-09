// ============================================================
// WANDERMERE — game data: familiar species, items, recipes,
// buildings, economy, achievements & player perks. All creature
// art is generated procedurally at runtime (see sprites.js) —
// nothing is fetched from any external art source.
// ============================================================

// type → accent colour (health bars, particles, fallback tint)
export const TYPE_COLORS = {
  fire: 0xe8662a, water: 0x4aa8e0, grass: 0x58c04a, electric: 0xf2d23c,
  ice: 0xa9d8ec, ghost: 0x8a6ae8, dark: 0x5a5a7a, normal: 0xc0b090,
  bug: 0x9ab838, flying: 0xb0a8d8, rock: 0x9a8a6a, poison: 0x9a4ae0,
  fighting: 0xc05828, ground: 0xd8b070, psychic: 0xe87ab8, dragon: 0x7a5ae0,
  steel: 0xb8b8c8, fairy: 0xf0a8d8,
};

// type effectiveness (attacker → multiplier vs defender type)
const TYPE_CHART = {
  fire: { grass: 1.6, ice: 1.6, bug: 1.6, steel: 1.6, water: 0.6, rock: 0.6, fire: 0.6, dragon: 0.6 },
  water: { fire: 1.6, rock: 1.6, ground: 1.6, grass: 0.6, water: 0.6, dragon: 0.6 },
  grass: { water: 1.6, rock: 1.6, ground: 1.6, fire: 0.6, grass: 0.6, flying: 0.6, bug: 0.6, poison: 0.6, dragon: 0.6 },
  electric: { water: 1.6, flying: 1.6, grass: 0.6, electric: 0.6, dragon: 0.6, ground: 0.3 },
  ice: { grass: 1.6, flying: 1.6, ground: 1.6, dragon: 1.6, fire: 0.6, ice: 0.6, water: 0.6, steel: 0.6 },
  fighting: { normal: 1.6, rock: 1.6, ice: 1.6, dark: 1.6, steel: 1.6, flying: 0.6, psychic: 0.6, fairy: 0.6, poison: 0.6, ghost: 0.3 },
  ground: { fire: 1.6, electric: 1.6, rock: 1.6, poison: 1.6, steel: 1.6, grass: 0.6, flying: 0.3, bug: 0.6 },
  flying: { grass: 1.6, fighting: 1.6, bug: 1.6, electric: 0.6, rock: 0.6, steel: 0.6 },
  psychic: { fighting: 1.6, poison: 1.6, psychic: 0.6, steel: 0.6, dark: 0.3 },
  bug: { grass: 1.6, psychic: 1.6, dark: 1.6, fire: 0.6, flying: 0.6, fighting: 0.6, poison: 0.6, ghost: 0.6, steel: 0.6, fairy: 0.6 },
  rock: { fire: 1.6, ice: 1.6, flying: 1.6, bug: 1.6, fighting: 0.6, ground: 0.6, steel: 0.6 },
  ghost: { ghost: 1.6, psychic: 1.6, normal: 0.3, dark: 0.6 },
  dragon: { dragon: 1.6, steel: 0.6, fairy: 0.3 },
  dark: { ghost: 1.6, psychic: 1.6, fighting: 0.6, dark: 0.6, fairy: 0.6 },
  poison: { grass: 1.6, fairy: 1.6, poison: 0.6, ground: 0.6, rock: 0.6, ghost: 0.6, steel: 0.3 },
  normal: { rock: 0.6, steel: 0.6, ghost: 0.3 },
  fairy: { fighting: 1.6, dragon: 1.6, dark: 1.6, fire: 0.6, poison: 0.6, steel: 0.6 },
  steel: { ice: 1.6, rock: 1.6, fairy: 1.6, fire: 0.6, water: 0.6, electric: 0.6, steel: 0.6 },
};
export function typeMult(atk, defTypes) {
  if (!atk || !TYPE_CHART[atk]) return 1;
  let m = 1;
  for (const d of defTypes) m *= TYPE_CHART[atk][d] ?? 1;
  return m;
}

// Biomes the world is painted with; each species lists where it appears.
// plains | forest | rocky | snow | beach (lake shore) | desert | swamp | night (any, after dark)
export const SPECIES = {
  // ---- forest / plains starters & early line ----
  sprigling:  { name: 'Sprigling', no: 1,   types: ['grass','poison'], biomes: ['forest','plains'], hp: 45, atk: 49, speed: 2.0, scale: 1.6, catch: 0.45, rarity: 'common', evolveTo: 'sprigona', evolveLv: 16 },
  sprigona:    { name: 'Sprigona', no: 2,   types: ['grass','poison'], biomes: ['forest'], hp: 60, atk: 62, speed: 2.0, scale: 1.9, catch: 0.30, rarity: 'uncommon', evolveTo: 'sprigothar', evolveLv: 32 },
  sprigothar:   { name: 'Sprigothar', no: 3,   types: ['grass','poison'], biomes: ['forest'], hp: 80, atk: 82, speed: 1.9, scale: 2.6, catch: 0.14, rarity: 'rare' },
  vulmis: { name: 'Vulmis', no: 4,   types: ['fire'], biomes: ['rocky','plains'], hp: 39, atk: 52, speed: 2.3, scale: 1.6, catch: 0.45, rarity: 'common', evolveTo: 'vulmarax', evolveLv: 16 },
  vulmarax: { name: 'Vulmarax', no: 5,   types: ['fire'], biomes: ['rocky'], hp: 58, atk: 64, speed: 2.4, scale: 1.9, catch: 0.28, rarity: 'uncommon', evolveTo: 'vulmagor', evolveLv: 36 },
  vulmagor:  { name: 'Vulmagor', no: 6,   types: ['fire','flying'], biomes: ['rocky','desert'], hp: 78, atk: 84, speed: 2.8, scale: 2.7, catch: 0.10, rarity: 'rare' },
  aqulet:   { name: 'Aqulet', no: 7,   types: ['water'], biomes: ['beach'], hp: 44, atk: 48, speed: 2.0, scale: 1.6, catch: 0.45, rarity: 'common', evolveTo: 'aqulor', evolveLv: 16 },
  aqulor:  { name: 'Aqulor', no: 8,   types: ['water'], biomes: ['beach'], hp: 59, atk: 63, speed: 2.0, scale: 1.9, catch: 0.28, rarity: 'uncommon', evolveTo: 'aquloth', evolveLv: 36 },
  aquloth:  { name: 'Aquloth', no: 9,   types: ['water'], biomes: ['beach'], hp: 79, atk: 83, speed: 1.9, scale: 2.6, catch: 0.12, rarity: 'rare' },
  larvi:   { name: 'Larvi', no: 10,  types: ['bug'], biomes: ['forest','plains'], hp: 45, atk: 30, speed: 1.6, scale: 1.3, catch: 0.65, rarity: 'common', evolveTo: 'pupari', evolveLv: 7 },
  pupari:    { name: 'Pupari', no: 11,  types: ['bug'], biomes: ['forest'], hp: 50, atk: 20, speed: 1.0, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'papilex', evolveLv: 10 },
  papilex: { name: 'Papilex', no: 12,  types: ['bug','flying'], biomes: ['forest','plains'], hp: 60, atk: 45, speed: 2.7, scale: 1.9, catch: 0.30, rarity: 'uncommon' },
  grubis:     { name: 'Grubis', no: 13,  types: ['bug','poison'], biomes: ['forest'], hp: 40, atk: 35, speed: 1.7, scale: 1.3, catch: 0.65, rarity: 'common', evolveTo: 'coconis', evolveLv: 7 },
  coconis:     { name: 'Coconis', no: 14,  types: ['bug','poison'], biomes: ['forest'], hp: 45, atk: 25, speed: 1.0, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'waspyre', evolveLv: 10 },
  waspyre:   { name: 'Waspyre', no: 15,  types: ['bug','poison'], biomes: ['forest','swamp'], hp: 65, atk: 80, speed: 2.9, scale: 2.0, catch: 0.28, rarity: 'uncommon', aggressive: true },
  aviel:     { name: 'Aviel', no: 16,  types: ['normal','flying'], biomes: ['plains','forest'], hp: 40, atk: 45, speed: 2.6, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'avirel', evolveLv: 18 },
  avirel:  { name: 'Avirel', no: 17,  types: ['normal','flying'], biomes: ['plains'], hp: 63, atk: 60, speed: 2.9, scale: 1.9, catch: 0.30, rarity: 'uncommon', evolveTo: 'avistrix', evolveLv: 36 },
  avistrix:    { name: 'Avistrix', no: 18,  types: ['normal','flying'], biomes: ['plains'], hp: 83, atk: 80, speed: 3.3, scale: 2.5, catch: 0.14, rarity: 'rare' },
  skurr:    { name: 'Skurr', no: 19,  types: ['normal'], biomes: ['plains','night'], hp: 30, atk: 56, speed: 2.7, scale: 1.3, catch: 0.60, rarity: 'common', evolveTo: 'skurath', evolveLv: 20 },
  skurath:   { name: 'Skurath', no: 20,  types: ['normal'], biomes: ['plains','night'], hp: 55, atk: 81, speed: 2.9, scale: 1.7, catch: 0.32, rarity: 'uncommon' },
  corvane:    { name: 'Corvane', no: 21,  types: ['normal','flying'], biomes: ['plains','desert'], hp: 40, atk: 60, speed: 2.8, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'corvaxi', evolveLv: 20 },
  corvaxi:     { name: 'Corvaxi', no: 22,  types: ['normal','flying'], biomes: ['plains','desert'], hp: 65, atk: 90, speed: 3.2, scale: 2.2, catch: 0.26, rarity: 'uncommon', aggressive: true },
  vipeth:      { name: 'Vipeth', no: 23,  types: ['poison'], biomes: ['plains','desert'], hp: 35, atk: 60, speed: 2.1, scale: 1.6, catch: 0.50, rarity: 'common', evolveTo: 'vipraxis', evolveLv: 22 },
  vipraxis:      { name: 'Vipraxis', no: 24,  types: ['poison'], biomes: ['desert','swamp'], hp: 60, atk: 85, speed: 2.4, scale: 2.3, catch: 0.26, rarity: 'uncommon', aggressive: true },
  sparqit:    { name: 'Sparqit', no: 25,  types: ['electric'], biomes: ['forest','plains'], hp: 35, atk: 55, speed: 2.9, scale: 1.5, catch: 0.30, rarity: 'uncommon', evolveTo: 'sparqolt', evolveLv: 22 },
  sparqolt:     { name: 'Sparqolt', no: 26,  types: ['electric'], biomes: ['plains'], hp: 60, atk: 90, speed: 3.2, scale: 1.9, catch: 0.16, rarity: 'rare' },
  duncrit:  { name: 'Duncrit', no: 27,  types: ['ground'], biomes: ['rocky','desert'], hp: 50, atk: 75, speed: 1.8, scale: 1.5, catch: 0.50, rarity: 'common', evolveTo: 'duncrusk', evolveLv: 22 },
  duncrusk:  { name: 'Duncrusk', no: 28,  types: ['ground'], biomes: ['desert','rocky'], hp: 75, atk: 100, speed: 2.2, scale: 2.0, catch: 0.24, rarity: 'uncommon' },
  lunelle:   { name: 'Lunelle', no: 29,  types: ['fairy'], biomes: ['plains','night'], hp: 70, atk: 45, speed: 1.8, scale: 1.5, catch: 0.30, rarity: 'uncommon', evolveTo: 'lunara', evolveLv: 30 },
  lunara:   { name: 'Lunara', no: 30,  types: ['fairy'], biomes: ['plains','night'], hp: 95, atk: 70, speed: 2.0, scale: 2.0, catch: 0.14, rarity: 'rare' },
  veskit:     { name: 'Veskit', no: 31,  types: ['fire'], biomes: ['rocky','desert'], hp: 38, atk: 41, speed: 2.5, scale: 1.5, catch: 0.40, rarity: 'uncommon', evolveTo: 'veskorai', stoneEvo: true },
  veskorai:  { name: 'Veskorai', no: 32,  types: ['fire'], biomes: ['desert'], hp: 73, atk: 76, speed: 3.0, scale: 2.2, catch: 0.16, rarity: 'rare' },
  balloret: { name: 'Balloret', no: 33,  types: ['normal','fairy'], biomes: ['plains'], hp: 115, atk: 45, speed: 1.6, scale: 1.4, catch: 0.40, rarity: 'uncommon', evolveTo: 'balloluxe', stoneEvo: true },
  balloluxe: { name: 'Balloluxe', no: 34,  types: ['normal','fairy'], biomes: ['plains'], hp: 140, atk: 70, speed: 1.8, scale: 1.9, catch: 0.18, rarity: 'rare' },
  vespyre:      { name: 'Vespyre', no: 35,  types: ['poison','flying'], biomes: ['night','rocky'], hp: 40, atk: 45, speed: 2.7, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'vesparn', evolveLv: 22 },
  vesparn:     { name: 'Vesparn', no: 36,  types: ['poison','flying'], biomes: ['night'], hp: 75, atk: 80, speed: 3.0, scale: 2.1, catch: 0.26, rarity: 'uncommon', aggressive: true },
  petalit:     { name: 'Petalit', no: 37,  types: ['grass','poison'], biomes: ['forest','swamp'], hp: 45, atk: 50, speed: 1.5, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'petalume', evolveLv: 21 },
  petalume:      { name: 'Petalume', no: 38,  types: ['grass','poison'], biomes: ['swamp'], hp: 60, atk: 65, speed: 1.5, scale: 1.6, catch: 0.30, rarity: 'uncommon', evolveTo: 'petalantha', stoneEvo: true },
  petalantha:  { name: 'Petalantha', no: 39,  types: ['grass','poison'], biomes: ['swamp'], hp: 75, atk: 80, speed: 1.6, scale: 2.0, catch: 0.16, rarity: 'rare' },
  fungrit:      { name: 'Fungrit', no: 40,  types: ['bug','grass'], biomes: ['forest','swamp'], hp: 35, atk: 70, speed: 1.4, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'fungorath', evolveLv: 24 },
  fungorath:   { name: 'Fungorath', no: 41,  types: ['bug','grass'], biomes: ['swamp'], hp: 60, atk: 95, speed: 1.5, scale: 1.9, catch: 0.24, rarity: 'uncommon' },
  fuzzek:    { name: 'Fuzzek', no: 42,  types: ['bug','poison'], biomes: ['forest','night'], hp: 60, atk: 55, speed: 1.9, scale: 1.5, catch: 0.50, rarity: 'common', evolveTo: 'mothelle', evolveLv: 31 },
  mothelle:   { name: 'Mothelle', no: 43,  types: ['bug','poison'], biomes: ['forest','night'], hp: 70, atk: 65, speed: 2.8, scale: 2.0, catch: 0.24, rarity: 'uncommon' },
  molgrin:    { name: 'Molgrin', no: 44,  types: ['ground'], biomes: ['desert','rocky'], hp: 10, atk: 55, speed: 2.9, scale: 1.2, catch: 0.55, rarity: 'common', evolveTo: 'molgrith', evolveLv: 26 },
  molgrith:    { name: 'Molgrith', no: 45,  types: ['ground'], biomes: ['desert'], hp: 35, atk: 100, speed: 3.4, scale: 1.7, catch: 0.24, rarity: 'uncommon' },
  purrin:     { name: 'Purrin', no: 46,  types: ['normal'], biomes: ['night','plains'], hp: 40, atk: 45, speed: 2.6, scale: 1.4, catch: 0.45, rarity: 'uncommon', evolveTo: 'purrelle', evolveLv: 28 },
  purrelle:    { name: 'Purrelle', no: 47,  types: ['normal'], biomes: ['night','plains'], hp: 65, atk: 70, speed: 3.3, scale: 2.0, catch: 0.22, rarity: 'rare' },
  duvanel:    { name: 'Duvanel', no: 48,  types: ['water'], biomes: ['beach'], hp: 50, atk: 52, speed: 1.9, scale: 1.6, catch: 0.45, rarity: 'common', evolveTo: 'duvarex', evolveLv: 33 },
  duvarex:    { name: 'Duvarex', no: 49,  types: ['water'], biomes: ['beach'], hp: 80, atk: 82, speed: 2.6, scale: 2.2, catch: 0.20, rarity: 'rare' },
  rageki:     { name: 'Rageki', no: 50,  types: ['fighting'], biomes: ['rocky'], hp: 40, atk: 80, speed: 2.6, scale: 1.5, catch: 0.45, rarity: 'common', evolveTo: 'ragorath', evolveLv: 28, aggressive: true },
  ragorath:   { name: 'Ragorath', no: 51,  types: ['fighting'], biomes: ['rocky'], hp: 65, atk: 105, speed: 3.0, scale: 1.9, catch: 0.22, rarity: 'uncommon', aggressive: true },
  brausel:  { name: 'Brausel', no: 52,  types: ['fire'], biomes: ['rocky','plains'], hp: 55, atk: 70, speed: 2.7, scale: 1.6, catch: 0.35, rarity: 'uncommon', evolveTo: 'brausorn', stoneEvo: true },
  brausorn:   { name: 'Brausorn', no: 53,  types: ['fire'], biomes: ['plains','desert'], hp: 90, atk: 110, speed: 3.4, scale: 2.6, catch: 0.10, rarity: 'rare' },
  vorlin:    { name: 'Vorlin', no: 54,  types: ['water'], biomes: ['beach'], hp: 40, atk: 50, speed: 2.0, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'vorlinth', evolveLv: 25 },
  vorlinth:  { name: 'Vorlinth', no: 55,  types: ['water'], biomes: ['beach','swamp'], hp: 65, atk: 65, speed: 2.2, scale: 1.7, catch: 0.28, rarity: 'uncommon', evolveTo: 'vorlinax', stoneEvo: true },
  vorlinax:  { name: 'Vorlinax', no: 56,  types: ['water','fighting'], biomes: ['swamp'], hp: 90, atk: 95, speed: 2.0, scale: 2.1, catch: 0.14, rarity: 'rare' },
  cerebrit:       { name: 'Cerebrit', no: 57,  types: ['psychic'], biomes: ['plains','rocky'], hp: 25, atk: 20, speed: 3.0, scale: 1.4, catch: 0.35, rarity: 'uncommon', evolveTo: 'cerebrax', evolveLv: 16 },
  cerebrax:    { name: 'Cerebrax', no: 58,  types: ['psychic'], biomes: ['plains','night'], hp: 40, atk: 35, speed: 3.2, scale: 1.7, catch: 0.22, rarity: 'uncommon', evolveTo: 'cerebrune', evolveLv: 36 },
  cerebrune:   { name: 'Cerebrune', no: 59,  types: ['psychic'], biomes: ['night'], hp: 55, atk: 50, speed: 3.6, scale: 2.0, catch: 0.12, rarity: 'rare' },
  brawnit:     { name: 'Brawnit', no: 60,  types: ['fighting'], biomes: ['rocky'], hp: 70, atk: 80, speed: 1.9, scale: 1.6, catch: 0.40, rarity: 'uncommon', evolveTo: 'brawnok', evolveLv: 28 },
  brawnok:    { name: 'Brawnok', no: 61,  types: ['fighting'], biomes: ['rocky'], hp: 80, atk: 100, speed: 2.0, scale: 2.0, catch: 0.22, rarity: 'uncommon', evolveTo: 'brawnoth', evolveLv: 40 },
  brawnoth:    { name: 'Brawnoth', no: 62,  types: ['fighting'], biomes: ['rocky'], hp: 90, atk: 130, speed: 2.2, scale: 2.4, catch: 0.10, rarity: 'rare', aggressive: true },
  vinoxa: { name: 'Vinoxa', no: 63,  types: ['grass','poison'], biomes: ['swamp','forest'], hp: 50, atk: 75, speed: 1.6, scale: 1.5, catch: 0.50, rarity: 'common', evolveTo: 'vinoxel', evolveLv: 21 },
  vinoxel: { name: 'Vinoxel', no: 64,  types: ['grass','poison'], biomes: ['swamp'], hp: 65, atk: 90, speed: 1.7, scale: 1.8, catch: 0.28, rarity: 'uncommon', evolveTo: 'vinoxath', stoneEvo: true },
  vinoxath: { name: 'Vinoxath', no: 65,  types: ['grass','poison'], biomes: ['swamp'], hp: 80, atk: 105, speed: 1.8, scale: 2.1, catch: 0.14, rarity: 'rare', aggressive: true },
  nerith:  { name: 'Nerith', no: 66,  types: ['water','poison'], biomes: ['beach'], hp: 40, atk: 40, speed: 2.0, scale: 1.5, catch: 0.50, rarity: 'common', evolveTo: 'nerithul', evolveLv: 30 },
  nerithul: { name: 'Nerithul', no: 67,  types: ['water','poison'], biomes: ['beach'], hp: 80, atk: 70, speed: 2.6, scale: 2.3, catch: 0.20, rarity: 'rare', aggressive: true },
  stonok:    { name: 'Stonok', no: 68,  types: ['rock','ground'], biomes: ['rocky'], hp: 40, atk: 80, speed: 1.3, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'stonokar', evolveLv: 25 },
  stonokar:   { name: 'Stonokar', no: 69,  types: ['rock','ground'], biomes: ['rocky'], hp: 55, atk: 95, speed: 1.4, scale: 1.8, catch: 0.28, rarity: 'uncommon', evolveTo: 'stonokrag', evolveLv: 40 },
  stonokrag:      { name: 'Stonokrag', no: 70,  types: ['rock','ground'], biomes: ['rocky','desert'], hp: 80, atk: 120, speed: 1.5, scale: 2.3, catch: 0.12, rarity: 'rare' },
  ignara:     { name: 'Ignara', no: 71,  types: ['fire'], biomes: ['plains','desert'], hp: 50, atk: 85, speed: 3.3, scale: 1.8, catch: 0.30, rarity: 'uncommon', evolveTo: 'ignarauth', evolveLv: 40 },
  ignarauth:   { name: 'Ignarauth', no: 72,  types: ['fire'], biomes: ['desert','plains'], hp: 65, atk: 100, speed: 3.8, scale: 2.4, catch: 0.18, rarity: 'rare' },
  ponderu:   { name: 'Ponderu', no: 73,  types: ['water','psychic'], biomes: ['beach','swamp'], hp: 90, atk: 65, speed: 1.2, scale: 1.7, catch: 0.45, rarity: 'common', evolveTo: 'ponderath', evolveLv: 37 },
  ponderath:    { name: 'Ponderath', no: 74,  types: ['water','psychic'], biomes: ['beach'], hp: 95, atk: 75, speed: 1.4, scale: 2.2, catch: 0.18, rarity: 'rare' },
  ferrolit:  { name: 'Ferrolit', no: 75,  types: ['electric','steel'], biomes: ['rocky'], hp: 25, atk: 35, speed: 2.2, scale: 1.4, catch: 0.45, rarity: 'common', evolveTo: 'ferrolux', evolveLv: 30 },
  ferrolux:   { name: 'Ferrolux', no: 76,  types: ['electric','steel'], biomes: ['rocky'], hp: 50, atk: 60, speed: 2.4, scale: 1.9, catch: 0.22, rarity: 'uncommon' },
  duocra:      { name: 'Duocra', no: 77,  types: ['normal','flying'], biomes: ['plains','desert'], hp: 35, atk: 85, speed: 3.2, scale: 1.6, catch: 0.50, rarity: 'common', evolveTo: 'duocrest', evolveLv: 31 },
  duocrest:     { name: 'Duocrest', no: 78,  types: ['normal','flying'], biomes: ['desert','plains'], hp: 60, atk: 110, speed: 3.6, scale: 2.1, catch: 0.22, rarity: 'uncommon' },
  phocil:       { name: 'Phocil', no: 79,  types: ['water'], biomes: ['snow','beach'], hp: 65, atk: 45, speed: 1.8, scale: 1.7, catch: 0.50, rarity: 'common', evolveTo: 'phocaine', evolveLv: 34 },
  phocaine:    { name: 'Phocaine', no: 80,  types: ['water','ice'], biomes: ['snow','beach'], hp: 90, atk: 70, speed: 2.2, scale: 2.3, catch: 0.20, rarity: 'rare' },
  sludreth:     { name: 'Sludreth', no: 81,  types: ['poison'], biomes: ['swamp','night'], hp: 80, atk: 80, speed: 1.3, scale: 1.6, catch: 0.45, rarity: 'common', evolveTo: 'sludrogg', evolveLv: 38 },
  sludrogg:        { name: 'Sludrogg', no: 82,  types: ['poison'], biomes: ['swamp','night'], hp: 105, atk: 105, speed: 1.4, scale: 2.2, catch: 0.16, rarity: 'rare', aggressive: true },
  conchip:   { name: 'Conchip', no: 83,  types: ['water'], biomes: ['beach'], hp: 30, atk: 65, speed: 1.8, scale: 1.3, catch: 0.50, rarity: 'common', evolveTo: 'conchral', stoneEvo: true },
  conchral:   { name: 'Conchral', no: 84,  types: ['water','ice'], biomes: ['beach'], hp: 50, atk: 95, speed: 2.0, scale: 1.9, catch: 0.18, rarity: 'rare' },
  miremist:     { name: 'Miremist', no: 85,  types: ['ghost','poison'], biomes: ['night'], hp: 30, atk: 35, speed: 2.8, scale: 1.6, catch: 0.40, rarity: 'uncommon', evolveTo: 'miremaw', evolveLv: 25 },
  miremaw:    { name: 'Miremaw', no: 86,  types: ['ghost','poison'], biomes: ['night'], hp: 45, atk: 50, speed: 3.0, scale: 1.9, catch: 0.24, rarity: 'uncommon', evolveTo: 'miregeist', evolveLv: 38 },
  miregeist:     { name: 'Miregeist', no: 87,  types: ['ghost','poison'], biomes: ['night'], hp: 60, atk: 65, speed: 3.4, scale: 2.2, catch: 0.12, rarity: 'rare', aggressive: true },
  ophidron:       { name: 'Ophidron', no: 88,  types: ['rock','ground'], biomes: ['rocky'], hp: 35, atk: 45, speed: 1.8, scale: 2.6, catch: 0.22, rarity: 'rare', evolveTo: 'ferrodron', stoneEvo: true },
  somnol:    { name: 'Somnol', no: 89,  types: ['psychic'], biomes: ['night','plains'], hp: 60, atk: 48, speed: 1.9, scale: 1.6, catch: 0.45, rarity: 'common', evolveTo: 'somnarch', evolveLv: 26 },
  somnarch:      { name: 'Somnarch', no: 90,  types: ['psychic'], biomes: ['night'], hp: 85, atk: 73, speed: 2.2, scale: 2.1, catch: 0.20, rarity: 'rare' },
  klaxit:     { name: 'Klaxit', no: 91,  types: ['water'], biomes: ['beach'], hp: 30, atk: 105, speed: 1.7, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'klaxovor', evolveLv: 28 },
  klaxovor:    { name: 'Klaxovor', no: 92,  types: ['water'], biomes: ['beach'], hp: 55, atk: 130, speed: 2.0, scale: 1.9, catch: 0.22, rarity: 'uncommon' },
  orbix:    { name: 'Orbix', no: 93, types: ['electric'], biomes: ['rocky','plains'], hp: 40, atk: 30, speed: 2.6, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'orbolith', evolveLv: 30 },
  orbolith:  { name: 'Orbolith', no: 94, types: ['electric'], biomes: ['rocky'], hp: 60, atk: 50, speed: 3.5, scale: 1.8, catch: 0.22, rarity: 'uncommon' },
  nucella:  { name: 'Nucella', no: 95, types: ['grass','psychic'], biomes: ['forest','swamp'], hp: 60, atk: 40, speed: 1.5, scale: 1.4, catch: 0.45, rarity: 'common', evolveTo: 'nucellith', stoneEvo: true },
  nucellith:  { name: 'Nucellith', no: 96, types: ['grass','psychic'], biomes: ['swamp'], hp: 95, atk: 95, speed: 1.7, scale: 2.5, catch: 0.16, rarity: 'rare' },
  ossulit:     { name: 'Ossulit', no: 97, types: ['ground'], biomes: ['rocky','desert','night'], hp: 50, atk: 50, speed: 1.7, scale: 1.5, catch: 0.45, rarity: 'uncommon', evolveTo: 'ossulord', evolveLv: 28 },
  ossulord:    { name: 'Ossulord', no: 98, types: ['ground'], biomes: ['desert','night'], hp: 60, atk: 80, speed: 2.0, scale: 1.9, catch: 0.22, rarity: 'rare' },
  vantrik:  { name: 'Vantrik', no: 99, types: ['fighting'], biomes: ['rocky'], hp: 50, atk: 120, speed: 2.7, scale: 1.9, catch: 0.20, rarity: 'rare', aggressive: true },
  poncural: { name: 'Poncural', no: 100, types: ['fighting'], biomes: ['rocky'], hp: 50, atk: 105, speed: 2.6, scale: 1.9, catch: 0.20, rarity: 'rare', aggressive: true },
  fumel:    { name: 'Fumel', no: 101, types: ['poison'], biomes: ['swamp','night'], hp: 40, atk: 65, speed: 2.0, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'fumorox', evolveLv: 35 },
  fumorox:    { name: 'Fumorox', no: 102, types: ['poison'], biomes: ['swamp','night'], hp: 65, atk: 90, speed: 2.0, scale: 1.9, catch: 0.20, rarity: 'uncommon' },
  drombit:    { name: 'Drombit', no: 103, types: ['ground','rock'], biomes: ['desert','rocky'], hp: 80, atk: 85, speed: 1.6, scale: 1.9, catch: 0.40, rarity: 'uncommon', evolveTo: 'dromborn', evolveLv: 42, aggressive: true },
  dromborn:     { name: 'Dromborn', no: 104, types: ['ground','rock'], biomes: ['desert'], hp: 105, atk: 130, speed: 1.8, scale: 2.5, catch: 0.12, rarity: 'rare', aggressive: true },
  vinethra:    { name: 'Vinethra', no: 105, types: ['grass'], biomes: ['swamp','forest'], hp: 65, atk: 55, speed: 1.7, scale: 1.7, catch: 0.40, rarity: 'uncommon' },
  marsuvox: { name: 'Marsuvox', no: 106, types: ['normal'], biomes: ['plains','desert'], hp: 105, atk: 95, speed: 2.4, scale: 2.4, catch: 0.16, rarity: 'rare', aggressive: true },
  hippocel:     { name: 'Hippocel', no: 107, types: ['water'], biomes: ['beach'], hp: 30, atk: 40, speed: 2.0, scale: 1.3, catch: 0.50, rarity: 'common', evolveTo: 'hippocraith', evolveLv: 32 },
  hippocraith:     { name: 'Hippocraith', no: 108, types: ['water'], biomes: ['beach'], hp: 55, atk: 95, speed: 2.6, scale: 1.8, catch: 0.22, rarity: 'uncommon' },
  finaret:    { name: 'Finaret', no: 109, types: ['water'], biomes: ['beach'], hp: 45, atk: 67, speed: 2.3, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'finarex', evolveLv: 33 },
  finarex:    { name: 'Finarex', no: 110, types: ['water'], biomes: ['beach'], hp: 80, atk: 92, speed: 2.6, scale: 1.9, catch: 0.24, rarity: 'uncommon' },
  stelluna:     { name: 'Stelluna', no: 111, types: ['water'], biomes: ['beach'], hp: 30, atk: 45, speed: 2.4, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'stellumis', stoneEvo: true },
  stellumis:    { name: 'Stellumis', no: 112, types: ['water','psychic'], biomes: ['beach'], hp: 60, atk: 75, speed: 3.3, scale: 1.9, catch: 0.18, rarity: 'rare' },
  zathryx:    { name: 'Zathryx', no: 113, types: ['bug','flying'], biomes: ['forest','plains'], hp: 70, atk: 110, speed: 3.2, scale: 2.1, catch: 0.18, rarity: 'rare', aggressive: true },
  glacenna:       { name: 'Glacenna', no: 114, types: ['ice','psychic'], biomes: ['snow'], hp: 65, atk: 75, speed: 2.6, scale: 1.9, catch: 0.22, rarity: 'rare' },
  fulminox: { name: 'Fulminox', no: 115, types: ['electric'], biomes: ['rocky','night'], hp: 65, atk: 95, speed: 3.1, scale: 1.9, catch: 0.20, rarity: 'rare' },
  magrend:     { name: 'Magrend', no: 116, types: ['fire'], biomes: ['desert','rocky'], hp: 65, atk: 100, speed: 2.9, scale: 1.9, catch: 0.20, rarity: 'rare', aggressive: true },
  cleaveth:     { name: 'Cleaveth', no: 117, types: ['bug'], biomes: ['forest'], hp: 65, atk: 125, speed: 2.7, scale: 2.1, catch: 0.18, rarity: 'rare', aggressive: true },
  ossandor:     { name: 'Ossandor', no: 118, types: ['normal'], biomes: ['plains','desert'], hp: 75, atk: 100, speed: 3.1, scale: 2.1, catch: 0.20, rarity: 'rare', aggressive: true },
  fluvik:   { name: 'Fluvik', no: 119, types: ['water'], biomes: ['beach'], hp: 20, atk: 10, speed: 2.0, scale: 1.5, catch: 0.70, rarity: 'common', evolveTo: 'leviadrax', evolveLv: 20 },
  leviadrax:   { name: 'Leviadrax', no: 120, types: ['water','flying'], biomes: ['beach'], hp: 95, atk: 125, speed: 2.6, scale: 2.8, catch: 0.08, rarity: 'rare', aggressive: true },
  thalassor:     { name: 'Thalassor', no: 121, types: ['water','ice'], biomes: ['beach'], hp: 130, atk: 85, speed: 1.6, scale: 2.7, catch: 0.06, rarity: 'rare' },
  isomorf:      { name: 'Isomorf', no: 122, types: ['normal'], biomes: ['plains','night'], hp: 48, atk: 48, speed: 2.2, scale: 1.4, catch: 0.30, rarity: 'rare' },
  fenkit:      { name: 'Fenkit', no: 123, types: ['normal'], biomes: ['forest','plains'], hp: 55, atk: 55, speed: 2.5, scale: 1.5, catch: 0.30, rarity: 'rare', evolveTo: 'fenundine', stoneEvo: true },
  fenundine:   { name: 'Fenundine', no: 124, types: ['water'], biomes: ['beach'], hp: 130, atk: 65, speed: 2.4, scale: 2.0, catch: 0.14, rarity: 'rare' },
  fenfulmen:    { name: 'Fenfulmen', no: 125, types: ['electric'], biomes: ['plains'], hp: 65, atk: 65, speed: 3.6, scale: 2.0, catch: 0.14, rarity: 'rare' },
  fenember:    { name: 'Fenember', no: 126, types: ['fire'], biomes: ['desert'], hp: 65, atk: 130, speed: 2.9, scale: 2.0, catch: 0.14, rarity: 'rare' },
  spiralek:    { name: 'Spiralek', no: 127, types: ['rock','water'], biomes: ['beach'], hp: 35, atk: 40, speed: 1.6, scale: 1.4, catch: 0.40, rarity: 'uncommon', evolveTo: 'spiraloth', evolveLv: 40 },
  spiraloth:    { name: 'Spiraloth', no: 128, types: ['rock','water'], biomes: ['beach'], hp: 70, atk: 60, speed: 1.8, scale: 1.9, catch: 0.16, rarity: 'rare' },
  carapin:     { name: 'Carapin', no: 129, types: ['rock','water'], biomes: ['beach'], hp: 30, atk: 80, speed: 1.8, scale: 1.4, catch: 0.40, rarity: 'uncommon', evolveTo: 'carapex', evolveLv: 40 },
  carapex:   { name: 'Carapex', no: 130, types: ['rock','water'], biomes: ['beach'], hp: 60, atk: 115, speed: 2.6, scale: 2.0, catch: 0.16, rarity: 'rare', aggressive: true },
  ossiwing: { name: 'Ossiwing', no: 131, types: ['rock','flying'], biomes: ['rocky','desert'], hp: 80, atk: 105, speed: 3.7, scale: 2.5, catch: 0.10, rarity: 'rare', aggressive: true },
  drowsuth:    { name: 'Drowsuth', no: 132, types: ['normal'], biomes: ['forest'], hp: 160, atk: 110, speed: 1.2, scale: 2.8, catch: 0.08, rarity: 'rare' },
  glacivara:   { name: 'Glacivara', no: 133, types: ['ice','flying'], biomes: ['snow'], hp: 160, atk: 95, speed: 2.8, scale: 2.8, catch: 0.03, rarity: 'legend', legendary: true },
  tempestrix:     { name: 'Tempestrix', no: 134, types: ['electric','flying'], biomes: ['rocky'], hp: 160, atk: 125, speed: 3.2, scale: 2.8, catch: 0.03, rarity: 'legend', legendary: true },
  ashkindra:    { name: 'Ashkindra', no: 135, types: ['fire','flying'], biomes: ['desert'], hp: 160, atk: 125, speed: 3.0, scale: 2.8, catch: 0.03, rarity: 'legend', legendary: true },
  wyrmel:    { name: 'Wyrmel', no: 136, types: ['dragon'], biomes: ['beach'], hp: 41, atk: 64, speed: 2.4, scale: 1.5, catch: 0.20, rarity: 'rare', evolveTo: 'wyrmalis', evolveLv: 30 },
  wyrmalis:  { name: 'Wyrmalis', no: 137, types: ['dragon'], biomes: ['beach'], hp: 61, atk: 84, speed: 2.8, scale: 2.2, catch: 0.12, rarity: 'rare', evolveTo: 'wyrmagon', evolveLv: 55 },
  wyrmagon:  { name: 'Wyrmagon', no: 138, types: ['dragon','flying'], biomes: ['beach'], hp: 91, atk: 134, speed: 3.0, scale: 2.7, catch: 0.05, rarity: 'legend', aggressive: true },
  cognivex:     { name: 'Cognivex', no: 139, types: ['psychic'], biomes: ['night'], hp: 200, atk: 154, speed: 3.4, scale: 2.8, catch: 0.02, rarity: 'legend', legendary: true, aggressive: true },
  sprithe:        { name: 'Sprithe', no: 140, types: ['psychic'], biomes: ['forest','plains','night'], hp: 150, atk: 100, speed: 3.2, scale: 1.8, catch: 0.02, rarity: 'legend', legendary: true },
  // --- snow biome (gen 2/3 cold dwellers) ---
  shivrik:    { name: 'Shivrik', no: 141, types: ['dark','ice'], biomes: ['snow','night'], hp: 55, atk: 95, speed: 3.1, scale: 1.6, catch: 0.25, rarity: 'rare', aggressive: true },
  snoukit:     { name: 'Snoukit', no: 142, types: ['ice','ground'], biomes: ['snow'], hp: 50, atk: 50, speed: 1.7, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'snoukrag', evolveLv: 33 },
  snoukrag:  { name: 'Snoukrag', no: 143, types: ['ice','ground'], biomes: ['snow'], hp: 100, atk: 100, speed: 1.6, scale: 2.1, catch: 0.20, rarity: 'rare' },
  rimelet:    { name: 'Rimelet', no: 144, types: ['ice'], biomes: ['snow'], hp: 50, atk: 50, speed: 1.9, scale: 1.4, catch: 0.45, rarity: 'uncommon', evolveTo: 'rimalisk', evolveLv: 42 },
  rimalisk:     { name: 'Rimalisk', no: 145, types: ['ice'], biomes: ['snow'], hp: 80, atk: 80, speed: 2.4, scale: 2.1, catch: 0.18, rarity: 'rare' },
  blubbit:     { name: 'Blubbit', no: 146, types: ['ice','water'], biomes: ['snow','beach'], hp: 70, atk: 40, speed: 1.4, scale: 1.5, catch: 0.50, rarity: 'common', evolveTo: 'blubbrox', evolveLv: 32 },
  blubbrox:     { name: 'Blubbrox', no: 147, types: ['ice','water'], biomes: ['snow'], hp: 90, atk: 60, speed: 1.6, scale: 1.9, catch: 0.26, rarity: 'uncommon', evolveTo: 'blubbrolith', evolveLv: 44 },
  blubbrolith:    { name: 'Blubbrolith', no: 148, types: ['ice','water'], biomes: ['snow'], hp: 110, atk: 80, speed: 1.6, scale: 2.5, catch: 0.14, rarity: 'rare' },
  ferrodron:    { name: 'Ferrodron', no: 149, types: ['steel','ground'], biomes: ['rocky'], hp: 75, atk: 85, speed: 1.6, scale: 2.7, catch: 0.10, rarity: 'rare' },
};

export const STARTERS = ['sprigling', 'vulmis', 'aqulet', 'sparqit', 'fenkit'];

// ---------- items ----------
export const ITEMS = {
  // resources
  wood:       { name: 'Wood',        kind: 'resource' },
  stone:      { name: 'Stone',       kind: 'resource' },
  fiber:      { name: 'Fiber',       kind: 'resource' },
  // materials (rarer, used in advanced recipes)
  iron:       { name: 'Iron',        kind: 'material' },
  crystal:    { name: 'Crystal',     kind: 'material' },
  hide:       { name: 'Hide',        kind: 'material' },
  herb:       { name: 'Herb',        kind: 'material' },
  mushroom:   { name: 'Mushroom',    kind: 'material' },
  fish:       { name: 'Raw Fish',    kind: 'material' },
  pearl:      { name: 'Pearl',       kind: 'material' },
  // currency
  gold:       { name: 'Gold',        kind: 'currency' },
  // food (heal + restore hunger; some grant a timed buff)
  berry:      { name: 'Berry',        kind: 'food', heal: 18, hunger: 25 },
  stew:       { name: 'Hearty Stew',  kind: 'food', heal: 55, hunger: 75, buff: 'wellfed' },
  jerky:      { name: 'Jerky',        kind: 'food', heal: 22, hunger: 60, buff: 'energized' },
  berrypie:   { name: 'Berry Pie',    kind: 'food', heal: 45, hunger: 50, buff: 'lucky' },
  grilledfish:{ name: 'Grilled Fish', kind: 'food', heal: 48, hunger: 58, buff: 'rested' },
  // potions (heal your LEAD creature)
  potion:     { name: 'Potion',       kind: 'potion', heal: 45 },
  superpotion:{ name: 'Super Potion', kind: 'potion', heal: 110 },
  // balls
  ball:       { name: 'Binding Charm', kind: 'ball', mult: 1 },
  greatball:  { name: 'Greater Ward', kind: 'ball', mult: 1.8 },
  ultraball:  { name: 'Arcane Seal',  kind: 'ball', mult: 3 },
  masterball: { name: 'Grand Rune',   kind: 'ball', mult: 255 },
  // tools (unique — own one forever)
  axe:        { name: 'Axe',          kind: 'tool' },
  pickaxe:    { name: 'Pickaxe',      kind: 'tool' },
  fishingrod: { name: 'Fishing Rod',  kind: 'tool' },
  lantern:    { name: 'Lantern',      kind: 'tool' },
  // misc
  evostone:   { name: 'Awakening Rune', kind: 'evostone' },
};

// creatures that live ON the water (spawn & swim in the lake)
export const SEA = ['aqulet', 'aqulor', 'aquloth', 'duvanel', 'duvarex', 'vorlin', 'vorlinth',
  'nerith', 'nerithul', 'ponderu', 'ponderath', 'conchip', 'conchral', 'klaxit', 'klaxovor',
  'hippocel', 'hippocraith', 'finaret', 'finarex', 'stelluna', 'stellumis', 'fluvik', 'leviadrax',
  'wyrmel', 'wyrmalis', 'wyrmagon', 'thalassor', 'blubbit', 'blubbrox', 'blubbrolith', 'phocil', 'phocaine',
  'spiralek', 'spiraloth', 'carapin', 'carapex', 'fenundine'];

// fish caught with a rod at the lake (weighted loot table)
export const FISH = [
  { item: 'fish', qty: 1, w: 5 },
  { item: 'fish', qty: 2, w: 3 },
  { item: 'pearl', qty: 1, w: 1 },
  { item: 'crystal', qty: 1, w: 0.5 },
  { item: 'evostone', qty: 1, w: 0.4 },
];

// timed buffs granted by eating good food
export const BUFFS = {
  wellfed:   { name: 'Well Fed',   color: '#ff8fa0', dur: 90,  hpRegen: 2.2 },
  energized: { name: 'Energized',  color: '#7ad0ff', dur: 80,  stamRegen: 12, speed: 1.18 },
  lucky:     { name: 'Lucky',      color: '#ffd24a', dur: 70,  catchBonus: 0.15 },
  rested:    { name: 'Rested',     color: '#b8f25f', dur: 100, xpMult: 1.5 },
};

// craftable. Tools are unique. `cook:true` recipes need a lit campfire nearby.
export const RECIPES = [
  { id: 'ball',      out: 'ball',      qty: 1, cost: { wood: 2, stone: 1 } },
  { id: 'greatball', out: 'greatball', qty: 1, cost: { wood: 3, stone: 2, fiber: 1 }, unlock: 2 },
  { id: 'ultraball', out: 'ultraball', qty: 1, cost: { stone: 4, fiber: 3, iron: 1 }, unlock: 8 },
  { id: 'masterball',out: 'masterball',qty: 1, cost: { crystal: 3, iron: 5, evostone: 2 }, unlock: 30 },
  { id: 'axe',       out: 'axe',       qty: 1, cost: { wood: 8, stone: 4, fiber: 2 }, unique: true },
  { id: 'pickaxe',   out: 'pickaxe',   qty: 1, cost: { wood: 6, stone: 8 }, unique: true },
  { id: 'fishingrod',out: 'fishingrod',qty: 1, cost: { wood: 5, fiber: 4 }, unique: true },
  { id: 'lantern',   out: 'lantern',   qty: 1, cost: { iron: 2, wood: 3, fiber: 2 }, unique: true, unlock: 5 },
  { id: 'potion',    out: 'potion',    qty: 1, cost: { herb: 2, berry: 1 } },
  { id: 'superpotion',out: 'superpotion',qty: 1, cost: { herb: 3, crystal: 1 }, unlock: 6 },
  { id: 'stew',      out: 'stew',      qty: 1, cost: { hide: 1, herb: 1, mushroom: 1 }, cook: true },
  { id: 'jerky',     out: 'jerky',     qty: 2, cost: { hide: 2 }, cook: true },
  { id: 'berrypie',  out: 'berrypie',  qty: 1, cost: { berry: 4, herb: 1 }, cook: true },
  { id: 'grilledfish',out: 'grilledfish',qty: 1, cost: { fish: 1 }, cook: true },
];

// trader: barter gathered resources for goods (no gold needed)
export const SHOP_OFFERS = [
  { give: { wood: 4 }, get: 'ball', qty: 1 },
  { give: { stone: 6, fiber: 2 }, get: 'greatball', qty: 1 },
  { give: { fiber: 5, stone: 4 }, get: 'ultraball', qty: 1 },
  { give: { wood: 3 }, get: 'berry', qty: 2 },
  { give: { hide: 2 }, get: 'jerky', qty: 1 },
  { give: { herb: 3 }, get: 'potion', qty: 1 },
  { give: { stone: 10, fiber: 5 }, get: 'evostone', qty: 1 },
];

// gold prices the trader pays when you SELL surplus
export const SELL_PRICES = {
  wood: 1, stone: 1, fiber: 2, berry: 1, meat: 4, mushroom: 3, herb: 2,
  fish: 3, hide: 6, iron: 8, crystal: 22, pearl: 28, evostone: 35,
};

// gold shop: buy with the gold you earn from selling & defeating creatures
export const GOLD_SHOP = [
  { get: 'ball', qty: 5, price: 25 },
  { get: 'greatball', qty: 3, price: 45 },
  { get: 'ultraball', qty: 2, price: 90 },
  { get: 'potion', qty: 3, price: 35 },
  { get: 'superpotion', qty: 1, price: 70 },
  { get: 'iron', qty: 5, price: 60 },
  { get: 'crystal', qty: 1, price: 130 },
  { get: 'evostone', qty: 1, price: 160 },
  { get: 'masterball', qty: 1, price: 2500 },
];

// ---------- buildings (placed in the world) ----------
export const BUILDINGS = {
  campfire:   { name: 'Campfire', cost: { wood: 4, stone: 2 }, light: true, fire: true },
  wall:       { name: 'Wood Wall', cost: { wood: 3 } },
  torch:      { name: 'Torch', cost: { wood: 2 }, light: true },
  chest:      { name: 'Storage Chest', cost: { wood: 6 } },
  tent:       { name: 'Tent', cost: { wood: 8, fiber: 4 }, unlock: 2, rest: true },
  // automated production — unlock as you register more species
  farm:       { name: 'Berry Farm', cost: { wood: 10, fiber: 6 }, produces: { item: 'berry', every: 11 }, unlock: 3 },
  herbgarden: { name: 'Herb Garden', cost: { wood: 8, fiber: 8 }, produces: { item: 'herb', every: 13 }, unlock: 4 },
  lumberyard: { name: 'Lumber Mill', cost: { wood: 14, stone: 6 }, produces: { item: 'wood', every: 13 }, unlock: 5 },
  mine:       { name: 'Stone Mine', cost: { wood: 8, stone: 12 }, produces: { item: 'stone', every: 15 }, unlock: 7 },
  well:       { name: 'Fiber Well', cost: { stone: 10, wood: 6 }, produces: { item: 'fiber', every: 16 }, unlock: 10 },
  forge:      { name: 'Iron Forge', cost: { stone: 18, wood: 10, iron: 2 }, produces: { item: 'iron', every: 22 }, unlock: 12 },
  fishtrap:   { name: 'Fish Trap', cost: { wood: 12, fiber: 8 }, produces: { item: 'fish', every: 18 }, unlock: 9 },
  crystalrig: { name: 'Crystal Rig', cost: { stone: 24, iron: 6 }, produces: { item: 'crystal', every: 30 }, unlock: 18 },
};

// ---------- achievements (long-tail completion goals; reward gold/items) ----------
export const ACHIEVEMENTS = [
  { id: 'firstcatch', name: 'Gotcha!',        desc: 'Catch your first creature',     stat: 'caught',   need: 1,   reward: { gold: 30 } },
  { id: 'lumber',     name: 'Lumberjack',     desc: 'Gather 100 wood',               stat: 'wood',     need: 100, reward: { gold: 40 } },
  { id: 'miner',      name: 'Quarryman',      desc: 'Mine 100 stone',                stat: 'stone',    need: 100, reward: { gold: 40 } },
  { id: 'builder',    name: 'Settler',        desc: 'Build 10 structures',           stat: 'built',    need: 10,  reward: { gold: 60 } },
  { id: 'angler',     name: 'Angler',         desc: 'Catch 15 fish',                 stat: 'fished',   need: 15,  reward: { gold: 50, evostone: 1 } },
  { id: 'cook',       name: 'Camp Cook',      desc: 'Cook 10 meals',                 stat: 'cooked',   need: 10,  reward: { gold: 50 } },
  { id: 'brawler',    name: 'Beast Tamer',    desc: 'Defeat 20 aggressive creatures',stat: 'defeated', need: 20,  reward: { gold: 80 } },
  { id: 'bestiary25', name: 'Field Scholar',  desc: 'Register 25 species',           stat: 'species',  need: 25,  reward: { gold: 120, ultraball: 3 } },
  { id: 'bestiary50',  name: 'Naturalist',     desc: 'Register 50 species',           stat: 'species',  need: 50,  reward: { gold: 250, evostone: 3 } },
  { id: 'bestiaryall', name: 'Living Bestiary', desc: 'Register every species',        stat: 'species',  need: 149, reward: { gold: 1000, masterball: 1 } },
  { id: 'rich',       name: 'Tycoon',         desc: 'Earn 1000 gold total',          stat: 'goldEarned',need: 1000,reward: { masterball: 1 } },
  { id: 'evos',       name: 'Evolutionary',   desc: 'Evolve 10 creatures',           stat: 'evolved',  need: 10,  reward: { gold: 150, evostone: 2 } },
  { id: 'boss',       name: 'Legend Hunter',  desc: 'Defeat or catch 3 Alphas',      stat: 'bossKills',need: 3,   reward: { gold: 300, masterball: 1 } },
  { id: 'survivor',   name: 'Survivor',       desc: 'Survive to Day 20',             stat: 'days',     need: 20,  reward: { gold: 200, evostone: 2 } },
  { id: 'level20',    name: 'Seasoned',       desc: 'Reach player level 20',         stat: 'plevel',   need: 20,  reward: { gold: 200 } },
  { id: 'gloam1',     name: 'Gloamfang Slayer',desc: 'Defeat the world boss Gloamfang',stat: 'gloamKills',need: 1,  reward: { gold: 500, masterball: 1, evostone: 3 } },
  { id: 'gloam5',     name: 'Bane of the Gloam',desc: 'Defeat Gloamfang 5 times',     stat: 'gloamKills',need: 5,  reward: { gold: 2000, masterball: 2 } },
  { id: 'hatcher',    name: 'Cradle Keeper',  desc: 'Hatch 10 eggs',                 stat: 'hatched',  need: 10,  reward: { gold: 300, evostone: 2 } },
  { id: 'chainmaster',name: 'Chain Master',   desc: 'Reach a catch chain of 20',     stat: 'bestChain',need: 20,  reward: { gold: 400, ultraball: 5 } },
  { id: 'ascend1',    name: 'Ascendant',      desc: 'Ascend for the first time',     stat: 'ascend',   need: 1,   reward: { gold: 500, masterball: 1 } },
];

// individual "potential": a creature's IV (0..1) nudges its max HP a little
// (±8%), so even a duplicate species is worth re-catching for a better roll.
export const ivHpMult = (iv) => 1 + ((iv == null ? 0.5 : iv) - 0.5) * 0.16;

// player levels from XP; perks scale automatically with level.
export const PERKS = {
  xpNeeded: (lvl) => 40 + lvl * 35,
  gatherBonus: (lvl) => Math.floor(lvl / 3),       // +1 gather damage every 3 levels
  maxHpBonus: (lvl) => lvl * 4,
  maxStamBonus: (lvl) => lvl * 3,
  catchBonus: (lvl) => Math.min(0.25, lvl * 0.008), // up to +25% catch rate
  speedBonus: (lvl) => Math.min(40, lvl * 1.5),     // up to +40 move speed
};

export { TYPE_CHART };

// ============================================================
// WANDERMERE depth & retention systems
// ============================================================

// ---- permanent upgrades bought with gold (the gold sink) ----
// cost(level) = round(base * growth^level). effect read by Meta.up*()
export const UPGRADES = [
  { id: 'catch',   name: 'Keeper’s Charm', desc: '+3% catch rate per level',          icon: 'ultraball', base: 120,  growth: 1.7,  max: 12 },
  { id: 'gather',  name: 'Sturdy Tools',        desc: '+15% gathering yield per level',     icon: 'axe',       base: 90,   growth: 1.65, max: 10 },
  { id: 'xp',      name: 'Mentor’s Insight',desc: '+12% all XP per level',             icon: 'evostone',  base: 140,  growth: 1.7,  max: 12 },
  { id: 'gold',    name: 'Merchant’s Eye',  desc: '+12% gold earned per level',        icon: 'gold',      base: 150,  growth: 1.72, max: 12 },
  { id: 'speed',   name: 'Swift Boots',          desc: '+8 move speed per level',           icon: 'grilledfish',base: 110,  growth: 1.6,  max: 8  },
  { id: 'party',   name: 'Pack Bond',            desc: '+1 creature in your active team',   icon: 'potion',    base: 600,  growth: 3.0,  max: 3  },
  { id: 'farm',    name: 'Industry',             desc: '−15% production time per level', icon: 'iron',      base: 130,  growth: 1.66, max: 10 },
  { id: 'offline', name: 'Caretaker',            desc: '+2h offline production cap per level',icon: 'crystal',   base: 100,  growth: 1.7,  max: 8  },
  { id: 'shiny',   name: 'Gloam Sight',          desc: '+50% shiny odds per level',         icon: 'pearl',     base: 200,  growth: 1.85, max: 8  },
  { id: 'luck',    name: 'Wanderer’s Luck', desc: '+8% rare-drop & high-IV chance',    icon: 'masterball',base: 180,  growth: 1.8,  max: 8  },
];

// ---- Ascension (repeatable prestige; the ultimate gold sink) ----
// each tier grants a permanent stacking multiplier. cost rises steeply.
export const ASCENSION = {
  baseCost: 5000,            // gold for the first Ascension
  growth: 2.4,               // cost *= growth each tier
  xpPer: 0.20,               // +20% XP per tier
  goldPer: 0.20,             // +20% gold per tier
  shinyPer: 0.50,            // +50% shiny odds per tier
  rarePer: 0.12,             // +12% rare-spawn weight per tier
  reqSpecies: 30,            // need this many species registered before the first Ascension
};

// ---- daily quests: 3 are picked each day (seeded by date) ----
export const DAILY_POOL = [
  { id: 'catch',   stat: 'caught',   verb: 'Catch',        min: 6,  max: 14, per: 12, gold: 70 },
  { id: 'wood',    stat: 'wood',     verb: 'Gather',  unit:'wood',  min: 30, max: 70, per: 1,  gold: 50 },
  { id: 'stone',   stat: 'stone',    verb: 'Mine',    unit:'stone', min: 30, max: 70, per: 1,  gold: 50 },
  { id: 'defeat',  stat: 'defeated', verb: 'Defeat',  unit:'wild foes', min: 4, max: 10, per: 18, gold: 80 },
  { id: 'cook',    stat: 'cooked',   verb: 'Cook',    unit:'meals', min: 3,  max: 8,  per: 22, gold: 60 },
  { id: 'fish',    stat: 'fished',   verb: 'Reel in', unit:'fish',  min: 4,  max: 10, per: 16, gold: 60 },
  { id: 'walk',    stat: 'steps',    verb: 'Travel',  unit:'paces', min: 1200, max: 2600, per: 0.04, gold: 55 },
  { id: 'build',   stat: 'built',    verb: 'Build',   unit:'structures', min: 2, max: 5, per: 30, gold: 70 },
];

// daily login streak rewards (index = streak day, capped at last)
export const STREAK_REWARDS = [
  { gold: 40 },
  { gold: 60, ball: 5 },
  { gold: 90, greatball: 3 },
  { gold: 120, evostone: 1 },
  { gold: 160, ultraball: 3 },
  { gold: 220, evostone: 2 },
  { gold: 320, masterball: 1 },   // 7-day streak jackpot
];

// ---- step-hatched eggs (rare — ~4-5 min of walking per egg) ----
export const EGG = {
  stepsNeeded: 36000,        // movement units to fill the incubator (was 1400 — far too frequent)
  shinyBonus: 2.5,          // egg shiny odds vs wild base
  ivFloor: 0.35,            // eggs never roll a terrible creature
};

// species that can appear as the roaming world boss "Gloamfang"
// (filtered against SPECIES at runtime, so a missing key is harmless)
export const BOSS_POOL = ['leviadrax', 'brausorn', 'dromborn', 'stonokrag', 'brawnoth', 'miregeist', 'wyrmagon', 'sprigothar', 'vulmagor', 'aquloth', 'drowsuth'];

export const BOSS = {
  name: 'Gloamfang',
  everyMin: 5.5,            // a boss prowls roughly this often (real minutes)
  firstDelayMin: 3,        // grace period before the first one
  hpMult: 9,               // vs a normal creature of its level
  lvlBonus: 24,            // added on top of the local danger level
};


