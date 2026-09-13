(function () {
  var items = [
    { label: 'ROBINHOOD CHAIN', value: '' },
    { label: 'VAULT TVL', value: '$18.4K', up: true },
    { label: 'MARKET SCORE', value: '87 / 100' },
    { label: 'KEEPER GAS', value: 'SELF-FUNDED', up: true },
    { label: 'FEES SWEPT', value: '2.14 USDG' },
    { label: 'GAS SPONSORED', value: '0.067 ETH' }
  ];

  function build() {
    return items.map(function (it) {
      var v = it.value ? ' <strong' + (it.up ? ' class="up"' : '') + '>' + it.value + '</strong>' : '';
      return '<span>' + it.label + v + '</span>';
    }).join('');
  }

  var track = document.getElementById('tickerTrack');
  if (track) {
    track.innerHTML = build() + build();
  }
})();
