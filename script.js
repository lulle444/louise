// ---------- ambient network background ----------
// A visibly drifting, gently pulsing field of dots, linked by faint lines
// when close together — decoration behind the content, tinted from the
// same gold/teal/ink tokens the rest of the page uses, so it re-themes
// with dark mode for free.
(() => {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dpr = 1, nodes = [], raf = null, t = 0;
  const palette = { gold: '#9C7A17', teal: '#0E8F74', ink: '#1C1F26' };

  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    palette.gold = cs.getPropertyValue('--gold').trim() || palette.gold;
    palette.teal = cs.getPropertyValue('--teal').trim() || palette.teal;
    palette.ink = cs.getPropertyValue('--ink').trim() || palette.ink;
  }

  function makeNodes() {
    const count = Math.min(65, Math.max(26, Math.round((W * H) / 32000)));
    const colors = [palette.gold, palette.teal, palette.ink];
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: 1.6 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.02,
      c: colors[(Math.random() * colors.length) | 0],
    }));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeNodes();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const linkDist = 140;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkDist) {
          ctx.globalAlpha = (1 - dist / linkDist) * 0.22;
          ctx.strokeStyle = palette.ink;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const n of nodes) {
      const pulse = Math.sin(t * n.speed * 20 + n.phase);
      ctx.globalAlpha = 0.55 + pulse * 0.3;
      ctx.fillStyle = n.c;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + pulse * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function tick() {
    t += 1;
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < -10) n.x = W + 10; else if (n.x > W + 10) n.x = -10;
      if (n.y < -10) n.y = H + 10; else if (n.y > H + 10) n.y = -10;
    }
    draw();
    raf = requestAnimationFrame(tick);
  }

  function start() {
    readPalette();
    resize();
    draw();
    if (!reduceMotion) {
      cancelAnimationFrame(raf);
      tick();
    }
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); draw(); }, 200);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (!reduceMotion) tick();
  });

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      setTimeout(() => {
        readPalette();
        const colors = [palette.gold, palette.teal, palette.ink];
        nodes.forEach(n => { n.c = colors[(Math.random() * colors.length) | 0]; });
        draw();
      }, 0);
    });
  }

  start();
})();

// ---------- dark mode toggle ----------
(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  const sync = () => { toggle.textContent = root.getAttribute('data-theme') === 'dark' ? '☀' : '◐'; };
  sync();
  toggle.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    if (isDark) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('dynamo-theme', isDark ? 'light' : 'dark'); } catch (e) {}
    sync();
  });
})();

// ---------- nav: mobile toggle, active link, sticky shadow, back-to-top ----------
(() => {
  const header = document.querySelector('header.top');
  const navToggle = document.getElementById('navToggle');
  const navPanel = document.getElementById('navPanel');
  const navLinks = document.querySelectorAll('.nav-link');
  const backToTop = document.getElementById('backToTop');

  if (navToggle && navPanel) {
    navToggle.addEventListener('click', () => {
      const isOpen = navPanel.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    navPanel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      navPanel.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  if ('IntersectionObserver' in window && navLinks.length) {
    const sections = Array.from(navLinks)
      .map(l => document.querySelector(l.getAttribute('href')))
      .filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(s => observer.observe(s));
  }

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 4;
    if (header) header.classList.toggle('scrolled', scrolled);
    if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 700);
  }, { passive: true });

  if (backToTop) {
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
})();

// ---------- policy filter pills ----------
(() => {
  const group = document.getElementById('policyFilters');
  if (!group) return;
  const cards = document.querySelectorAll('.policy-card');
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    group.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === btn));
    const filter = btn.getAttribute('data-filter');
    cards.forEach(card => {
      const show = filter === 'all' || card.getAttribute('data-status') === filter;
      card.hidden = !show;
    });
  });
})();

// animate basket bars once, on load
window.addEventListener('load', () => {
  document.querySelectorAll('.bar-fill[data-target]').forEach(el => {
    const target = el.getAttribute('data-target');
    requestAnimationFrame(() => { el.style.width = target + '%'; });
  });
  document.getElementById('basketTotal').textContent = '$1,000';
});

function simulateDeposit(){
  const amt = parseFloat(document.getElementById('depositInput').value) || 0;
  document.getElementById('basketTotal').textContent = '$' + amt.toLocaleString('en-US');
  document.getElementById('sharesOut').textContent = amt.toFixed(2);
}

function updateCap(val){
  const cap = parseFloat(val);
  document.getElementById('capLabel').textContent = cap.toFixed(2) + ' ETH';
  document.getElementById('capLabel2').textContent = cap.toFixed(2) + ' ETH';
  const spent = Math.min(0.22, cap);
  document.getElementById('spentLabel').textContent = spent.toFixed(2) + ' ETH';
  const pct = Math.min(100, (spent / cap) * 100);
  document.getElementById('spentBar').style.width = pct + '%';
}

// ---------- keeper gas flywheel demo ----------
// Illustrative only: simulates management fee accruing on TVL, then
// "sweeping" it into ETH and topping up the keeper gas policy balance —
// mirrors what accrueAndFundKeeperGas() does on-chain.
const ETH_PRICE_USD = 3200;
let feeAccrued = 0;
let poolBalanceEth = 0.22;

function tickFee(){
  feeAccrued += 0.014;
  const el = document.getElementById('feeAccrued');
  if (el) el.textContent = '$' + feeAccrued.toFixed(2);
}
setInterval(tickFee, 250);

function sweepFee(){
  const ethOut = feeAccrued / ETH_PRICE_USD;
  poolBalanceEth += ethOut;
  feeAccrued = 0;

  document.getElementById('feeAccrued').textContent = '$0.00';
  document.getElementById('poolBalance').textContent = poolBalanceEth.toFixed(4) + ' ETH';

  const status = document.getElementById('loopStatus');
  if (status) {
    status.textContent = 'funded ✓';
    status.classList.add('flash');
    setTimeout(() => { status.textContent = 'idle'; status.classList.remove('flash'); }, 1200);
  }
}
