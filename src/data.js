// ============================================================
// TERRATAMERS — game data: creature species, items, recipes,
// buildings, economy, achievements & player perks. Creature art
// streams from the PokeAPI sprite archive at runtime.
// ============================================================

export const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
// Gen-5 (Black/White) pixel sprites — a proper retro 8-bit look for every species
export const spriteUrl = (dex, shiny) =>
  SPRITE_BASE + 'versions/generation-v/black-white/' + (shiny ? 'shiny/' : '') + dex + '.png';

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
  bulbasaur:  { name: 'Bulbasaur',  dex: 1,   types: ['grass','poison'], biomes: ['forest','plains'], hp: 45, atk: 49, speed: 2.0, scale: 1.6, catch: 0.45, rarity: 'common', evolveTo: 'ivysaur', evolveLv: 16 },
  ivysaur:    { name: 'Ivysaur',    dex: 2,   types: ['grass','poison'], biomes: ['forest'], hp: 60, atk: 62, speed: 2.0, scale: 1.9, catch: 0.30, rarity: 'uncommon', evolveTo: 'venusaur', evolveLv: 32 },
  venusaur:   { name: 'Venusaur',   dex: 3,   types: ['grass','poison'], biomes: ['forest'], hp: 80, atk: 82, speed: 1.9, scale: 2.6, catch: 0.14, rarity: 'rare' },
  charmander: { name: 'Charmander', dex: 4,   types: ['fire'], biomes: ['rocky','plains'], hp: 39, atk: 52, speed: 2.3, scale: 1.6, catch: 0.45, rarity: 'common', evolveTo: 'charmeleon', evolveLv: 16 },
  charmeleon: { name: 'Charmeleon', dex: 5,   types: ['fire'], biomes: ['rocky'], hp: 58, atk: 64, speed: 2.4, scale: 1.9, catch: 0.28, rarity: 'uncommon', evolveTo: 'charizard', evolveLv: 36 },
  charizard:  { name: 'Charizard',  dex: 6,   types: ['fire','flying'], biomes: ['rocky','desert'], hp: 78, atk: 84, speed: 2.8, scale: 2.7, catch: 0.10, rarity: 'rare' },
  squirtle:   { name: 'Squirtle',   dex: 7,   types: ['water'], biomes: ['beach'], hp: 44, atk: 48, speed: 2.0, scale: 1.6, catch: 0.45, rarity: 'common', evolveTo: 'wartortle', evolveLv: 16 },
  wartortle:  { name: 'Wartortle',  dex: 8,   types: ['water'], biomes: ['beach'], hp: 59, atk: 63, speed: 2.0, scale: 1.9, catch: 0.28, rarity: 'uncommon', evolveTo: 'blastoise', evolveLv: 36 },
  blastoise:  { name: 'Blastoise',  dex: 9,   types: ['water'], biomes: ['beach'], hp: 79, atk: 83, speed: 1.9, scale: 2.6, catch: 0.12, rarity: 'rare' },
  caterpie:   { name: 'Caterpie',   dex: 10,  types: ['bug'], biomes: ['forest','plains'], hp: 45, atk: 30, speed: 1.6, scale: 1.3, catch: 0.65, rarity: 'common', evolveTo: 'metapod', evolveLv: 7 },
  metapod:    { name: 'Metapod',    dex: 11,  types: ['bug'], biomes: ['forest'], hp: 50, atk: 20, speed: 1.0, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'butterfree', evolveLv: 10 },
  butterfree: { name: 'Butterfree', dex: 12,  types: ['bug','flying'], biomes: ['forest','plains'], hp: 60, atk: 45, speed: 2.7, scale: 1.9, catch: 0.30, rarity: 'uncommon' },
  weedle:     { name: 'Weedle',     dex: 13,  types: ['bug','poison'], biomes: ['forest'], hp: 40, atk: 35, speed: 1.7, scale: 1.3, catch: 0.65, rarity: 'common', evolveTo: 'kakuna', evolveLv: 7 },
  kakuna:     { name: 'Kakuna',     dex: 14,  types: ['bug','poison'], biomes: ['forest'], hp: 45, atk: 25, speed: 1.0, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'beedrill', evolveLv: 10 },
  beedrill:   { name: 'Beedrill',   dex: 15,  types: ['bug','poison'], biomes: ['forest','swamp'], hp: 65, atk: 80, speed: 2.9, scale: 2.0, catch: 0.28, rarity: 'uncommon', aggressive: true },
  pidgey:     { name: 'Pidgey',     dex: 16,  types: ['normal','flying'], biomes: ['plains','forest'], hp: 40, atk: 45, speed: 2.6, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'pidgeotto', evolveLv: 18 },
  pidgeotto:  { name: 'Pidgeotto',  dex: 17,  types: ['normal','flying'], biomes: ['plains'], hp: 63, atk: 60, speed: 2.9, scale: 1.9, catch: 0.30, rarity: 'uncommon', evolveTo: 'pidgeot', evolveLv: 36 },
  pidgeot:    { name: 'Pidgeot',    dex: 18,  types: ['normal','flying'], biomes: ['plains'], hp: 83, atk: 80, speed: 3.3, scale: 2.5, catch: 0.14, rarity: 'rare' },
  rattata:    { name: 'Rattata',    dex: 19,  types: ['normal'], biomes: ['plains','night'], hp: 30, atk: 56, speed: 2.7, scale: 1.3, catch: 0.60, rarity: 'common', evolveTo: 'raticate', evolveLv: 20 },
  raticate:   { name: 'Raticate',   dex: 20,  types: ['normal'], biomes: ['plains','night'], hp: 55, atk: 81, speed: 2.9, scale: 1.7, catch: 0.32, rarity: 'uncommon' },
  spearow:    { name: 'Spearow',    dex: 21,  types: ['normal','flying'], biomes: ['plains','desert'], hp: 40, atk: 60, speed: 2.8, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'fearow', evolveLv: 20 },
  fearow:     { name: 'Fearow',     dex: 22,  types: ['normal','flying'], biomes: ['plains','desert'], hp: 65, atk: 90, speed: 3.2, scale: 2.2, catch: 0.26, rarity: 'uncommon', aggressive: true },
  ekans:      { name: 'Ekans',      dex: 23,  types: ['poison'], biomes: ['plains','desert'], hp: 35, atk: 60, speed: 2.1, scale: 1.6, catch: 0.50, rarity: 'common', evolveTo: 'arbok', evolveLv: 22 },
  arbok:      { name: 'Arbok',      dex: 24,  types: ['poison'], biomes: ['desert','swamp'], hp: 60, atk: 85, speed: 2.4, scale: 2.3, catch: 0.26, rarity: 'uncommon', aggressive: true },
  pikachu:    { name: 'Pikachu',    dex: 25,  types: ['electric'], biomes: ['forest','plains'], hp: 35, atk: 55, speed: 2.9, scale: 1.5, catch: 0.30, rarity: 'uncommon', evolveTo: 'raichu', evolveLv: 22 },
  raichu:     { name: 'Raichu',     dex: 26,  types: ['electric'], biomes: ['plains'], hp: 60, atk: 90, speed: 3.2, scale: 1.9, catch: 0.16, rarity: 'rare' },
  sandshrew:  { name: 'Sandshrew',  dex: 27,  types: ['ground'], biomes: ['rocky','desert'], hp: 50, atk: 75, speed: 1.8, scale: 1.5, catch: 0.50, rarity: 'common', evolveTo: 'sandslash', evolveLv: 22 },
  sandslash:  { name: 'Sandslash',  dex: 28,  types: ['ground'], biomes: ['desert','rocky'], hp: 75, atk: 100, speed: 2.2, scale: 2.0, catch: 0.24, rarity: 'uncommon' },
  clefairy:   { name: 'Clefairy',   dex: 35,  types: ['fairy'], biomes: ['plains','night'], hp: 70, atk: 45, speed: 1.8, scale: 1.5, catch: 0.30, rarity: 'uncommon', evolveTo: 'clefable', evolveLv: 30 },
  clefable:   { name: 'Clefable',   dex: 36,  types: ['fairy'], biomes: ['plains','night'], hp: 95, atk: 70, speed: 2.0, scale: 2.0, catch: 0.14, rarity: 'rare' },
  vulpix:     { name: 'Vulpix',     dex: 37,  types: ['fire'], biomes: ['rocky','desert'], hp: 38, atk: 41, speed: 2.5, scale: 1.5, catch: 0.40, rarity: 'uncommon', evolveTo: 'ninetales', stoneEvo: true },
  ninetales:  { name: 'Ninetales',  dex: 38,  types: ['fire'], biomes: ['desert'], hp: 73, atk: 76, speed: 3.0, scale: 2.2, catch: 0.16, rarity: 'rare' },
  jigglypuff: { name: 'Jigglypuff', dex: 39,  types: ['normal','fairy'], biomes: ['plains'], hp: 115, atk: 45, speed: 1.6, scale: 1.4, catch: 0.40, rarity: 'uncommon', evolveTo: 'wigglytuff', stoneEvo: true },
  wigglytuff: { name: 'Wigglytuff', dex: 40,  types: ['normal','fairy'], biomes: ['plains'], hp: 140, atk: 70, speed: 1.8, scale: 1.9, catch: 0.18, rarity: 'rare' },
  zubat:      { name: 'Zubat',      dex: 41,  types: ['poison','flying'], biomes: ['night','rocky'], hp: 40, atk: 45, speed: 2.7, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'golbat', evolveLv: 22 },
  golbat:     { name: 'Golbat',     dex: 42,  types: ['poison','flying'], biomes: ['night'], hp: 75, atk: 80, speed: 3.0, scale: 2.1, catch: 0.26, rarity: 'uncommon', aggressive: true },
  oddish:     { name: 'Oddish',     dex: 43,  types: ['grass','poison'], biomes: ['forest','swamp'], hp: 45, atk: 50, speed: 1.5, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'gloom', evolveLv: 21 },
  gloom:      { name: 'Gloom',      dex: 44,  types: ['grass','poison'], biomes: ['swamp'], hp: 60, atk: 65, speed: 1.5, scale: 1.6, catch: 0.30, rarity: 'uncommon', evolveTo: 'vileplume', stoneEvo: true },
  vileplume:  { name: 'Vileplume',  dex: 45,  types: ['grass','poison'], biomes: ['swamp'], hp: 75, atk: 80, speed: 1.6, scale: 2.0, catch: 0.16, rarity: 'rare' },
  paras:      { name: 'Paras',      dex: 46,  types: ['bug','grass'], biomes: ['forest','swamp'], hp: 35, atk: 70, speed: 1.4, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'parasect', evolveLv: 24 },
  parasect:   { name: 'Parasect',   dex: 47,  types: ['bug','grass'], biomes: ['swamp'], hp: 60, atk: 95, speed: 1.5, scale: 1.9, catch: 0.24, rarity: 'uncommon' },
  venonat:    { name: 'Venonat',    dex: 48,  types: ['bug','poison'], biomes: ['forest','night'], hp: 60, atk: 55, speed: 1.9, scale: 1.5, catch: 0.50, rarity: 'common', evolveTo: 'venomoth', evolveLv: 31 },
  venomoth:   { name: 'Venomoth',   dex: 49,  types: ['bug','poison'], biomes: ['forest','night'], hp: 70, atk: 65, speed: 2.8, scale: 2.0, catch: 0.24, rarity: 'uncommon' },
  diglett:    { name: 'Diglett',    dex: 50,  types: ['ground'], biomes: ['desert','rocky'], hp: 10, atk: 55, speed: 2.9, scale: 1.2, catch: 0.55, rarity: 'common', evolveTo: 'dugtrio', evolveLv: 26 },
  dugtrio:    { name: 'Dugtrio',    dex: 51,  types: ['ground'], biomes: ['desert'], hp: 35, atk: 100, speed: 3.4, scale: 1.7, catch: 0.24, rarity: 'uncommon' },
  meowth:     { name: 'Meowth',     dex: 52,  types: ['normal'], biomes: ['night','plains'], hp: 40, atk: 45, speed: 2.6, scale: 1.4, catch: 0.45, rarity: 'uncommon', evolveTo: 'persian', evolveLv: 28 },
  persian:    { name: 'Persian',    dex: 53,  types: ['normal'], biomes: ['night','plains'], hp: 65, atk: 70, speed: 3.3, scale: 2.0, catch: 0.22, rarity: 'rare' },
  psyduck:    { name: 'Psyduck',    dex: 54,  types: ['water'], biomes: ['beach'], hp: 50, atk: 52, speed: 1.9, scale: 1.6, catch: 0.45, rarity: 'common', evolveTo: 'golduck', evolveLv: 33 },
  golduck:    { name: 'Golduck',    dex: 55,  types: ['water'], biomes: ['beach'], hp: 80, atk: 82, speed: 2.6, scale: 2.2, catch: 0.20, rarity: 'rare' },
  mankey:     { name: 'Mankey',     dex: 56,  types: ['fighting'], biomes: ['rocky'], hp: 40, atk: 80, speed: 2.6, scale: 1.5, catch: 0.45, rarity: 'common', evolveTo: 'primeape', evolveLv: 28, aggressive: true },
  primeape:   { name: 'Primeape',   dex: 57,  types: ['fighting'], biomes: ['rocky'], hp: 65, atk: 105, speed: 3.0, scale: 1.9, catch: 0.22, rarity: 'uncommon', aggressive: true },
  growlithe:  { name: 'Growlithe',  dex: 58,  types: ['fire'], biomes: ['rocky','plains'], hp: 55, atk: 70, speed: 2.7, scale: 1.6, catch: 0.35, rarity: 'uncommon', evolveTo: 'arcanine', stoneEvo: true },
  arcanine:   { name: 'Arcanine',   dex: 59,  types: ['fire'], biomes: ['plains','desert'], hp: 90, atk: 110, speed: 3.4, scale: 2.6, catch: 0.10, rarity: 'rare' },
  poliwag:    { name: 'Poliwag',    dex: 60,  types: ['water'], biomes: ['beach'], hp: 40, atk: 50, speed: 2.0, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'poliwhirl', evolveLv: 25 },
  poliwhirl:  { name: 'Poliwhirl',  dex: 61,  types: ['water'], biomes: ['beach','swamp'], hp: 65, atk: 65, speed: 2.2, scale: 1.7, catch: 0.28, rarity: 'uncommon', evolveTo: 'poliwrath', stoneEvo: true },
  poliwrath:  { name: 'Poliwrath',  dex: 62,  types: ['water','fighting'], biomes: ['swamp'], hp: 90, atk: 95, speed: 2.0, scale: 2.1, catch: 0.14, rarity: 'rare' },
  abra:       { name: 'Abra',       dex: 63,  types: ['psychic'], biomes: ['plains','rocky'], hp: 25, atk: 20, speed: 3.0, scale: 1.4, catch: 0.35, rarity: 'uncommon', evolveTo: 'kadabra', evolveLv: 16 },
  kadabra:    { name: 'Kadabra',    dex: 64,  types: ['psychic'], biomes: ['plains','night'], hp: 40, atk: 35, speed: 3.2, scale: 1.7, catch: 0.22, rarity: 'uncommon', evolveTo: 'alakazam', evolveLv: 36 },
  alakazam:   { name: 'Alakazam',   dex: 65,  types: ['psychic'], biomes: ['night'], hp: 55, atk: 50, speed: 3.6, scale: 2.0, catch: 0.12, rarity: 'rare' },
  machop:     { name: 'Machop',     dex: 66,  types: ['fighting'], biomes: ['rocky'], hp: 70, atk: 80, speed: 1.9, scale: 1.6, catch: 0.40, rarity: 'uncommon', evolveTo: 'machoke', evolveLv: 28 },
  machoke:    { name: 'Machoke',    dex: 67,  types: ['fighting'], biomes: ['rocky'], hp: 80, atk: 100, speed: 2.0, scale: 2.0, catch: 0.22, rarity: 'uncommon', evolveTo: 'machamp', evolveLv: 40 },
  machamp:    { name: 'Machamp',    dex: 68,  types: ['fighting'], biomes: ['rocky'], hp: 90, atk: 130, speed: 2.2, scale: 2.4, catch: 0.10, rarity: 'rare', aggressive: true },
  bellsprout: { name: 'Bellsprout', dex: 69,  types: ['grass','poison'], biomes: ['swamp','forest'], hp: 50, atk: 75, speed: 1.6, scale: 1.5, catch: 0.50, rarity: 'common', evolveTo: 'weepinbell', evolveLv: 21 },
  weepinbell: { name: 'Weepinbell', dex: 70,  types: ['grass','poison'], biomes: ['swamp'], hp: 65, atk: 90, speed: 1.7, scale: 1.8, catch: 0.28, rarity: 'uncommon', evolveTo: 'victreebel', stoneEvo: true },
  victreebel: { name: 'Victreebel', dex: 71,  types: ['grass','poison'], biomes: ['swamp'], hp: 80, atk: 105, speed: 1.8, scale: 2.1, catch: 0.14, rarity: 'rare', aggressive: true },
  tentacool:  { name: 'Tentacool',  dex: 72,  types: ['water','poison'], biomes: ['beach'], hp: 40, atk: 40, speed: 2.0, scale: 1.5, catch: 0.50, rarity: 'common', evolveTo: 'tentacruel', evolveLv: 30 },
  tentacruel: { name: 'Tentacruel', dex: 73,  types: ['water','poison'], biomes: ['beach'], hp: 80, atk: 70, speed: 2.6, scale: 2.3, catch: 0.20, rarity: 'rare', aggressive: true },
  geodude:    { name: 'Geodude',    dex: 74,  types: ['rock','ground'], biomes: ['rocky'], hp: 40, atk: 80, speed: 1.3, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'graveler', evolveLv: 25 },
  graveler:   { name: 'Graveler',   dex: 75,  types: ['rock','ground'], biomes: ['rocky'], hp: 55, atk: 95, speed: 1.4, scale: 1.8, catch: 0.28, rarity: 'uncommon', evolveTo: 'golem', evolveLv: 40 },
  golem:      { name: 'Golem',      dex: 76,  types: ['rock','ground'], biomes: ['rocky','desert'], hp: 80, atk: 120, speed: 1.5, scale: 2.3, catch: 0.12, rarity: 'rare' },
  ponyta:     { name: 'Ponyta',     dex: 77,  types: ['fire'], biomes: ['plains','desert'], hp: 50, atk: 85, speed: 3.3, scale: 1.8, catch: 0.30, rarity: 'uncommon', evolveTo: 'rapidash', evolveLv: 40 },
  rapidash:   { name: 'Rapidash',   dex: 78,  types: ['fire'], biomes: ['desert','plains'], hp: 65, atk: 100, speed: 3.8, scale: 2.4, catch: 0.18, rarity: 'rare' },
  slowpoke:   { name: 'Slowpoke',   dex: 79,  types: ['water','psychic'], biomes: ['beach','swamp'], hp: 90, atk: 65, speed: 1.2, scale: 1.7, catch: 0.45, rarity: 'common', evolveTo: 'slowbro', evolveLv: 37 },
  slowbro:    { name: 'Slowbro',    dex: 80,  types: ['water','psychic'], biomes: ['beach'], hp: 95, atk: 75, speed: 1.4, scale: 2.2, catch: 0.18, rarity: 'rare' },
  magnemite:  { name: 'Magnemite',  dex: 81,  types: ['electric','steel'], biomes: ['rocky'], hp: 25, atk: 35, speed: 2.2, scale: 1.4, catch: 0.45, rarity: 'common', evolveTo: 'magneton', evolveLv: 30 },
  magneton:   { name: 'Magneton',   dex: 82,  types: ['electric','steel'], biomes: ['rocky'], hp: 50, atk: 60, speed: 2.4, scale: 1.9, catch: 0.22, rarity: 'uncommon' },
  doduo:      { name: 'Doduo',      dex: 84,  types: ['normal','flying'], biomes: ['plains','desert'], hp: 35, atk: 85, speed: 3.2, scale: 1.6, catch: 0.50, rarity: 'common', evolveTo: 'dodrio', evolveLv: 31 },
  dodrio:     { name: 'Dodrio',     dex: 85,  types: ['normal','flying'], biomes: ['desert','plains'], hp: 60, atk: 110, speed: 3.6, scale: 2.1, catch: 0.22, rarity: 'uncommon' },
  seel:       { name: 'Seel',       dex: 86,  types: ['water'], biomes: ['snow','beach'], hp: 65, atk: 45, speed: 1.8, scale: 1.7, catch: 0.50, rarity: 'common', evolveTo: 'dewgong', evolveLv: 34 },
  dewgong:    { name: 'Dewgong',    dex: 87,  types: ['water','ice'], biomes: ['snow','beach'], hp: 90, atk: 70, speed: 2.2, scale: 2.3, catch: 0.20, rarity: 'rare' },
  grimer:     { name: 'Grimer',     dex: 88,  types: ['poison'], biomes: ['swamp','night'], hp: 80, atk: 80, speed: 1.3, scale: 1.6, catch: 0.45, rarity: 'common', evolveTo: 'muk', evolveLv: 38 },
  muk:        { name: 'Muk',        dex: 89,  types: ['poison'], biomes: ['swamp','night'], hp: 105, atk: 105, speed: 1.4, scale: 2.2, catch: 0.16, rarity: 'rare', aggressive: true },
  shellder:   { name: 'Shellder',   dex: 90,  types: ['water'], biomes: ['beach'], hp: 30, atk: 65, speed: 1.8, scale: 1.3, catch: 0.50, rarity: 'common', evolveTo: 'cloyster', stoneEvo: true },
  cloyster:   { name: 'Cloyster',   dex: 91,  types: ['water','ice'], biomes: ['beach'], hp: 50, atk: 95, speed: 2.0, scale: 1.9, catch: 0.18, rarity: 'rare' },
  gastly:     { name: 'Gastly',     dex: 92,  types: ['ghost','poison'], biomes: ['night'], hp: 30, atk: 35, speed: 2.8, scale: 1.6, catch: 0.40, rarity: 'uncommon', evolveTo: 'haunter', evolveLv: 25 },
  haunter:    { name: 'Haunter',    dex: 93,  types: ['ghost','poison'], biomes: ['night'], hp: 45, atk: 50, speed: 3.0, scale: 1.9, catch: 0.24, rarity: 'uncommon', evolveTo: 'gengar', evolveLv: 38 },
  gengar:     { name: 'Gengar',     dex: 94,  types: ['ghost','poison'], biomes: ['night'], hp: 60, atk: 65, speed: 3.4, scale: 2.2, catch: 0.12, rarity: 'rare', aggressive: true },
  onix:       { name: 'Onix',       dex: 95,  types: ['rock','ground'], biomes: ['rocky'], hp: 35, atk: 45, speed: 1.8, scale: 2.6, catch: 0.22, rarity: 'rare', evolveTo: 'steelix', stoneEvo: true },
  drowzee:    { name: 'Drowzee',    dex: 96,  types: ['psychic'], biomes: ['night','plains'], hp: 60, atk: 48, speed: 1.9, scale: 1.6, catch: 0.45, rarity: 'common', evolveTo: 'hypno', evolveLv: 26 },
  hypno:      { name: 'Hypno',      dex: 97,  types: ['psychic'], biomes: ['night'], hp: 85, atk: 73, speed: 2.2, scale: 2.1, catch: 0.20, rarity: 'rare' },
  krabby:     { name: 'Krabby',     dex: 98,  types: ['water'], biomes: ['beach'], hp: 30, atk: 105, speed: 1.7, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'kingler', evolveLv: 28 },
  kingler:    { name: 'Kingler',    dex: 99,  types: ['water'], biomes: ['beach'], hp: 55, atk: 130, speed: 2.0, scale: 1.9, catch: 0.22, rarity: 'uncommon' },
  voltorb:    { name: 'Voltorb',    dex: 100, types: ['electric'], biomes: ['rocky','plains'], hp: 40, atk: 30, speed: 2.6, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'electrode', evolveLv: 30 },
  electrode:  { name: 'Electrode',  dex: 101, types: ['electric'], biomes: ['rocky'], hp: 60, atk: 50, speed: 3.5, scale: 1.8, catch: 0.22, rarity: 'uncommon' },
  exeggcute:  { name: 'Exeggcute',  dex: 102, types: ['grass','psychic'], biomes: ['forest','swamp'], hp: 60, atk: 40, speed: 1.5, scale: 1.4, catch: 0.45, rarity: 'common', evolveTo: 'exeggutor', stoneEvo: true },
  exeggutor:  { name: 'Exeggutor',  dex: 103, types: ['grass','psychic'], biomes: ['swamp'], hp: 95, atk: 95, speed: 1.7, scale: 2.5, catch: 0.16, rarity: 'rare' },
  cubone:     { name: 'Cubone',     dex: 104, types: ['ground'], biomes: ['rocky','desert','night'], hp: 50, atk: 50, speed: 1.7, scale: 1.5, catch: 0.45, rarity: 'uncommon', evolveTo: 'marowak', evolveLv: 28 },
  marowak:    { name: 'Marowak',    dex: 105, types: ['ground'], biomes: ['desert','night'], hp: 60, atk: 80, speed: 2.0, scale: 1.9, catch: 0.22, rarity: 'rare' },
  hitmonlee:  { name: 'Hitmonlee',  dex: 106, types: ['fighting'], biomes: ['rocky'], hp: 50, atk: 120, speed: 2.7, scale: 1.9, catch: 0.20, rarity: 'rare', aggressive: true },
  hitmonchan: { name: 'Hitmonchan', dex: 107, types: ['fighting'], biomes: ['rocky'], hp: 50, atk: 105, speed: 2.6, scale: 1.9, catch: 0.20, rarity: 'rare', aggressive: true },
  koffing:    { name: 'Koffing',    dex: 109, types: ['poison'], biomes: ['swamp','night'], hp: 40, atk: 65, speed: 2.0, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'weezing', evolveLv: 35 },
  weezing:    { name: 'Weezing',    dex: 110, types: ['poison'], biomes: ['swamp','night'], hp: 65, atk: 90, speed: 2.0, scale: 1.9, catch: 0.20, rarity: 'uncommon' },
  rhyhorn:    { name: 'Rhyhorn',    dex: 111, types: ['ground','rock'], biomes: ['desert','rocky'], hp: 80, atk: 85, speed: 1.6, scale: 1.9, catch: 0.40, rarity: 'uncommon', evolveTo: 'rhydon', evolveLv: 42, aggressive: true },
  rhydon:     { name: 'Rhydon',     dex: 112, types: ['ground','rock'], biomes: ['desert'], hp: 105, atk: 130, speed: 1.8, scale: 2.5, catch: 0.12, rarity: 'rare', aggressive: true },
  tangela:    { name: 'Tangela',    dex: 114, types: ['grass'], biomes: ['swamp','forest'], hp: 65, atk: 55, speed: 1.7, scale: 1.7, catch: 0.40, rarity: 'uncommon' },
  kangaskhan: { name: 'Kangaskhan', dex: 115, types: ['normal'], biomes: ['plains','desert'], hp: 105, atk: 95, speed: 2.4, scale: 2.4, catch: 0.16, rarity: 'rare', aggressive: true },
  horsea:     { name: 'Horsea',     dex: 116, types: ['water'], biomes: ['beach'], hp: 30, atk: 40, speed: 2.0, scale: 1.3, catch: 0.50, rarity: 'common', evolveTo: 'seadra', evolveLv: 32 },
  seadra:     { name: 'Seadra',     dex: 117, types: ['water'], biomes: ['beach'], hp: 55, atk: 95, speed: 2.6, scale: 1.8, catch: 0.22, rarity: 'uncommon' },
  goldeen:    { name: 'Goldeen',    dex: 118, types: ['water'], biomes: ['beach'], hp: 45, atk: 67, speed: 2.3, scale: 1.4, catch: 0.55, rarity: 'common', evolveTo: 'seaking', evolveLv: 33 },
  seaking:    { name: 'Seaking',    dex: 119, types: ['water'], biomes: ['beach'], hp: 80, atk: 92, speed: 2.6, scale: 1.9, catch: 0.24, rarity: 'uncommon' },
  staryu:     { name: 'Staryu',     dex: 120, types: ['water'], biomes: ['beach'], hp: 30, atk: 45, speed: 2.4, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'starmie', stoneEvo: true },
  starmie:    { name: 'Starmie',    dex: 121, types: ['water','psychic'], biomes: ['beach'], hp: 60, atk: 75, speed: 3.3, scale: 1.9, catch: 0.18, rarity: 'rare' },
  scyther:    { name: 'Scyther',    dex: 123, types: ['bug','flying'], biomes: ['forest','plains'], hp: 70, atk: 110, speed: 3.2, scale: 2.1, catch: 0.18, rarity: 'rare', aggressive: true },
  jynx:       { name: 'Jynx',       dex: 124, types: ['ice','psychic'], biomes: ['snow'], hp: 65, atk: 75, speed: 2.6, scale: 1.9, catch: 0.22, rarity: 'rare' },
  electabuzz: { name: 'Electabuzz', dex: 125, types: ['electric'], biomes: ['rocky','night'], hp: 65, atk: 95, speed: 3.1, scale: 1.9, catch: 0.20, rarity: 'rare' },
  magmar:     { name: 'Magmar',     dex: 126, types: ['fire'], biomes: ['desert','rocky'], hp: 65, atk: 100, speed: 2.9, scale: 1.9, catch: 0.20, rarity: 'rare', aggressive: true },
  pinsir:     { name: 'Pinsir',     dex: 127, types: ['bug'], biomes: ['forest'], hp: 65, atk: 125, speed: 2.7, scale: 2.1, catch: 0.18, rarity: 'rare', aggressive: true },
  tauros:     { name: 'Tauros',     dex: 128, types: ['normal'], biomes: ['plains','desert'], hp: 75, atk: 100, speed: 3.1, scale: 2.1, catch: 0.20, rarity: 'rare', aggressive: true },
  magikarp:   { name: 'Magikarp',   dex: 129, types: ['water'], biomes: ['beach'], hp: 20, atk: 10, speed: 2.0, scale: 1.5, catch: 0.70, rarity: 'common', evolveTo: 'gyarados', evolveLv: 20 },
  gyarados:   { name: 'Gyarados',   dex: 130, types: ['water','flying'], biomes: ['beach'], hp: 95, atk: 125, speed: 2.6, scale: 2.8, catch: 0.08, rarity: 'rare', aggressive: true },
  lapras:     { name: 'Lapras',     dex: 131, types: ['water','ice'], biomes: ['beach'], hp: 130, atk: 85, speed: 1.6, scale: 2.7, catch: 0.06, rarity: 'rare' },
  ditto:      { name: 'Ditto',      dex: 132, types: ['normal'], biomes: ['plains','night'], hp: 48, atk: 48, speed: 2.2, scale: 1.4, catch: 0.30, rarity: 'rare' },
  eevee:      { name: 'Eevee',      dex: 133, types: ['normal'], biomes: ['forest','plains'], hp: 55, atk: 55, speed: 2.5, scale: 1.5, catch: 0.30, rarity: 'rare', evolveTo: 'vaporeon', stoneEvo: true },
  vaporeon:   { name: 'Vaporeon',   dex: 134, types: ['water'], biomes: ['beach'], hp: 130, atk: 65, speed: 2.4, scale: 2.0, catch: 0.14, rarity: 'rare' },
  jolteon:    { name: 'Jolteon',    dex: 135, types: ['electric'], biomes: ['plains'], hp: 65, atk: 65, speed: 3.6, scale: 2.0, catch: 0.14, rarity: 'rare' },
  flareon:    { name: 'Flareon',    dex: 136, types: ['fire'], biomes: ['desert'], hp: 65, atk: 130, speed: 2.9, scale: 2.0, catch: 0.14, rarity: 'rare' },
  omanyte:    { name: 'Omanyte',    dex: 138, types: ['rock','water'], biomes: ['beach'], hp: 35, atk: 40, speed: 1.6, scale: 1.4, catch: 0.40, rarity: 'uncommon', evolveTo: 'omastar', evolveLv: 40 },
  omastar:    { name: 'Omastar',    dex: 139, types: ['rock','water'], biomes: ['beach'], hp: 70, atk: 60, speed: 1.8, scale: 1.9, catch: 0.16, rarity: 'rare' },
  kabuto:     { name: 'Kabuto',     dex: 140, types: ['rock','water'], biomes: ['beach'], hp: 30, atk: 80, speed: 1.8, scale: 1.4, catch: 0.40, rarity: 'uncommon', evolveTo: 'kabutops', evolveLv: 40 },
  kabutops:   { name: 'Kabutops',   dex: 141, types: ['rock','water'], biomes: ['beach'], hp: 60, atk: 115, speed: 2.6, scale: 2.0, catch: 0.16, rarity: 'rare', aggressive: true },
  aerodactyl: { name: 'Aerodactyl', dex: 142, types: ['rock','flying'], biomes: ['rocky','desert'], hp: 80, atk: 105, speed: 3.7, scale: 2.5, catch: 0.10, rarity: 'rare', aggressive: true },
  snorlax:    { name: 'Snorlax',    dex: 143, types: ['normal'], biomes: ['forest'], hp: 160, atk: 110, speed: 1.2, scale: 2.8, catch: 0.08, rarity: 'rare' },
  articuno:   { name: 'Articuno',   dex: 144, types: ['ice','flying'], biomes: ['snow'], hp: 160, atk: 95, speed: 2.8, scale: 2.8, catch: 0.03, rarity: 'legend', legendary: true },
  zapdos:     { name: 'Zapdos',     dex: 145, types: ['electric','flying'], biomes: ['rocky'], hp: 160, atk: 125, speed: 3.2, scale: 2.8, catch: 0.03, rarity: 'legend', legendary: true },
  moltres:    { name: 'Moltres',    dex: 146, types: ['fire','flying'], biomes: ['desert'], hp: 160, atk: 125, speed: 3.0, scale: 2.8, catch: 0.03, rarity: 'legend', legendary: true },
  dratini:    { name: 'Dratini',    dex: 147, types: ['dragon'], biomes: ['beach'], hp: 41, atk: 64, speed: 2.4, scale: 1.5, catch: 0.20, rarity: 'rare', evolveTo: 'dragonair', evolveLv: 30 },
  dragonair:  { name: 'Dragonair',  dex: 148, types: ['dragon'], biomes: ['beach'], hp: 61, atk: 84, speed: 2.8, scale: 2.2, catch: 0.12, rarity: 'rare', evolveTo: 'dragonite', evolveLv: 55 },
  dragonite:  { name: 'Dragonite',  dex: 149, types: ['dragon','flying'], biomes: ['beach'], hp: 91, atk: 134, speed: 3.0, scale: 2.7, catch: 0.05, rarity: 'legend', aggressive: true },
  mewtwo:     { name: 'Mewtwo',     dex: 150, types: ['psychic'], biomes: ['night'], hp: 200, atk: 154, speed: 3.4, scale: 2.8, catch: 0.02, rarity: 'legend', legendary: true, aggressive: true },
  mew:        { name: 'Mew',        dex: 151, types: ['psychic'], biomes: ['forest','plains','night'], hp: 150, atk: 100, speed: 3.2, scale: 1.8, catch: 0.02, rarity: 'legend', legendary: true },
  // --- snow biome (gen 2/3 cold dwellers) ---
  sneasel:    { name: 'Sneasel',    dex: 215, types: ['dark','ice'], biomes: ['snow','night'], hp: 55, atk: 95, speed: 3.1, scale: 1.6, catch: 0.25, rarity: 'rare', aggressive: true },
  swinub:     { name: 'Swinub',     dex: 220, types: ['ice','ground'], biomes: ['snow'], hp: 50, atk: 50, speed: 1.7, scale: 1.4, catch: 0.50, rarity: 'common', evolveTo: 'piloswine', evolveLv: 33 },
  piloswine:  { name: 'Piloswine',  dex: 221, types: ['ice','ground'], biomes: ['snow'], hp: 100, atk: 100, speed: 1.6, scale: 2.1, catch: 0.20, rarity: 'rare' },
  snorunt:    { name: 'Snorunt',    dex: 361, types: ['ice'], biomes: ['snow'], hp: 50, atk: 50, speed: 1.9, scale: 1.4, catch: 0.45, rarity: 'uncommon', evolveTo: 'glalie', evolveLv: 42 },
  glalie:     { name: 'Glalie',     dex: 362, types: ['ice'], biomes: ['snow'], hp: 80, atk: 80, speed: 2.4, scale: 2.1, catch: 0.18, rarity: 'rare' },
  spheal:     { name: 'Spheal',     dex: 363, types: ['ice','water'], biomes: ['snow','beach'], hp: 70, atk: 40, speed: 1.4, scale: 1.5, catch: 0.50, rarity: 'common', evolveTo: 'sealeo', evolveLv: 32 },
  sealeo:     { name: 'Sealeo',     dex: 364, types: ['ice','water'], biomes: ['snow'], hp: 90, atk: 60, speed: 1.6, scale: 1.9, catch: 0.26, rarity: 'uncommon', evolveTo: 'walrein', evolveLv: 44 },
  walrein:    { name: 'Walrein',    dex: 365, types: ['ice','water'], biomes: ['snow'], hp: 110, atk: 80, speed: 1.6, scale: 2.5, catch: 0.14, rarity: 'rare' },
  steelix:    { name: 'Steelix',    dex: 208, types: ['steel','ground'], biomes: ['rocky'], hp: 75, atk: 85, speed: 1.6, scale: 2.7, catch: 0.10, rarity: 'rare' },
};

