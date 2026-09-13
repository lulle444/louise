window.addEventListener('load', function(){
  document.querySelectorAll('.bar-fill[data-target]').forEach(function(el){
    var t = el.getAttribute('data-target');
    requestAnimationFrame(function(){ el.style.width = t + '%'; });
  });
});
var feeAccrued = 0.42, poolBalanceEth = 0.22;
setInterval(function(){
  feeAccrued += 0.01;
  var el = document.getElementById('feeAccrued');
  if (el) el.textContent = '$' + feeAccrued.toFixed(2);
}, 400);
function sweepFee(){
  poolBalanceEth += feeAccrued / 3200;
  feeAccrued = 0;
  document.getElementById('feeAccrued').textContent = '$0.00';
  document.getElementById('poolBalance').textContent = poolBalanceEth.toFixed(4) + ' ETH';
  var s = document.getElementById('loopStatus');
  s.textContent = 'funded ✓';
  s.style.color = 'var(--green)';
  setTimeout(function(){ s.textContent = 'idle'; s.style.color = 'var(--violet)'; }, 1200);
}

var spentEth = 0.22;
function updateCap(val){
  var cap = parseFloat(val);
  document.getElementById('capLabel').textContent = cap.toFixed(2) + ' ETH';
  document.getElementById('capLabel2').textContent = cap.toFixed(2) + ' ETH';
  var spent = Math.min(spentEth, cap);
  document.getElementById('spentLabel').textContent = spent.toFixed(2) + ' ETH';
  var pct = Math.min(100, (spent / cap) * 100);
  document.getElementById('spentBar').style.width = pct + '%';
}

(function(){
  var body = document.getElementById('boardBody');
  var btns = document.querySelectorAll('.board-toggle button');
  if (!body || !btns.length) return;
  function sortBy(mode){
    var rows = Array.prototype.slice.call(body.querySelectorAll('tr'));
    rows.sort(function(a, b){
      if (mode === 'az') {
        return a.getAttribute('data-ticker').localeCompare(b.getAttribute('data-ticker'));
      }
      return Math.abs(parseFloat(b.getAttribute('data-chg'))) - Math.abs(parseFloat(a.getAttribute('data-chg')));
    });
    rows.forEach(function(r){ body.appendChild(r); });
  }
  btns.forEach(function(btn){
    btn.addEventListener('click', function(){
      btns.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      sortBy(btn.getAttribute('data-sort'));
    });
  });
})();

/* scroll-reveal: fade+rise elements into view once */
(function(){
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(function(el){ el.classList.add('in-view'); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(function(el){ io.observe(el); });
})();

/* sparkline / chart line draw-in animation */
(function(){
  var lines = document.querySelectorAll('.ms-spark polyline, .board-spark polyline, .ms-chart polyline');
  if (!lines.length) return;
  function draw(poly){
    try{
      var len = poly.getTotalLength();
      poly.style.strokeDasharray = len;
      poly.style.strokeDashoffset = len;
      poly.getBoundingClientRect();
      poly.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)';
      requestAnimationFrame(function(){ poly.style.strokeDashoffset = '0'; });
    }catch(e){}
  }
  if (!('IntersectionObserver' in window)) { lines.forEach(draw); return; }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) { draw(entry.target); io.unobserve(entry.target); }
    });
  }, { threshold: 0.4 });
  lines.forEach(function(el){ io.observe(el); });
})();

/* count-up numbers */
(function(){
  var nums = document.querySelectorAll('[data-countup]');
  if (!nums.length) return;
  function animateCount(el){
    var target = parseFloat(el.getAttribute('data-countup'));
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var decimals = el.getAttribute('data-decimals') ? parseInt(el.getAttribute('data-decimals'), 10) : 0;
    var dur = 900, start = null;
    function step(ts){
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      el.textContent = prefix + val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (!('IntersectionObserver' in window)) { nums.forEach(animateCount); return; }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) { animateCount(entry.target); io.unobserve(entry.target); }
    });
  }, { threshold: 0.5 });
  nums.forEach(function(el){ io.observe(el); });
})();

/* ambient flywheel-loop motion behind the hero terminal (canvas, no video file needed) */
(function(){
  var canvas = document.getElementById('flywheelCanvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w, h, cx, cy, radius;

  function resize(){
    var rect = canvas.getBoundingClientRect();
    w = canvas.width = rect.width * dpr;
    h = canvas.height = rect.height * dpr;
    cx = w / 2; cy = h / 2;
    radius = Math.min(w, h) * 0.34;
  }
  resize();
  window.addEventListener('resize', resize);

  var particles = [];
  var COUNT = 5;
  for (var i = 0; i < COUNT; i++) {
    particles.push({ a: (Math.PI * 2 / COUNT) * i, speed: 0.006 + i * 0.0006 });
  }

  function frame(){
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(108,76,251,0.16)';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    particles.forEach(function(p){
      p.a += p.speed;
      var x = cx + Math.cos(p.a) * radius;
      var y = cy + Math.sin(p.a) * radius;
      var grd = ctx.createRadialGradient(x, y, 0, x, y, 14 * dpr);
      grd.addColorStop(0, 'rgba(108,76,251,0.9)');
      grd.addColorStop(1, 'rgba(108,76,251,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, 14 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6C4CFB';
      ctx.beginPath();
      ctx.arc(x, y, 3.2 * dpr, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!reduced) requestAnimationFrame(frame);
  }
  frame();
})();
