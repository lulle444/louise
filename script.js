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
  }, { threshold: 0, rootMargin: '0px 0px 150px 0px' });
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

/* hero index board: filter pills + sort pills */
(function(){
  var rowsWrap = document.getElementById('ibRows');
  if (!rowsWrap) return;
  var filterBtns = document.querySelectorAll('.ib-filters .ib-pill');
  var sortBtns = document.querySelectorAll('.ib-sort .ib-pill');
  var activeFilter = 'all';

  function applyFilter(){
    var rows = rowsWrap.querySelectorAll('.ib-row');
    rows.forEach(function(row){
      var show = activeFilter === 'all' || row.getAttribute('data-cat') === activeFilter;
      row.classList.toggle('ib-hide', !show);
    });
  }
  filterBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      filterBtns.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      applyFilter();
    });
  });

  function sortBy(mode){
    var rows = Array.prototype.slice.call(rowsWrap.querySelectorAll('.ib-row'));
    rows.sort(function(a, b){
      if (mode === 'az') {
        return a.getAttribute('data-ticker').localeCompare(b.getAttribute('data-ticker'));
      }
      return Math.abs(parseFloat(b.getAttribute('data-chg'))) - Math.abs(parseFloat(a.getAttribute('data-chg')));
    });
    rows.forEach(function(r){ rowsWrap.appendChild(r); });
  }
  sortBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      sortBtns.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      sortBy(btn.getAttribute('data-sort'));
    });
  });

  rowsWrap.querySelectorAll('.ib-comp span[data-target]').forEach(function(el){
    var t = el.getAttribute('data-target');
    requestAnimationFrame(function(){ el.style.width = t + '%'; });
  });
})();

/* vault "try a deposit": stock picker + amount + simulated live quote */
(function(){
  var grid = document.getElementById('tryStockGrid');
  if (!grid) return;
  var search = document.getElementById('tryStockSearch');
  var nameEl = document.getElementById('tryStockName');
  var amtPrefix = document.getElementById('tryAmtPrefix');
  var amtDisplay = document.getElementById('tryAmtDisplay');
  var pills = document.querySelectorAll('.try-amt-pills button');
  var unitBtns = document.querySelectorAll('.try-unit-toggle button');
  var quoteShares = document.getElementById('tryQuoteShares');
  var quoteUsd = document.getElementById('tryQuoteUsd');

  var stocks = Array.prototype.slice.call(grid.querySelectorAll('.try-stock'));
  var active = stocks[0];
  var unit = 'usd';
  var amount = 10;

  function price(){ return parseFloat(active.getAttribute('data-price')); }

  function render(){
    var p = price();
    var usdAmt, shareAmt;
    if (unit === 'usd') { usdAmt = amount; shareAmt = usdAmt / p; }
    else { shareAmt = amount; usdAmt = shareAmt * p; }
    amtPrefix.textContent = unit === 'usd' ? '$' : '';
    amtDisplay.textContent = (unit === 'usd' ? usdAmt : shareAmt).toLocaleString(undefined, { maximumFractionDigits: unit === 'usd' ? 2 : 4 });
    quoteShares.textContent = shareAmt.toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' ' + active.getAttribute('data-ticker');
    quoteUsd.textContent = '≈ $' + usdAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    nameEl.textContent = active.getAttribute('data-name');
  }

  stocks.forEach(function(btn){
    btn.addEventListener('click', function(){
      stocks.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      active = btn;
      render();
    });
  });

  if (search) {
    search.addEventListener('input', function(){
      var q = search.value.trim().toLowerCase();
      stocks.forEach(function(btn){
        var hay = (btn.getAttribute('data-ticker') + ' ' + btn.getAttribute('data-name')).toLowerCase();
        btn.classList.toggle('try-hide', q.length > 0 && hay.indexOf(q) === -1);
      });
    });
  }

  pills.forEach(function(btn){
    btn.addEventListener('click', function(){
      pills.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      amount = parseFloat(btn.getAttribute('data-amt'));
      if (unit === 'shares') { amount = amount / price(); }
      render();
    });
  });

  unitBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      var newUnit = btn.getAttribute('data-unit');
      if (newUnit === unit) return;
      unitBtns.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      var p = price();
      amount = newUnit === 'shares' ? amount / p : amount * p;
      unit = newUnit;
      pills.forEach(function(b){ b.classList.remove('active'); });
      render();
    });
  });

  render();
})();