export const STARTERS = ['bulbasaur', 'charmander', 'squirtle', 'pikachu', 'eevee'];

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
  ball:       { name: 'Poké Ball',   kind: 'ball', mult: 1 },
  greatball:  { name: 'Great Ball',  kind: 'ball', mult: 1.8 },
  ultraball:  { name: 'Ultra Ball',  kind: 'ball', mult: 3 },
  masterball: { name: 'Master Ball', kind: 'ball', mult: 255 },
  // tools (unique — own one forever)
  axe:        { name: 'Axe',          kind: 'tool' },
  pickaxe:    { name: 'Pickaxe',      kind: 'tool' },
  fishingrod: { name: 'Fishing Rod',  kind: 'tool' },
  lantern:    { name: 'Lantern',      kind: 'tool' },
  // misc
  evostone:   { name: 'Evolve Stone', kind: 'evostone' },
};

// creatures that live ON the water (spawn & swim in the lake)
export const SEA = ['squirtle', 'wartortle', 'blastoise', 'psyduck', 'golduck', 'poliwag', 'poliwhirl',
  'tentacool', 'tentacruel', 'slowpoke', 'slowbro', 'shellder', 'cloyster', 'krabby', 'kingler',
  'horsea', 'seadra', 'goldeen', 'seaking', 'staryu', 'starmie', 'magikarp', 'gyarados',
  'dratini', 'dragonair', 'dragonite', 'lapras', 'spheal', 'sealeo', 'walrein', 'seel', 'dewgong',
  'omanyte', 'omastar', 'kabuto', 'kabutops', 'vaporeon'];

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
  { id: 'dex25',      name: 'Field Scholar',  desc: 'Register 25 species',           stat: 'species',  need: 25,  reward: { gold: 120, ultraball: 3 } },
  { id: 'dex50',      name: 'Naturalist',     desc: 'Register 50 species',           stat: 'species',  need: 50,  reward: { gold: 250, evostone: 3 } },
  { id: 'dexall',     name: 'Living Dex',     desc: 'Register every species',        stat: 'species',  need: 149, reward: { gold: 1000, masterball: 1 } },
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
// TERRATAMERS depth & retention systems
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
export const BOSS_POOL = ['gyarados', 'arcanine', 'nidoking', 'rhydon', 'golem', 'machamp',
  'gengar', 'dragonite', 'venusaur', 'charizard', 'blastoise', 'snorlax', 'tyranitar'];

export const BOSS = {
  name: 'Gloamfang',
  everyMin: 5.5,            // a boss prowls roughly this often (real minutes)
  firstDelayMin: 3,        // grace period before the first one
  hpMult: 9,               // vs a normal creature of its level
  lvlBonus: 24,            // added on top of the local danger level
};


