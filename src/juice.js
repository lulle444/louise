// ============================================================
// JUICE — lightweight reward feedback helpers: floating world
// numbers, a screen flash, particle bursts and a big DOM banner
// for the rare "spectacle" moments (shiny / perfect / boss / egg).
// All functions are defensive — they no-op rather than throw if a
// texture or DOM node isn't there.
// ============================================================

// floating world-space number/label that drifts up and fades
export function floatNumber(scene, x, y, text, color = '#ffffff', size = 13) {
  if (!scene || !scene.add) return;
  const t = scene.add.text(x, y, text, {
    fontFamily: 'monospace', fontSize: size + 'px', color, fontStyle: 'bold',
    stroke: '#000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(60000);
  scene.tweens.add({
    targets: t, y: y - 30 - Math.random() * 10, alpha: 0,
    duration: 1000, ease: 'Quad.easeOut', onComplete: () => t.destroy(),
  });
}

// quick full-screen colour flash (camera-fixed)
export function screenFlash(scene, color = 0xffffff, alpha = 0.5, dur = 320) {
  if (!scene || !scene.add) return;
  const w = scene.scale.width, h = scene.scale.height;
  const r = scene.add.rectangle(w / 2, h / 2, w * 1.2, h * 1.2, color, alpha)
    .setScrollFactor(0).setDepth(20000);
  scene.tweens.add({ targets: r, alpha: 0, duration: dur, onComplete: () => r.destroy() });
}

// particle burst of tinted flakes at a world point
export function burst(scene, x, y, color = 0xffffff, n = 18, spd = 170) {
  if (!scene || !scene.textures || !scene.textures.exists('flake')) return;
  const p = scene.add.particles(x, y, 'flake', {
    speed: { min: 40, max: spd }, lifespan: 620, scale: { start: 1.7, end: 0 },
    quantity: n, tint: color, emitting: false,
  }).setDepth(y + 80);
  p.explode(n);
  scene.time.delayedCall(700, () => p.destroy());
}

// big centred banner (DOM) for headline moments
let _bannerTimer = null;
export function bigBanner(title, sub = '', color = '#b8f25f') {
  const el = document.getElementById('big-banner');
  if (!el) return;
  el.innerHTML = `<div class="bb-title" style="color:${color}">${title}</div>` +
    (sub ? `<div class="bb-sub">${sub}</div>` : '');
  el.classList.remove('hidden');
  // restart the pop animation
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  if (_bannerTimer) clearTimeout(_bannerTimer);
  _bannerTimer = setTimeout(() => { el.classList.remove('show'); el.classList.add('hidden'); }, 2600);
}
