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
