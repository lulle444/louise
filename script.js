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
