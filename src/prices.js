// Live ETH/BTC prices for the ticker, from CoinGecko's public API (no key required).
(function () {
  const ethEl = document.getElementById('eth-price');
  const btcEl = document.getElementById('btc-price');
  if (!ethEl && !btcEl) return;

  function formatUsd(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function fetchPrices() {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd');
      if (!res.ok) return;
      const data = await res.json();
      if (ethEl && data.ethereum) ethEl.textContent = formatUsd(data.ethereum.usd);
      if (btcEl && data.bitcoin) btcEl.textContent = formatUsd(data.bitcoin.usd);
    } catch (e) {
      // Network unavailable — keep the last known value on screen.
    }
  }

  fetchPrices();
  setInterval(fetchPrices, 30000);
})();
