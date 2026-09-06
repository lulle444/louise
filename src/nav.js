// Mobile nav toggle.
(function () {
  var nav = document.querySelector('.nav');
  var btn = document.querySelector('.menu-toggle');
  if (!nav || !btn) return;

  function close() {
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  nav.querySelectorAll('.nav-links a').forEach(function (a) {
    a.addEventListener('click', close);
  });
})();
