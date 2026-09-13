(function () {
  var body = document.getElementById('termBody');
  var input = document.getElementById('termInput');
  var term = document.getElementById('terminal');
  if (!body || !input || !term) return;

  function goTo(path, label) {
    setTimeout(function () { window.location.href = path; }, 550);
    return 'Opening ' + label + ' …';
  }

  var commands = {
    help: function () {
      return [
        'Available commands:',
        '  vault       open the vault — basket allocation & deposits',
        '  score       open the market score panel',
        '  flywheel    open the keeper gas flywheel',
        '  gas         open the gas sponsor policy',
        '  activity    open recent activity & the markets board',
        '  waitlist    jump straight to the waitlist form',
        '  about       what is Perpetua',
        '  clear       clear the terminal'
      ].join('\n');
    },
    vault: function () {
      return goTo('/vault#vault-allocation', 'the vault');
    },
    score: function () {
      return goTo('/vault#vault-score', 'the market score panel');
    },
    flywheel: function () {
      return goTo('/flywheel#flywheel-loop', 'the flywheel');
    },
    gas: function () {
      return goTo('/gas-sponsor#gas-policies', 'the gas sponsor');
    },
    activity: function () {
      return goTo('/activity', 'recent activity');
    },
    about: function () {
      return 'Perpetua: a savings vault for tokenized stocks whose own management fee funds the gas its keepers need. Built for Robinhood Chain.';
    },
    waitlist: function () {
      return goTo('/vault#vault-deposit', 'the waitlist');
    },
    whoami: function () {
      return 'keeper #4821';
    },
    clear: function () {
      body.innerHTML = '';
      return null;
    }
  };

  function printLine(text, cls) {
    var el = document.createElement('div');
    el.className = 'term-line' + (cls ? ' ' + cls : '');
    el.textContent = text;
    body.appendChild(el);
  }

  function run(raw) {
    var cmd = raw.trim();
    if (!cmd) return;
    printLine('$ ' + cmd, 'prompt');
    var key = cmd.split(' ')[0].toLowerCase();
    var fn = commands[key];
    if (fn) {
      var out = fn(cmd);
      if (out) printLine(out, 'out');
    } else {
      printLine("command not found: " + key + " — type 'help' for a list of commands.", 'err');
    }
    body.scrollTop = body.scrollHeight;
  }

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      run(input.value);
      input.value = '';
    }
  });

  term.addEventListener('click', function () {
    input.focus();
  });

  setTimeout(function () {
    var line = document.createElement('div');
    line.className = 'term-line out';
    body.appendChild(line);
    var text = 'Try: help · vault · flywheel · activity · waitlist — commands actually take you there.';
    var i = 0;
    (function tick () {
      line.textContent = text.slice(0, i) + (i < text.length ? '▌' : '');
      i++;
      if (i <= text.length) setTimeout(tick, 22);
    })();
  }, 700);
})();
