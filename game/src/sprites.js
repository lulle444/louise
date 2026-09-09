// ============================================================
// Procedural creature sprites. Wandermere draws every familiar
// itself — nothing is fetched from any external art source. Each
// species gets a small pixel-art silhouette assembled from a
// handful of reusable body-plan templates (round, winged,
// serpentine, quadruped, spindly, tiny), coloured from its
// element(s) via TYPE_COLORS. Shape + palette are derived
// deterministically from the species key, so the same species
// always draws the same way, and results are cached (one canvas
// per species+shiny combo) so nothing is redrawn every frame —
// the same one-generate-then-reuse shape the old image loader had.
// ============================================================

import { TYPE_COLORS } from './data.js?v=51';

const UNIT = 24;   // pixel-art grid (creature drawn within a UNIT x UNIT box)
const SCALE = 3;   // on-canvas pixel size of one grid unit
const SIZE = UNIT * SCALE;

const FORMS = ['round', 'winged', 'serpentine', 'quadruped', 'spindly', 'small'];

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}

// pick a reusable body-plan template deterministically from the species key
function formFor(key, sp) {
  const h = hashStr(key);
  if (sp.legendary) return ['winged', 'serpentine', 'spindly'][h % 3];
  if ((sp.types || []).includes('water') && !(sp.types || []).includes('flying')) {
    return (h % 3 === 0) ? 'serpentine' : (h % 3 === 1) ? 'round' : 'quadruped';
  }
  return FORMS[h % FORMS.length];
}

function clamp255(n) { return Math.max(0, Math.min(255, n | 0)); }
function shadeHex(hex, f) {
  const r = clamp255(((hex >> 16) & 255) * f);
  const g = clamp255(((hex >> 8) & 255) * f);
  const b = clamp255((hex & 255) * f);
  return (r << 16) | (g << 8) | b;
}
// rotate the hue of a 0xRRGGBB colour — used for the shiny palette swap
function hueRotate(hex, deg) {
  let r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  h = (h + deg / 360) % 1; if (h < 0) h += 1;
  const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
  let rr, gg, bb;
  if (s === 0) { rr = gg = bb = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    rr = hue2rgb(p, q, h + 1/3); gg = hue2rgb(p, q, h); bb = hue2rgb(p, q, h - 1/3);
  }
  return (clamp255(rr * 255) << 16) | (clamp255(gg * 255) << 8) | clamp255(bb * 255);
}

function paletteFor(sp, shiny) {
  const t0 = sp.types[0], t1 = sp.types[1] || t0;
  let base = TYPE_COLORS[t0] != null ? TYPE_COLORS[t0] : 0x8a8a8a;
  let accent = TYPE_COLORS[t1] != null ? TYPE_COLORS[t1] : shadeHex(base, 1.25);
  if (shiny) { base = hueRotate(base, 150); accent = hueRotate(accent, 150); }
  const shade = shadeHex(base, 0.62);
  const eyeWhite = 0xf4f4ec;
  const pupil = sp.types.includes('ghost') || sp.types.includes('psychic') ? shadeHex(accent, 1.3) : 0x1c1a16;
  return { base, accent, shade, eyeWhite, pupil };
}

// draw one filled UNIT-grid rect at (x,y,w,h) in pixel-art units
function rectDrawer(ctx) {
  return (color, x, y, w, h) => {
    ctx.fillStyle = '#' + (color >>> 0).toString(16).padStart(6, '0');
    ctx.fillRect(Math.round(x * SCALE), Math.round(y * SCALE), Math.round(w * SCALE), Math.round(h * SCALE));
  };
}

function drawEyes(R, pal, cx, cy, spread) {
  R(pal.eyeWhite, cx - spread, cy, 2, 2);
  R(pal.eyeWhite, cx + spread - 2, cy, 2, 2);
  R(pal.pupil, cx - spread, cy, 1, 1);
  R(pal.pupil, cx + spread - 1, cy, 1, 1);
}

