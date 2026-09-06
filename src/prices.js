// Live ETH/BTC prices for the ticker. Tries Binance's public REST API first
// (no key required, broad CORS support); falls back to CoinGecko if that
// fails (e.g. Binance is geo-blocked for the visitor).
(function () {
  const ethEl = document.getElementById('eth-price');
  const btcEl = document.getElementById('btc-price');
  if (!ethEl && !btcEl) return;

  function formatUsd(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function fromBinance(symbol) {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=' + symbol);
    if (!res.ok) throw new Error('binance http ' + res.status);
    const data = await res.json();
    const price = parseFloat(data.price);
    if (isNaN(price)) throw new Error('binance bad payload');
    return price;
  }

  async function fromCoinGecko(id) {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + id + '&vs_currencies=usd');
    if (!res.ok) throw new Error('coingecko http ' + res.status);
    const data = await res.json();
    const price = data[id] && data[id].usd;
    if (typeof price !== 'number') throw new Error('coingecko bad payload');
    return price;
  }

  async function updatePrice(el, binanceSymbol, coingeckoId) {
    if (!el) return;
    try {
      el.textContent = formatUsd(await fromBinance(binanceSymbol));
      return;
    } catch (e) {
      // fall through to backup source
    }
    try {
      el.textContent = formatUsd(await fromCoinGecko(coingeckoId));
    } catch (e) {
      // both sources unavailable — keep the last known value on screen
    }
  }

  function fetchAll() {
    updatePrice(ethEl, 'ETHUSDT', 'ethereum');
    updatePrice(btcEl, 'BTCUSDT', 'bitcoin');
  }

  fetchAll();
  setInterval(fetchAll, 15000);
})();
