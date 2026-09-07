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
