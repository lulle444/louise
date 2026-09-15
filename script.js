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
async function sweepFee(){
  var s = document.getElementById('loopStatus');
  if (window.PERPETUA_DEPLOYMENT && window.perpetuaLiveSweep) {
    if (s) { s.textContent = 'sweeping onchain…'; s.style.color = 'var(--violet)'; }
    try {
      var ok = await window.perpetuaLiveSweep();
      if (ok) { if (s) { s.textContent = 'funded ✓ onchain'; s.style.color = 'var(--green)'; } setTimeout(function(){ if (s) { s.textContent = 'idle'; s.style.color = 'var(--violet)'; } }, 1600); return; }
    } catch (e) { console.warn('Perpetua: live sweep failed, falling back to illustrative math', e); }
  }
  poolBalanceEth += feeAccrued / 3200;
  feeAccrued = 0;
  var fe = document.getElementById('feeAccrued'); if (fe) fe.textContent = '$0.00';
  var pb = document.getElementById('poolBalance'); if (pb) pb.textContent = poolBalanceEth.toFixed(4) + ' ETH';
  if (s) { s.textContent = 'funded ✓'; s.style.color = 'var(--green)'; setTimeout(function(){ s.textContent = 'idle'; s.style.color = 'var(--violet)'; }, 1200); }
}
var spentEth = 0.22;
function updateCap(val){
  var cap = parseFloat(val);
  var cl = document.getElementById('capLabel'); if (cl) cl.textContent = cap.toFixed(2) + ' ETH';
  var cl2 = document.getElementById('capLabel2'); if (cl2) cl2.textContent = cap.toFixed(2) + ' ETH';
  var spent = Math.min(spentEth, cap);
  var sl = document.getElementById('spentLabel'); if (sl) sl.textContent = spent.toFixed(2) + ' ETH';
  var pct = Math.min(100, (spent / cap) * 100);
  var sb = document.getElementById('spentBar'); if (sb) sb.style.width = pct + '%';
}
(function(){
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach(function(el){ el.classList.add('in-view'); }); return; }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){ if (entry.isIntersecting) { entry.target.classList.add('in-view'); io.unobserve(entry.target); } });
  }, { threshold: 0, rootMargin: '0px 0px 150px 0px' });
  els.forEach(function(el){ io.observe(el); });
})();