function drawForm(ctx, form, pal) {
  const R = rectDrawer(ctx);
  const cx = UNIT / 2;
  switch (form) {
    case 'round': {
      R(pal.shade, cx - 6, 9, 12, 3);
      R(pal.base, cx - 7, 8, 14, 10);
      R(pal.base, cx - 6, 6, 12, 3);
      R(pal.accent, cx - 7, 12, 14, 3);
      R(pal.accent, cx - 3, 4, 2, 3); R(pal.accent, cx + 1, 4, 2, 3);
      drawEyes(R, pal, cx, 9, 4);
      R(pal.shade, cx - 4, 17, 3, 3); R(pal.shade, cx + 1, 17, 3, 3);
      break;
    }
    case 'small': {
      R(pal.shade, cx - 5, 11, 10, 2);
      R(pal.base, cx - 6, 10, 12, 8);
      R(pal.accent, cx - 6, 16, 12, 2);
      drawEyes(R, pal, cx, 12, 3);
      R(pal.shade, cx - 3, 18, 2, 2); R(pal.shade, cx + 1, 18, 2, 2);
      R(pal.accent, cx - 6, 10, 2, 2); R(pal.accent, cx + 4, 10, 2, 2);
      break;
    }
    case 'quadruped': {
      R(pal.shade, cx - 8, 12, 16, 3);
      R(pal.base, cx - 8, 8, 16, 7);
      R(pal.accent, cx - 8, 9, 16, 2);
      R(pal.base, cx - 9, 5, 8, 6);
      drawEyes(R, pal, cx - 6, 8, 3);
      R(pal.accent, cx - 9, 5, 2, 3);
      R(pal.shade, cx - 7, 15, 3, 4); R(pal.shade, cx + 4, 15, 3, 4);
      R(pal.shade, cx - 2, 15, 3, 4); R(pal.shade, cx + 8, 12, 3, 3);
      break;
    }
    case 'winged': {
      R(pal.accent, cx - 11, 8, 6, 8);
      R(pal.accent, cx + 5, 8, 6, 8);
      R(pal.shade, cx - 5, 11, 10, 3);
      R(pal.base, cx - 6, 7, 12, 9);
      R(pal.base, cx - 4, 4, 8, 5);
      drawEyes(R, pal, cx, 6, 3);
      R(pal.accent, cx - 1, 3, 2, 3);
      R(pal.shade, cx - 3, 16, 2, 3); R(pal.shade, cx + 1, 16, 2, 3);
      break;
    }
    case 'serpentine': {
      R(pal.base, cx - 10, 13, 8, 4);
      R(pal.base, cx - 4, 10, 8, 5);
      R(pal.base, cx + 2, 7, 8, 5);
      R(pal.accent, cx - 10, 16, 8, 2);
      R(pal.accent, cx - 4, 13, 8, 2);
      R(pal.shade, cx + 2, 6, 8, 2);
      drawEyes(R, pal, cx + 6, 8, 3);
      R(pal.shade, cx - 11, 13, 2, 3);
      break;
    }
    case 'spindly': {
      R(pal.base, cx - 4, 5, 8, 8);
      R(pal.accent, cx - 4, 6, 8, 2);
      drawEyes(R, pal, cx, 8, 3);
      R(pal.shade, cx - 3, 13, 2, 6); R(pal.shade, cx + 1, 13, 2, 6);
      R(pal.accent, cx - 1, 3, 2, 3);
      R(pal.shade, cx - 4, 19, 3, 2); R(pal.shade, cx + 1, 19, 3, 2);
      break;
    }
  }
}

const _canvasCache = new Map();   // 'key|shiny' -> HTMLCanvasElement

export function creatureCanvas(key, sp, shiny) {
  const cacheKey = key + (shiny ? '|s' : '|n');
  const hit = _canvasCache.get(cacheKey);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = SIZE; cv.height = SIZE;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const pal = paletteFor(sp, shiny);
  const form = formFor(key, sp);
  drawForm(ctx, form, pal);
  _canvasCache.set(cacheKey, cv);
  return cv;
}

// data: URL for plain <img> tags in the DOM UI (party dock, bestiary, starter select)
export function creatureImageURL(key, sp, shiny) {
  return creatureCanvas(key, sp, !!shiny).toDataURL('image/png');
}

// register (once) a Phaser texture for the world scene and return its key.
// World sprites never use the shiny palette — shininess there is a tint
// overlay applied at render time (matches the original's behaviour).
export function ensureCreatureTexture(scene, key, sp) {
  const texKey = 'mon_' + key;
  if (!scene.textures.exists(texKey)) {
    scene.textures.addCanvas(texKey, creatureCanvas(key, sp, false));
  }
  return texKey;
}
